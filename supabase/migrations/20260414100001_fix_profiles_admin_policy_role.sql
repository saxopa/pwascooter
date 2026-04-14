-- Restrict admin profiles policy from public (includes anon) to authenticated only
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

-- Merge both SELECT policies for authenticated role into one (avoids multiple_permissive_policies warning)
CREATE POLICY profiles_select_authenticated
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()) OR is_admin());
