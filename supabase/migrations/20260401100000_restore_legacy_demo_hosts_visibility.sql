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
      or exists (
        select 1
        from public.profiles p
        where p.id = public.hosts.owner_id
          and p.role = 'host'
          and p.host_status = 'approved'
      )
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
left join public.profiles p
  on p.id = h.owner_id
where h.is_active = true
  and (
    h.owner_id is null
    or (
      p.role = 'host'
      and p.host_status = 'approved'
    )
  );

grant select on public.hosts_map to anon, authenticated;
