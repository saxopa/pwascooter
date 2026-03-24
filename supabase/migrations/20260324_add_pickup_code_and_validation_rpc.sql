begin;

alter table public.bookings
add column if not exists pickup_code text;

create or replace function public.generate_booking_pickup_code(p_booking_id uuid)
returns text
language sql
immutable
as $$
  select upper(substr(replace(p_booking_id::text, '-', ''), 1, 8));
$$;

update public.bookings
set pickup_code = public.generate_booking_pickup_code(id)
where pickup_code is null;

alter table public.bookings
alter column pickup_code set not null;

create unique index if not exists bookings_pickup_code_key
on public.bookings (pickup_code);

create or replace function public.set_booking_pickup_code()
returns trigger
language plpgsql
as $$
begin
  if new.pickup_code is null or length(trim(new.pickup_code)) = 0 then
    new.pickup_code := public.generate_booking_pickup_code(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_set_pickup_code on public.bookings;

create trigger bookings_set_pickup_code
before insert on public.bookings
for each row
execute function public.set_booking_pickup_code();

create or replace function public.validate_booking_by_code(p_pickup_code text)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select b.*
  into v_booking
  from public.bookings b
  join public.hosts h on h.id = b.host_id
  where b.pickup_code = upper(trim(p_pickup_code))
    and h.owner_id = auth.uid()
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
  end if;

  return v_booking;
end;
$$;

grant execute on function public.validate_booking_by_code(text) to authenticated;

commit;
