begin;

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

alter view public.hosts_map set (security_invoker = true);
grant select on public.hosts_map to anon, authenticated;

commit;
