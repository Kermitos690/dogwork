CREATE POLICY "Shelter owner and employee can read"
ON public.shelter_employees
FOR SELECT
TO authenticated
USING (
  auth.uid() = shelter_user_id
  OR auth.uid() = auth_user_id
  OR is_admin()
);

DROP POLICY IF EXISTS "Admins read cron logs" ON public.cron_run_logs;
CREATE POLICY "Admins read cron logs"
ON public.cron_run_logs
FOR SELECT
TO authenticated
USING (is_admin());