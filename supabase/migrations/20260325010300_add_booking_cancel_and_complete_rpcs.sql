begin;

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
begin
  v_auth_user_id := (select auth.uid());

  if v_auth_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

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

  update public.bookings
  set status = 'cancelled'
  where id = v_booking.id
  returning * into v_booking;

  return v_booking;
end;
$$;

grant execute on function public.cancel_booking(uuid) to authenticated;

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

  return v_booking;
end;
$$;

grant execute on function public.complete_booking(uuid) to authenticated;

commit;
