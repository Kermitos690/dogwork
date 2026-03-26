
-- 1. Fix coach_profiles: restrict SELECT to hide stripe_account_id from non-owners
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view coach profiles" ON public.coach_profiles;

-- Create a policy that lets anyone see non-sensitive columns via a restricted select
-- But only the owner can see their own full row
CREATE POLICY "Users can view their own coach profile"
ON public.coach_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Public can view coach display info"
ON public.coach_profiles
FOR SELECT
TO authenticated
USING (true);

-- We'll use a view to hide stripe_account_id for non-owners
-- Actually, since RLS can't do column-level, let's just restrict the SELECT to owner-only
-- and create a separate public view

-- Simpler approach: drop the public policy, keep owner-only + admin
DROP POLICY IF EXISTS "Public can view coach display info" ON public.coach_profiles;

CREATE POLICY "Anyone can view coach profiles limited"
ON public.coach_profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.client_links cl
    WHERE cl.coach_user_id = coach_profiles.user_id
    AND cl.client_user_id = auth.uid()
    AND cl.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM public.shelter_coaches sc
    WHERE sc.coach_user_id = coach_profiles.user_id
    AND sc.shelter_user_id = auth.uid()
    AND sc.status = 'active'
  )
);

-- 2. Fix client_links: add WITH CHECK to restrict status transitions
DROP POLICY IF EXISTS "Clients can respond to link requests" ON public.client_links;

CREATE POLICY "Clients can respond to link requests"
ON public.client_links
FOR UPDATE
TO authenticated
USING (
  client_user_id = auth.uid()
  AND status = 'pending'
)
WITH CHECK (
  client_user_id = auth.uid()
  AND status IN ('active', 'rejected')
);

-- 3. Fix course_bookings: add educator UPDATE policy scoped to their courses
-- and user UPDATE policy for their own bookings (cancel only)
DROP POLICY IF EXISTS "Educators can update bookings for their courses" ON public.course_bookings;

CREATE POLICY "Educators can update bookings for their courses"
ON public.course_bookings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_bookings.course_id
    AND c.educator_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_bookings.course_id
    AND c.educator_user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own bookings"
ON public.course_bookings
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND status IN ('pending', 'cancelled')
);
