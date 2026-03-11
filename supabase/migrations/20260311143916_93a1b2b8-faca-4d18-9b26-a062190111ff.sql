ALTER TABLE public.courses ADD COLUMN approval_status text NOT NULL DEFAULT 'pending';

-- Update existing courses to approved
UPDATE public.courses SET approval_status = 'approved' WHERE approval_status = 'pending';

-- Update the SELECT RLS policy to only show approved courses publicly
DROP POLICY IF EXISTS "Anyone can view active courses" ON public.courses;
CREATE POLICY "Anyone can view active courses" ON public.courses
  FOR SELECT TO authenticated
  USING (
    (is_active = true AND approval_status = 'approved')
    OR (auth.uid() = educator_user_id)
    OR is_admin()
  );

-- Allow admins to update courses (for approval)
DROP POLICY IF EXISTS "Educators can update own courses" ON public.courses;
CREATE POLICY "Educators or admins can update courses" ON public.courses
  FOR UPDATE TO authenticated
  USING ((auth.uid() = educator_user_id) OR is_admin());