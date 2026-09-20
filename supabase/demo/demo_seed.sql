-- BHW Care DEMO seed. Synthetic data only.
--
-- NOT a migration. Never applied by `supabase db push`.
-- Run it by hand in the Supabase Dashboard SQL Editor.
--
-- Prerequisite: create these two users first in Authentication > Users
-- (with "Auto Confirm User" turned on):
--   demo.superadmin@example.com
--   demo.bhw@example.com
--
-- Delete both users, and this demo barangay, before any pilot with real users.

do $$
declare
  demo_barangay uuid;
  superadmin_id uuid;
  bhw_id uuid;
begin
  select id into superadmin_id from auth.users where email = 'demo.superadmin@example.com';
  select id into bhw_id from auth.users where email = 'demo.bhw@example.com';

  if superadmin_id is null or bhw_id is null then
    raise exception 'Create both demo users in Authentication > Users first.';
  end if;

  insert into public.barangays (name, city_municipality, province, status)
  values ('Demo Barangay A', 'Demo City', 'Demo Province', 'active')
  on conflict (city_municipality, name) do nothing;

  select id into demo_barangay
  from public.barangays
  where city_municipality = 'Demo City' and name = 'Demo Barangay A';

  insert into public.user_profiles (id, display_name, preferred_language)
  values
    (superadmin_id, 'Demo Super Admin', 'en'),
    (bhw_id, 'Demo BHW', 'tl')
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role, barangay_id)
  values
    (superadmin_id, 'super_admin', null),
    (bhw_id, 'bhw', demo_barangay)
  on conflict (user_id, role) do nothing;
end
$$;

-- Verification: should return exactly two rows.
select u.email, r.role, b.name as barangay
from public.user_roles r
join auth.users u on u.id = r.user_id
left join public.barangays b on b.id = r.barangay_id
where u.email like 'demo.%@example.com'
order by u.email;