import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@^14.18.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

function computeTotal(pricePerHour: number, startTimeIso: string, endTimeIso: string) {
  const start = new Date(startTimeIso);
  const end = new Date(endTimeIso);
  const durationHours = (end.getTime() - start.getTime()) / 3_600_000;

  if (!Number.isFinite(durationHours) || durationHours <= 0) {
    throw new Error("INVALID_TIME_RANGE");
  }

  return Number((pricePerHour * durationHours).toFixed(2));
}

function extractBearerToken(authHeader: string | null) {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function decodeJwtPayload(token: string) {
  const [, payload] = token.split(".");
  if (!payload) {
    throw new Error("AUTH_REQUIRED");
  }

  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const decoded = atob(padded);
  return JSON.parse(decoded) as { sub?: string };
}

function getActorUserId(authHeader: string | null) {
  const token = extractBearerToken(authHeader);

  if (!token) {
    throw new Error("AUTH_REQUIRED");
  }

  const payload = decodeJwtPayload(token);
  if (!payload.sub) {
    throw new Error("AUTH_REQUIRED");
  }

  return payload.sub;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    const actorUserId = getActorUserId(req.headers.get("Authorization"));
    const { paymentIntentId } = await req.json();

    if (!paymentIntentId || typeof paymentIntentId !== "string") {
      throw new Error("INVALID_PAYLOAD");
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== "succeeded") {
      throw new Error("PAYMENT_NOT_SUCCEEDED");
    }

    const userId = paymentIntent.metadata.user_id;
    const hostId = paymentIntent.metadata.host_id;
    const startTime = paymentIntent.metadata.start_time;
    const endTime = paymentIntent.metadata.end_time;

    if (!userId || !hostId || !startTime || !endTime) {
      throw new Error("PAYMENT_METADATA_MISSING");
    }

    if (userId !== actorUserId) {
      throw new Error("FORBIDDEN");
    }

    const { data: host, error: hostError } = await admin
      .from("hosts")
      .select("id, price_per_hour")
      .eq("id", hostId)
      .single();

    if (hostError || !host) {
      throw new Error("HOST_NOT_AVAILABLE");
    }

    const expectedTotal = computeTotal(Number(host.price_per_hour), startTime, endTime);
    const expectedAmount = Math.round(expectedTotal * 100);

    if (paymentIntent.amount !== expectedAmount || paymentIntent.amount_received !== expectedAmount) {
      throw new Error("PAYMENT_AMOUNT_MISMATCH");
    }

    const { data: rpcData, error: rpcError } = await admin.rpc("book_parking_spot_paid", {
      p_user_id: actorUserId,
      p_host_id: hostId,
      p_start_time: startTime,
      p_end_time: endTime,
      p_total_price: expectedTotal,
      p_payment_reference: paymentIntentId,
    });

    if (rpcError) {
      throw rpcError;
    }

    const result = rpcData as {
      success?: boolean;
      error?: string;
      booking_id?: string;
      pickup_code?: string | null;
    } | null;

    if (!result?.success || !result.booking_id) {
      throw new Error(result?.error ?? "BOOKING_CONFIRMATION_FAILED");
    }

    return jsonResponse({
      ok: true,
      bookingId: result.booking_id,
      pickupCode: result.pickup_code ?? null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    const status = message === "AUTH_REQUIRED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return jsonResponse({ ok: false, error: message }, status);
  }
});
