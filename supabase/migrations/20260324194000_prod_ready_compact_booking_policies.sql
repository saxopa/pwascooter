begin;

drop policy if exists "bookings_select_own" on public.bookings;
drop policy if exists "bookings_select_host_owner" on public.bookings;
drop policy if exists "bookings_update_own" on public.bookings;
drop policy if exists "bookings_update_host_owner" on public.bookings;
drop policy if exists "bookings_select_access" on public.bookings;
drop policy if exists "bookings_update_access" on public.bookings;

create policy "bookings_select_access"
on public.bookings
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.hosts
    where hosts.id = bookings.host_id
      and hosts.owner_id = (select auth.uid())
  )
);

create policy "bookings_update_access"
on public.bookings
for update
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.hosts
    where hosts.id = bookings.host_id
      and hosts.owner_id = (select auth.uid())
  )
)
with check (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.hosts
    where hosts.id = bookings.host_id
      and hosts.owner_id = (select auth.uid())
  )
);

commit;
