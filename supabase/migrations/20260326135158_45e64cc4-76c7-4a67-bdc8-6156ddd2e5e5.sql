
-- Remove duplicate educator booking policy (old one from a previous migration)
DROP POLICY IF EXISTS "Educators can update bookings for own courses" ON public.course_bookings;
