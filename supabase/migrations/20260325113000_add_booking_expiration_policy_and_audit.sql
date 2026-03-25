begin;

create extension if not exists pg_cron with schema pg_catalog;

create table if not exists public.booking_status_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  previous_status public.booking_status,
  next_status public.booking_status not null,
  actor_user_id uuid references public.profiles(id),
  actor_role text not null check (actor_role in ('user', 'host', 'system')),
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.booking_status_events enable row level security;

drop policy if exists "booking_status_events_select_access" on public.booking_status_events;

create policy "booking_status_events_select_access"
on public.booking_status_events
for select
to authenticated
using (
  exists (
    select 1
    from public.bookings b
    left join public.hosts h on h.id = b.host_id
    where b.id = booking_status_events.booking_id
      and (
        b.user_id = (select auth.uid())
        or h.owner_id = (select auth.uid())
      )
  )
);

create index if not exists booking_status_events_booking_id_idx
  on public.booking_status_events (booking_id, created_at desc);

create index if not exists booking_status_events_actor_user_id_idx
  on public.booking_status_events (actor_user_id, created_at desc);

create or replace function public.log_booking_status_event(
  p_booking_id uuid,
  p_previous_status public.booking_status,
  p_next_status public.booking_status,
  p_actor_user_id uuid,
  p_actor_role text,
  p_reason text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.booking_status_events (
    booking_id,
    previous_status,
    next_status,
    actor_user_id,
    actor_role,
    reason,
    metadata
  )
  values (
    p_booking_id,
    p_previous_status,
    p_next_status,
    p_actor_user_id,
    p_actor_role,
    p_reason,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.log_booking_status_event(uuid, public.booking_status, public.booking_status, uuid, text, text, jsonb) from public, anon, authenticated;

create or replace function public.expire_pending_bookings()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expired_count integer := 0;
begin
  with expired as (
    update public.bookings b
    set status = 'cancelled'
    where b.status = 'pending'
      and b.start_time <= (now() - interval '30 minutes')
    returning b.id
  ), logged as (
    insert into public.booking_status_events (
      booking_id,
      previous_status,
      next_status,
      actor_user_id,
      actor_role,
      reason,
      metadata
    )
    select
      expired.id,
      'pending',
      'cancelled',
      null,
      'system',
      'pending_expired_no_checkin',
      jsonb_build_object('grace_period_minutes', 30)
    from expired
    returning 1
  )
  select count(*)
  into v_expired_count
  from logged;

  return coalesce(v_expired_count, 0);
end;
$$;

grant execute on function public.expire_pending_bookings() to authenticated;

create or replace function public.book_parking_spot(
  p_host_id uuid,
  p_user_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_total_price numeric
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auth_user_id uuid;
  v_host public.hosts%rowtype;
  v_overlapping_count integer;
  v_booking_id uuid;
begin
  v_auth_user_id := (select auth.uid());

  if v_auth_user_id is null then
    return json_build_object('success', false, 'error', 'AUTH_REQUIRED');
  end if;

  perform public.expire_pending_bookings();

  if p_user_id is distinct from v_auth_user_id then
    return json_build_object('success', false, 'error', 'INVALID_USER');
  end if;

  if p_start_time is null or p_end_time is null or p_end_time <= p_start_time then
    return json_build_object('success', false, 'error', 'INVALID_TIME_RANGE');
  end if;

  if p_total_price is null or p_total_price <= 0 then
    return json_build_object('success', false, 'error', 'INVALID_PRICE');
  end if;

  select *
  into v_host
  from public.hosts
  where id = p_host_id
    and is_active = true
  for update;

  if not found then
    return json_build_object('success', false, 'error', 'HOST_NOT_AVAILABLE');
  end if;

  if v_host.owner_id = v_auth_user_id then
    return json_build_object('success', false, 'error', 'SELF_BOOKING_FORBIDDEN');
  end if;

  select count(*)
  into v_overlapping_count
  from public.bookings
  where host_id = p_host_id
    and status in ('pending', 'active')
    and p_start_time < end_time
    and p_end_time > start_time;

  if v_overlapping_count >= v_host.capacity then
    return json_build_object('success', false, 'error', 'PARKING_FULL');
  end if;

  insert into public.bookings (
    host_id,
    user_id,
    start_time,
    end_time,
    total_price,
    status
  ) values (
    p_host_id,
    v_auth_user_id,
    p_start_time,
    p_end_time,
    p_total_price,
    'pending'
  )
  returning id into v_booking_id;

  perform public.log_booking_status_event(
    v_booking_id,
    null,
    'pending',
    v_auth_user_id,
    'user',
    'booking_created',
    jsonb_build_object(
      'host_id', p_host_id,
      'start_time', p_start_time,
      'end_time', p_end_time
    )
  );

  return json_build_object('success', true, 'booking_id', v_booking_id);
end;
$$;

grant execute on function public.book_parking_spot(uuid, uuid, timestamptz, timestamptz, numeric) to authenticated;

create or replace function public.cancel_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auth_user_id uuid;
  v_booking public.bookings%rowtype;
  v_is_host_owner boolean;
  v_actor_role text;
  v_reason text;
begin
  v_auth_user_id := (select auth.uid());

  if v_auth_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  perform public.expire_pending_bookings();

  select b.*
  into v_booking
  from public.bookings b
  where b.id = p_booking_id
  limit 1;

  if not found then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  select exists (
    select 1
    from public.hosts h
    where h.id = v_booking.host_id
      and h.owner_id = v_auth_user_id
  )
  into v_is_host_owner;

  if v_booking.user_id <> v_auth_user_id and not v_is_host_owner then
    raise exception 'FORBIDDEN';
  end if;

  if v_booking.status = 'cancelled' then
    return v_booking;
  end if;

  if v_booking.status <> 'pending' then
    raise exception 'BOOKING_NOT_CANCELLABLE';
  end if;

  if v_is_host_owner then
    if now() >= v_booking.start_time then
      raise exception 'HOST_CANCELLATION_WINDOW_CLOSED';
    end if;
    v_actor_role := 'host';
    v_reason := 'host_cancelled_before_start';
  else
    if now() >= (v_booking.start_time - interval '15 minutes') then
      raise exception 'CANCELLATION_WINDOW_CLOSED';
    end if;
    v_actor_role := 'user';
    v_reason := 'user_cancelled_before_cutoff';
  end if;

  update public.bookings
  set status = 'cancelled'
  where id = v_booking.id
  returning * into v_booking;

  perform public.log_booking_status_event(
    v_booking.id,
    'pending',
    'cancelled',
    v_auth_user_id,
    v_actor_role,
    v_reason,
    jsonb_build_object(
      'start_time', v_booking.start_time,
      'cutoff_minutes', 15
    )
  );

  return v_booking;
end;
$$;

grant execute on function public.cancel_booking(uuid) to authenticated;

create or replace function public.validate_booking_by_code(p_pickup_code text)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auth_user_id uuid;
  v_booking public.bookings%rowtype;
begin
  v_auth_user_id := (select auth.uid());

  if v_auth_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  perform public.expire_pending_bookings();

  select b.*
  into v_booking
  from public.bookings b
  join public.hosts h on h.id = b.host_id
  where upper(b.pickup_code) = upper(trim(p_pickup_code))
    and h.owner_id = v_auth_user_id
  limit 1;

  if not found then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  if v_booking.status = 'cancelled' then
    raise exception 'BOOKING_CANCELLED';
  end if;

  if v_booking.status = 'completed' then
    raise exception 'BOOKING_COMPLETED';
  end if;

  if v_booking.status <> 'active' then
    update public.bookings
    set status = 'active'
    where id = v_booking.id
    returning * into v_booking;

    perform public.log_booking_status_event(
      v_booking.id,
      'pending',
      'active',
      v_auth_user_id,
      'host',
      'host_validated_pickup_code',
      jsonb_build_object('pickup_code', upper(trim(p_pickup_code)))
    );
  end if;

  return v_booking;
end;
$$;

grant execute on function public.validate_booking_by_code(text) to authenticated;

create or replace function public.complete_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auth_user_id uuid;
  v_booking public.bookings%rowtype;
begin
  v_auth_user_id := (select auth.uid());

  if v_auth_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select b.*
  into v_booking
  from public.bookings b
  join public.hosts h on h.id = b.host_id
  where b.id = p_booking_id
    and h.owner_id = v_auth_user_id
  limit 1;

  if not found then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  if v_booking.status = 'completed' then
    return v_booking;
  end if;

  if v_booking.status = 'cancelled' then
    raise exception 'BOOKING_CANCELLED';
  end if;

  if v_booking.status <> 'active' then
    raise exception 'BOOKING_NOT_COMPLETABLE';
  end if;

  update public.bookings
  set status = 'completed'
  where id = v_booking.id
  returning * into v_booking;

  perform public.log_booking_status_event(
    v_booking.id,
    'active',
    'completed',
    v_auth_user_id,
    'host',
    'host_marked_completed',
    jsonb_build_object('completed_at', now())
  );

  return v_booking;
end;
$$;

grant execute on function public.complete_booking(uuid) to authenticated;

do $$
declare
  v_job record;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    for v_job in
      select jobid
      from cron.job
      where jobname = 'expire-pending-bookings'
    loop
      perform cron.unschedule(v_job.jobid);
    end loop;

    perform cron.schedule(
      'expire-pending-bookings',
      '*/5 * * * *',
      $cron$select public.expire_pending_bookings();$cron$
    );
  end if;
end
$$;

commit;
