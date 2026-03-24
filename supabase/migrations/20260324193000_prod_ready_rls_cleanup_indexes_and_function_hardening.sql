begin;

alter table public.profiles enable row level security;
alter table public.hosts enable row level security;
alter table public.bookings enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = (select auth.uid()));

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "Hosts are publicly readable" on public.hosts;
drop policy if exists "hosts_select_public" on public.hosts;
drop policy if exists "hosts_insert_own_spaces" on public.hosts;
drop policy if exists "hosts_insert_owner" on public.hosts;
drop policy if exists "hosts_update_own_spaces" on public.hosts;
drop policy if exists "hosts_update_owner" on public.hosts;
drop policy if exists "hosts_delete_own_spaces" on public.hosts;
drop policy if exists "hosts_delete_owner" on public.hosts;

create policy "hosts_select_public"
on public.hosts
for select
to public
using (is_active = true or owner_id = (select auth.uid()));

create policy "hosts_insert_owner"
on public.hosts
for insert
to authenticated
with check (owner_id = (select auth.uid()));

create policy "hosts_update_owner"
on public.hosts
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "hosts_delete_owner"
on public.hosts
for delete
to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "Users can view own bookings" on public.bookings;
drop policy if exists "Users can insert own bookings" on public.bookings;
drop policy if exists "Users can update own bookings" on public.bookings;
drop policy if exists "bookings_select_own" on public.bookings;
drop policy if exists "bookings_insert_own" on public.bookings;
drop policy if exists "bookings_update_own" on public.bookings;
drop policy if exists "bookings_delete_own" on public.bookings;
drop policy if exists "bookings_select_host_owner" on public.bookings;
drop policy if exists "bookings_update_host_owner" on public.bookings;

create policy "bookings_select_own"
on public.bookings
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "bookings_insert_own"
on public.bookings
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "bookings_update_own"
on public.bookings
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "bookings_delete_own"
on public.bookings
for delete
to authenticated
using (user_id = (select auth.uid()));

create policy "bookings_select_host_owner"
on public.bookings
for select
to authenticated
using (
  exists (
    select 1
    from public.hosts
    where hosts.id = bookings.host_id
      and hosts.owner_id = (select auth.uid())
  )
);

create policy "bookings_update_host_owner"
on public.bookings
for update
to authenticated
using (
  exists (
    select 1
    from public.hosts
    where hosts.id = bookings.host_id
      and hosts.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.hosts
    where hosts.id = bookings.host_id
      and hosts.owner_id = (select auth.uid())
  )
);

create index if not exists idx_bookings_host_id
on public.bookings (host_id);

create index if not exists idx_bookings_user_id
on public.bookings (user_id);

create index if not exists idx_hosts_owner_id
on public.hosts (owner_id);

create index if not exists idx_bookings_host_status_start_end
on public.bookings (host_id, status, start_time, end_time);

create or replace function public.generate_booking_pickup_code(p_booking_id uuid)
returns text
language sql
immutable
set search_path = ''
as $$
  select upper(substr(replace(p_booking_id::text, '-', ''), 1, 8));
$$;

create or replace function public.set_booking_pickup_code()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.pickup_code is null or length(trim(new.pickup_code)) = 0 then
    new.pickup_code := public.generate_booking_pickup_code(new.id);
  end if;
  return new;
end;
$$;

create or replace function public.validate_booking_by_code(p_pickup_code text)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select b.*
  into v_booking
  from public.bookings b
  join public.hosts h on h.id = b.host_id
  where b.pickup_code = upper(trim(p_pickup_code))
    and h.owner_id = (select auth.uid())
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
