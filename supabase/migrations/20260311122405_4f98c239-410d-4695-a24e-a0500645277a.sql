-- Allow admin to view all profiles (for stats)
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admin to view all dogs (for stats)  
CREATE POLICY "Admins can view all dogs" ON public.dogs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admin to view all user_roles
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));