create or replace function public.is_host_approved(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.role = 'host'
      and p.host_status = 'approved'
  );
$$;

revoke all on function public.is_host_approved(uuid) from public;
grant execute on function public.is_host_approved(uuid) to anon, authenticated;

drop policy if exists hosts_select_public on public.hosts;
create policy hosts_select_public
on public.hosts
for select
to public
using (
  (
    is_active = true
    and (
      owner_id is null
      or public.is_host_approved(owner_id)
    )
  )
  or (
    (select auth.uid()) is not null
    and owner_id = (select auth.uid())
    and public.is_host_approved((select auth.uid()))
  )
);

drop policy if exists hosts_insert_owner on public.hosts;
create policy hosts_insert_owner
on public.hosts
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and public.is_host_approved((select auth.uid()))
);

drop policy if exists hosts_update_owner on public.hosts;
create policy hosts_update_owner
on public.hosts
for update
to authenticated
using (
  owner_id = (select auth.uid())
  and public.is_host_approved((select auth.uid()))
)
with check (
  owner_id = (select auth.uid())
  and public.is_host_approved((select auth.uid()))
);

drop policy if exists hosts_delete_owner on public.hosts;
create policy hosts_delete_owner
on public.hosts
for delete
to authenticated
using (
  owner_id = (select auth.uid())
  and public.is_host_approved((select auth.uid()))
);

create or replace view public.hosts_map
with (security_invoker = true) as
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
where h.is_active = true
  and (
    h.owner_id is null
    or public.is_host_approved(h.owner_id)
  );

grant select on public.hosts_map to anon, authenticated;
