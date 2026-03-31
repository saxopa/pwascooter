begin;

create index if not exists idx_hosts_is_active
on public.hosts (is_active)
where is_active = true;

create or replace view public.hosts_map as
select
  id,
  name,
  latitude,
  longitude,
  price_per_hour,
  has_charging,
  capacity,
  owner_id,
  is_active
from public.hosts
where is_active = true;

grant select on public.hosts_map to anon, authenticated;

commit;
