DROP POLICY IF EXISTS "Authenticated users can read active rules" ON public.educator_commercial_rules;

CREATE POLICY "Admins and educators can read active rules"
ON public.educator_commercial_rules
FOR SELECT
TO authenticated
USING (is_active = true AND (is_admin() OR is_educator()));