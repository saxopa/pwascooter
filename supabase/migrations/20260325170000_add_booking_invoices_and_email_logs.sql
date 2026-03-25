begin;

create table if not exists public.booking_invoices (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  invoice_number text not null unique,
  total_amount numeric not null check (total_amount > 0),
  currency text not null default 'EUR',
  issued_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.booking_email_logs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  invoice_id uuid references public.booking_invoices(id) on delete set null,
  event_type text not null check (event_type in ('booking_created', 'booking_activated', 'booking_completed', 'booking_cancelled')),
  recipient_role text not null check (recipient_role in ('user', 'host')),
  recipient_email text not null,
  subject text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  provider text not null default 'resend',
  provider_message_id text,
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, event_type, recipient_role)
);

create index if not exists booking_email_logs_booking_id_idx
  on public.booking_email_logs (booking_id, created_at desc);

alter table public.booking_invoices enable row level security;
alter table public.booking_email_logs enable row level security;

drop policy if exists "booking_invoices_select_access" on public.booking_invoices;
create policy "booking_invoices_select_access"
on public.booking_invoices
for select
to authenticated
using (
  exists (
    select 1
    from public.bookings b
    left join public.hosts h on h.id = b.host_id
    where b.id = booking_invoices.booking_id
      and (
        b.user_id = (select auth.uid())
        or h.owner_id = (select auth.uid())
      )
  )
);

drop policy if exists "booking_email_logs_select_access" on public.booking_email_logs;
create policy "booking_email_logs_select_access"
on public.booking_email_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.bookings b
    left join public.hosts h on h.id = b.host_id
    where b.id = booking_email_logs.booking_id
      and (
        b.user_id = (select auth.uid())
        or h.owner_id = (select auth.uid())
      )
  )
);

commit;
