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

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

function computeAmountInCents(pricePerHour: number, startTimeIso: string, endTimeIso: string) {
  const start = new Date(startTimeIso);
  const end = new Date(endTimeIso);
  const durationHours = (end.getTime() - start.getTime()) / 3_600_000;

  if (!Number.isFinite(durationHours) || durationHours <= 0) {
    throw new Error("INVALID_TIME_RANGE");
  }

  const total = Number((pricePerHour * durationHours).toFixed(2));
  return Math.round(total * 100);
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
    console.log("[DEBUG Edge Function] No token extracted from Authorization header");
    throw new Error("AUTH_REQUIRED");
  }

  console.log("[DEBUG Edge Function] Token extracted, length:", token.length);
  
  const payload = decodeJwtPayload(token);
  console.log("[DEBUG Edge Function] Decoded payload:", payload);
  
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
    return errorResponse("METHOD_NOT_ALLOWED", 405);
  }

  try {
    // DEBUG: Log headers reçus (insensible à la casse)
    const headersObj = Object.fromEntries(req.headers.entries());
    console.log("[DEBUG Edge Function] Headers:", headersObj);
    
    // Récupérer le header Authorization (insensible à la casse)
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    console.log("[DEBUG Edge Function] Authorization header:", authHeader ? authHeader.substring(0, 30) + "..." : "NULL - AUTH_REQUIRED");
    
    const actorUserId = getActorUserId(authHeader);
    const { hostId, startTime, endTime } = await req.json();

    if (!hostId || !startTime || !endTime) {
      throw new Error("INVALID_PAYLOAD");
    }

    const { data: host, error: hostError } = await admin
      .from("hosts")
      .select("id, owner_id, price_per_hour, is_active")
      .eq("id", hostId)
      .single();

    if (hostError || !host || !host.is_active) {
      throw new Error("HOST_NOT_AVAILABLE");
    }

    if (host.owner_id === actorUserId) {
      throw new Error("SELF_BOOKING_FORBIDDEN");
    }

    const amount = computeAmountInCents(Number(host.price_per_hour), startTime, endTime);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "eur",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        user_id: actorUserId,
        host_id: hostId,
        start_time: startTime,
        end_time: endTime,
      },
    });

    return new Response(JSON.stringify({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    const status = errorMessage === "AUTH_REQUIRED" ? 401 : errorMessage === "SELF_BOOKING_FORBIDDEN" ? 403 : 400;
    return errorResponse(errorMessage, status);
  }
});
