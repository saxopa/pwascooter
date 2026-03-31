create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) = 'service_role' then
    return new;
  end if;

  if (select auth.uid()) is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.role := 'user';
    new.host_status := 'pending';
    return new;
  end if;

  if tg_op = 'UPDATE' and old.id = (select auth.uid()) then
    new.role := old.role;
    new.host_status := old.host_status;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_profile_privilege_escalation on public.profiles;

create trigger prevent_profile_privilege_escalation
before insert or update on public.profiles
for each row
execute function public.prevent_profile_privilege_escalation();

drop policy if exists hosts_select_public on public.hosts;
drop policy if exists hosts_insert_owner on public.hosts;
drop policy if exists hosts_update_owner on public.hosts;
drop policy if exists hosts_delete_owner on public.hosts;

create policy hosts_select_public
on public.hosts
for select
to public
using (
  (
    is_active = true
    and exists (
      select 1
      from public.profiles p
      where p.id = public.hosts.owner_id
        and p.role = 'host'
        and p.host_status = 'approved'
    )
  )
  or (
    ((select auth.uid()) is not null)
    and owner_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'host'
        and p.host_status = 'approved'
    )
  )
);

create policy hosts_insert_owner
on public.hosts
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'host'
      and p.host_status = 'approved'
  )
);

create policy hosts_update_owner
on public.hosts
for update
to authenticated
using (
  owner_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'host'
      and p.host_status = 'approved'
  )
)
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'host'
      and p.host_status = 'approved'
  )
);

create policy hosts_delete_owner
on public.hosts
for delete
to authenticated
using (
  owner_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'host'
      and p.host_status = 'approved'
  )
);

create or replace view public.hosts_map
with (security_invoker = true)
as
select
  h.id,
  h.name,
  h.latitude,
  h.longitude,
  h.price_per_hour,
  h.has_charging,
  h.capacity,
  h.owner_id,
  h.is_active
from public.hosts h
join public.profiles p
  on p.id = h.owner_id
where h.is_active = true
  and p.role = 'host'
  and p.host_status = 'approved';

grant select on public.hosts_map to anon, authenticated;

create or replace function public.book_parking_spot_paid(
  p_user_id uuid,
  p_host_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_total_price numeric,
  p_payment_reference text default null
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_host public.hosts%rowtype;
  v_overlapping_count integer;
  v_booking_id uuid;
  v_pickup_code text;
  v_expected_total numeric;
  v_duration_hours numeric;
begin
  if p_user_id is null then
    return json_build_object('success', false, 'error', 'AUTH_REQUIRED');
  end if;

  if p_payment_reference is not null then
    select b.id, b.pickup_code
    into v_booking_id, v_pickup_code
    from public.bookings b
    where b.payment_reference = p_payment_reference
    limit 1;

    if found then
      return json_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'pickup_code', v_pickup_code
      );
    end if;
  end if;

  perform public.expire_pending_bookings();

  if p_start_time is null or p_end_time is null or p_end_time <= p_start_time then
    return json_build_object('success', false, 'error', 'INVALID_TIME_RANGE');
  end if;

  select h.*
  into v_host
  from public.hosts h
  join public.profiles p
    on p.id = h.owner_id
  where h.id = p_host_id
    and h.is_active = true
    and p.role = 'host'
    and p.host_status = 'approved'
  for update of h;

  if not found then
    return json_build_object('success', false, 'error', 'HOST_NOT_AVAILABLE');
  end if;

  if v_host.owner_id = p_user_id then
    return json_build_object('success', false, 'error', 'SELF_BOOKING_FORBIDDEN');
  end if;

  v_duration_hours := (extract(epoch from (p_end_time - p_start_time)) / 3600.0)::numeric;
  v_expected_total := round((v_host.price_per_hour * v_duration_hours)::numeric, 2);

  if p_total_price is null or abs(p_total_price - v_expected_total) > 0.009 then
    return json_build_object('success', false, 'error', 'INVALID_PRICE');
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
    status,
    payment_reference
  ) values (
    p_host_id,
    p_user_id,
    p_start_time,
    p_end_time,
    v_expected_total,
    'pending',
    p_payment_reference
  )
  returning id, pickup_code into v_booking_id, v_pickup_code;

  perform public.log_booking_status_event(
    v_booking_id,
    null,
    'pending',
    p_user_id,
    'user',
    'booking_created',
    jsonb_build_object(
      'host_id', p_host_id,
      'start_time', p_start_time,
      'end_time', p_end_time,
      'payment_reference', p_payment_reference
    )
  );

  return json_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'pickup_code', v_pickup_code
  );
end;
$$;

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
  limit 1
  for update;

  if not found then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  select exists (
    select 1
    from public.hosts h
    join public.profiles p
      on p.id = h.owner_id
    where h.id = v_booking.host_id
      and h.owner_id = v_auth_user_id
      and p.role = 'host'
      and p.host_status = 'approved'
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
  join public.profiles p on p.id = h.owner_id
  where b.id = p_booking_id
    and h.owner_id = v_auth_user_id
    and p.role = 'host'
    and p.host_status = 'approved'
  limit 1
  for update of b;

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
  join public.profiles p on p.id = h.owner_id
  where b.pickup_code = upper(trim(p_pickup_code))
    and h.owner_id = v_auth_user_id
    and p.role = 'host'
    and p.host_status = 'approved'
  limit 1
  for update of b;

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
