
-- Protect user_roles from privilege escalation: only admins can write
CREATE POLICY "Only admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Only admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Only admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (is_admin());
