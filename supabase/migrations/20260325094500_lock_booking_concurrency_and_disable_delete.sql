begin;

drop policy if exists "bookings_delete_own" on public.bookings;

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

  return json_build_object('success', true, 'booking_id', v_booking_id);
end;
$$;

grant execute on function public.book_parking_spot(uuid, uuid, timestamptz, timestamptz, numeric) to authenticated;

commit;
