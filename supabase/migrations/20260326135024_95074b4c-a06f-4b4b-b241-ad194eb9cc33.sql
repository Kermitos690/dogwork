
-- Clean up redundant policy - the "limited" policy already covers owner access
DROP POLICY IF EXISTS "Users can view their own coach profile" ON public.coach_profiles;
