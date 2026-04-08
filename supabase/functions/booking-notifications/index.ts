import { createClient } from 'npm:@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer@6'

type BookingNotificationEvent =
  | 'booking_created'
  | 'booking_activated'
  | 'booking_completed'
  | 'booking_cancelled'

type BookingRow = {
  id: string
  host_id: string
  user_id: string
  start_time: string
  end_time: string
  total_price: number
  status: 'pending' | 'active' | 'completed' | 'cancelled' | null
  pickup_code: string
}

type HostRow = {
  id: string
  name: string
  owner_id: string | null
  price_per_hour: number
}

type ProfileRow = {
  id: string
  email: string
  nom: string
  company_name: string | null
  role: string | null
}

type InvoiceRow = {
  id: string
  booking_id: string
  invoice_number: string
  total_amount: number
  currency: string
  issued_at: string
}

const appUrl = Deno.env.get('SCOOTSAFE_APP_URL') ?? 'https://saxopa.github.io/pwascooter/'
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function formatSchedule(start: string, end: string) {
  const startDate = new Date(start)
  const endDate = new Date(end)

  return `${startDate.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })} · ${startDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })} -> ${endDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

function getBookingLinks() {
  return {
    user: `${appUrl.replace(/\/$/, '')}/#/bookings`,
    host: `${appUrl.replace(/\/$/, '')}/#/host/dashboard`,
  }
}

function buildSubject(eventType: BookingNotificationEvent, recipientRole: 'user' | 'host', hostName: string) {
  if (eventType === 'booking_created') {
    return recipientRole === 'user'
      ? `ScootSafe - Reservation confirmee chez ${hostName}`
      : `ScootSafe - Nouvelle reservation pour ${hostName}`
  }

  if (eventType === 'booking_activated') {
    return recipientRole === 'user'
      ? `ScootSafe - Depot valide chez ${hostName}`
      : `ScootSafe - Depot confirme pour ${hostName}`
  }

  if (eventType === 'booking_completed') {
    return recipientRole === 'user'
      ? `ScootSafe - Reservation terminee chez ${hostName}`
      : `ScootSafe - Retrait cloture pour ${hostName}`
  }

  return recipientRole === 'user'
    ? `ScootSafe - Reservation annulee chez ${hostName}`
    : `ScootSafe - Reservation annulee pour ${hostName}`
}

function buildHtmlEmail(args: {
  eventType: BookingNotificationEvent
  recipientRole: 'user' | 'host'
  host: HostRow
  booking: BookingRow
  invoice: InvoiceRow
  customer: ProfileRow
  hostOwner: ProfileRow
}) {
  const { eventType, recipientRole, host, booking, invoice, customer, hostOwner } = args
  const schedule = formatSchedule(booking.start_time, booking.end_time)
  const total = formatMoney(Number(booking.total_price))
  const links = getBookingLinks()
  const title = buildSubject(eventType, recipientRole, host.name)
  const ctaHref = recipientRole === 'user' ? links.user : links.host
  const ctaLabel = recipientRole === 'user' ? 'Voir mes reservations' : 'Ouvrir l espace pro'
  const intro =
    eventType === 'booking_created'
      ? recipientRole === 'user'
        ? `Votre reservation est confirmee chez ${host.name}.`
        : `Une nouvelle reservation vient d etre creee pour ${host.name}.`
      : eventType === 'booking_activated'
        ? recipientRole === 'user'
          ? `Le commercant a valide votre depot chez ${host.name}.`
          : `Le depot du client a ete valide pour ${host.name}.`
        : eventType === 'booking_completed'
          ? recipientRole === 'user'
            ? `Votre reservation est marquee comme terminee chez ${host.name}.`
            : `La reservation a ete cloturee pour ${host.name}.`
          : recipientRole === 'user'
            ? `Votre reservation a ete annulee.`
            : `La reservation a ete annulee.`

  const secondaryBlock =
    recipientRole === 'user'
      ? `<p style="margin:0 0 12px;color:#64748b;line-height:1.65;">Code de validation: <strong style="color:#0f172a;letter-spacing:0.18em;">${booking.pickup_code}</strong></p>`
      : `<p style="margin:0 0 12px;color:#64748b;line-height:1.65;">Client: <strong style="color:#0f172a;">${customer.nom}</strong> (${customer.email})</p><p style="margin:0 0 12px;color:#64748b;line-height:1.65;">Code de validation: <strong style="color:#0f172a;letter-spacing:0.18em;">${booking.pickup_code}</strong></p>`

  return `
    <!doctype html>
    <html lang="fr">
      <body style="margin:0;background:#f4f7fb;font-family:Inter,Arial,sans-serif;color:#0f172a;">
        <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
          <div style="border-radius:28px;overflow:hidden;background:linear-gradient(135deg,#111827,#0f172a 60%,#10263d);box-shadow:0 20px 60px rgba(15,23,42,0.2);">
            <div style="padding:28px 28px 22px;border-bottom:1px solid rgba(255,255,255,0.08);">
              <div style="font-size:28px;font-weight:800;letter-spacing:-0.04em;color:#f8fafc;">ScootSafe</div>
              <div style="margin-top:8px;font-size:14px;color:#94a3b8;">${title}</div>
            </div>
            <div style="padding:28px;background:#ffffff;">
              <h1 style="margin:0 0 12px;font-size:28px;line-height:1.05;letter-spacing:-0.04em;">${intro}</h1>
              <p style="margin:0 0 20px;color:#475569;line-height:1.7;">Reference facture <strong>${invoice.invoice_number}</strong> · Montant ${total} · Commerce <strong>${host.name}</strong>.</p>

              <div style="padding:18px 18px 16px;border-radius:20px;background:#f8fafc;border:1px solid #e2e8f0;margin-bottom:18px;">
                <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.16em;color:#64748b;margin-bottom:10px;">Reservation</div>
                <p style="margin:0 0 12px;color:#0f172a;line-height:1.6;"><strong>Creneau</strong><br/>${schedule}</p>
                <p style="margin:0 0 12px;color:#0f172a;line-height:1.6;"><strong>Montant facture</strong><br/>${total}</p>
                ${secondaryBlock}
                <p style="margin:0;color:#64748b;line-height:1.65;">Exploitant: <strong style="color:#0f172a;">${hostOwner.company_name ?? hostOwner.nom}</strong></p>
              </div>

              <a href="${ctaHref}" style="display:inline-block;padding:14px 18px;border-radius:999px;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:700;">${ctaLabel}</a>

              <p style="margin:24px 0 10px;color:#64748b;line-height:1.65;">
                ScootSafe agit comme plateforme de mise en relation et de suivi numerique. La prise en charge physique, la garde et la restitution sont executees par le commercant reference.
              </p>
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
                Email automatique genere le ${new Date().toLocaleString('fr-FR')} pour la reservation ${booking.id}.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}

async function getActorUser(authHeader: string | null) {
  if (!authHeader) {
    throw new Error('AUTH_REQUIRED')
  }

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  const { data, error } = await client.auth.getUser()
  if (error || !data.user) {
    throw new Error('AUTH_REQUIRED')
  }

  return data.user
}

async function ensureInvoice(booking: BookingRow) {
  const { data: existing } = await admin
    .from('booking_invoices')
    .select('*')
    .eq('booking_id', booking.id)
    .maybeSingle()

  if (existing) {
    return existing as InvoiceRow
  }

  const invoiceNumber = `SSF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${booking.id.slice(0, 8).toUpperCase()}`
  const { data, error } = await admin
    .from('booking_invoices')
    .insert({
      booking_id: booking.id,
      invoice_number: invoiceNumber,
      total_amount: booking.total_price,
      metadata: {
        booking_status: booking.status,
      },
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data as InvoiceRow
}

async function upsertLog(args: {
  bookingId: string
  invoiceId: string
  eventType: BookingNotificationEvent
  recipientRole: 'user' | 'host'
  recipientEmail: string
  subject: string
  status: 'sent' | 'failed'
  payload: Record<string, unknown>
  providerMessageId?: string
  errorMessage?: string
}) {
  const { error } = await admin
    .from('booking_email_logs')
    .upsert({
      booking_id: args.bookingId,
      invoice_id: args.invoiceId,
      event_type: args.eventType,
      recipient_role: args.recipientRole,
      recipient_email: args.recipientEmail,
      subject: args.subject,
      status: args.status,
      provider_message_id: args.providerMessageId ?? null,
      error_message: args.errorMessage ?? null,
      provider: 'ionos_smtp',
      payload: args.payload,
      sent_at: args.status === 'sent' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'booking_id,event_type,recipient_role' })

  if (error) {
    console.error('Failed to persist booking_email_logs row', error)
  }
}

async function sendSmtpEmail(to: string, subject: string, html: string) {
  const host = Deno.env.get('SMTP_HOST')
  const port = parseInt(Deno.env.get('SMTP_PORT') ?? '465')
  const user = Deno.env.get('SMTP_USER')
  const pass = Deno.env.get('SMTP_PASSWORD')
  const from = Deno.env.get('SCOOTSAFE_FROM_EMAIL') ?? 'ScootSafe <contact@ponticom.fr>'

  if (!host || !user || !pass) {
    throw new Error('SMTP_CONFIG_MISSING')
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: true, // true pour le port 465 (SSL)
    auth: { user, pass },
    tls: {
      rejectUnauthorized: true,
    },
  })

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
  })

  return info.messageId as string | undefined
}

function assertEventAccess(eventType: BookingNotificationEvent, actorId: string, booking: BookingRow, host: HostRow) {
  if (eventType === 'booking_created' && actorId !== booking.user_id) {
    throw new Error('FORBIDDEN')
  }

  if ((eventType === 'booking_activated' || eventType === 'booking_completed') && actorId !== host.owner_id) {
    throw new Error('FORBIDDEN')
  }

  if (eventType === 'booking_cancelled' && actorId !== booking.user_id && actorId !== host.owner_id) {
    throw new Error('FORBIDDEN')
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const actor = await getActorUser(req.headers.get('Authorization'))
    const { bookingId, eventType } = await req.json() as { bookingId?: string; eventType?: BookingNotificationEvent }

    if (!bookingId || !eventType) {
      throw new Error('INVALID_PAYLOAD')
    }

    const { data: booking, error: bookingError } = await admin
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      throw new Error('BOOKING_NOT_FOUND')
    }

    const { data: host, error: hostError } = await admin
      .from('hosts')
      .select('id, name, owner_id, price_per_hour')
      .eq('id', booking.host_id)
      .single()

    if (hostError || !host) {
      throw new Error('HOST_NOT_FOUND')
    }

    assertEventAccess(eventType, actor.id, booking as BookingRow, host as HostRow)

    const [{ data: customer }, { data: hostOwner }] = await Promise.all([
      admin.from('profiles').select('id, email, nom, company_name, role').eq('id', booking.user_id).single(),
      admin.from('profiles').select('id, email, nom, company_name, role').eq('id', host.owner_id).single(),
    ])

    if (!customer || !hostOwner) {
      throw new Error('PROFILE_NOT_FOUND')
    }

    const invoice = await ensureInvoice(booking as BookingRow)

    const recipients = [
      { role: 'user' as const, email: customer.email },
      { role: 'host' as const, email: hostOwner.email },
    ]

    const results = []
    for (const recipient of recipients) {
      const subject = buildSubject(eventType, recipient.role, host.name)
      const html = buildHtmlEmail({
        eventType,
        recipientRole: recipient.role,
        host: host as HostRow,
        booking: booking as BookingRow,
        invoice,
        customer: customer as ProfileRow,
        hostOwner: hostOwner as ProfileRow,
      })

      try {
        const providerMessageId = await sendSmtpEmail(recipient.email, subject, html)
        await upsertLog({
          bookingId,
          invoiceId: invoice.id,
          eventType,
          recipientRole: recipient.role,
          recipientEmail: recipient.email,
          subject,
          status: 'sent',
          payload: {
            booking_status: booking.status,
            invoice_number: invoice.invoice_number,
            actor_user_id: actor.id,
          },
          providerMessageId,
        })
        results.push({ role: recipient.role, status: 'sent' })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'EMAIL_SEND_FAILED'
        await upsertLog({
          bookingId,
          invoiceId: invoice.id,
          eventType,
          recipientRole: recipient.role,
          recipientEmail: recipient.email,
          subject,
          status: 'failed',
          payload: {
            booking_status: booking.status,
            invoice_number: invoice.invoice_number,
            actor_user_id: actor.id,
          },
          errorMessage: message,
        })
        results.push({ role: recipient.role, status: 'failed', error: message })
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      invoiceNumber: invoice.invoice_number,
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: message === 'AUTH_REQUIRED' ? 401 : message === 'FORBIDDEN' ? 403 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
