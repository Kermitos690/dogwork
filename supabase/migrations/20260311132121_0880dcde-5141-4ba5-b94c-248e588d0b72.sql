-- client_links
DROP POLICY IF EXISTS "Coaches can delete links" ON public.client_links;
CREATE POLICY "Coaches can delete links" ON public.client_links FOR DELETE TO public USING (auth.uid() = coach_user_id AND is_educator());
DROP POLICY IF EXISTS "Coaches can insert links" ON public.client_links;
CREATE POLICY "Coaches can insert links" ON public.client_links FOR INSERT TO public WITH CHECK (auth.uid() = coach_user_id AND is_educator());
DROP POLICY IF EXISTS "Coaches can update links" ON public.client_links;
CREATE POLICY "Coaches can update links" ON public.client_links FOR UPDATE TO public USING (auth.uid() = coach_user_id AND is_educator());

-- coach_notes
DROP POLICY IF EXISTS "Coaches can delete notes" ON public.coach_notes;
CREATE POLICY "Coaches can delete notes" ON public.coach_notes FOR DELETE TO public USING (auth.uid() = coach_user_id AND is_educator());
DROP POLICY IF EXISTS "Coaches can insert notes" ON public.coach_notes;
CREATE POLICY "Coaches can insert notes" ON public.coach_notes FOR INSERT TO public WITH CHECK (auth.uid() = coach_user_id AND is_educator());
DROP POLICY IF EXISTS "Coaches can update notes" ON public.coach_notes;
CREATE POLICY "Coaches can update notes" ON public.coach_notes FOR UPDATE TO public USING (auth.uid() = coach_user_id AND is_educator());
DROP POLICY IF EXISTS "Coaches can view own notes" ON public.coach_notes;
CREATE POLICY "Coaches can view own notes" ON public.coach_notes FOR SELECT TO public USING (auth.uid() = coach_user_id AND is_educator());

-- coach_profiles
DROP POLICY IF EXISTS "Coaches can insert own profile" ON public.coach_profiles;
CREATE POLICY "Coaches can insert own profile" ON public.coach_profiles FOR INSERT TO public WITH CHECK (auth.uid() = user_id AND is_educator());
DROP POLICY IF EXISTS "Coaches can update own profile" ON public.coach_profiles;
CREATE POLICY "Coaches can update own profile" ON public.coach_profiles FOR UPDATE TO public USING (auth.uid() = user_id AND is_educator());
DROP POLICY IF EXISTS "Coaches can view own profile" ON public.coach_profiles;
CREATE POLICY "Coaches can view own profile" ON public.coach_profiles FOR SELECT TO public USING (auth.uid() = user_id AND is_educator());

-- plan_adjustments
DROP POLICY IF EXISTS "Coaches can insert adjustments" ON public.plan_adjustments;
CREATE POLICY "Coaches can insert adjustments" ON public.plan_adjustments FOR INSERT TO public WITH CHECK (auth.uid() = coach_user_id AND is_educator());
DROP POLICY IF EXISTS "Coaches can update adjustments" ON public.plan_adjustments;
CREATE POLICY "Coaches can update adjustments" ON public.plan_adjustments FOR UPDATE TO public USING (auth.uid() = coach_user_id AND is_educator());
DROP POLICY IF EXISTS "Coaches can view own adjustments" ON public.plan_adjustments;
CREATE POLICY "Coaches can view own adjustments" ON public.plan_adjustments FOR SELECT TO public USING (auth.uid() = coach_user_id AND is_educator());

-- professional_alerts
DROP POLICY IF EXISTS "Coaches can insert alerts" ON public.professional_alerts;
CREATE POLICY "Coaches can insert alerts" ON public.professional_alerts FOR INSERT TO public WITH CHECK (auth.uid() = coach_user_id AND is_educator());
DROP POLICY IF EXISTS "Coaches can update alerts" ON public.professional_alerts;
CREATE POLICY "Coaches can update alerts" ON public.professional_alerts FOR UPDATE TO public USING (auth.uid() = coach_user_id AND is_educator());
DROP POLICY IF EXISTS "Coaches can view alerts for their clients" ON public.professional_alerts;
CREATE POLICY "Coaches can view alerts for their clients" ON public.professional_alerts FOR SELECT TO public USING ((auth.uid() = coach_user_id AND is_educator()) OR auth.uid() = client_user_id);