-- courses
DROP POLICY IF EXISTS "Admins can delete courses" ON public.courses;
CREATE POLICY "Admins can delete courses" ON public.courses FOR DELETE TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "Admins can insert courses" ON public.courses;
CREATE POLICY "Admins can insert courses" ON public.courses FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Anyone can view active courses" ON public.courses;
CREATE POLICY "Anyone can view active courses" ON public.courses FOR SELECT TO authenticated USING (is_active = true OR auth.uid() = educator_user_id OR is_admin());
DROP POLICY IF EXISTS "Educators can insert own courses" ON public.courses;
CREATE POLICY "Educators can insert own courses" ON public.courses FOR INSERT TO authenticated WITH CHECK (auth.uid() = educator_user_id AND is_educator());
DROP POLICY IF EXISTS "Educators can update own courses" ON public.courses;
CREATE POLICY "Educators can update own courses" ON public.courses FOR UPDATE TO authenticated USING (auth.uid() = educator_user_id OR is_admin());

-- course_bookings
DROP POLICY IF EXISTS "Admins can update bookings" ON public.course_bookings;
CREATE POLICY "Admins can update bookings" ON public.course_bookings FOR UPDATE TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.course_bookings;
CREATE POLICY "Admins can view all bookings" ON public.course_bookings FOR SELECT TO authenticated USING (is_admin());

-- dogs
DROP POLICY IF EXISTS "Admins can view all dogs" ON public.dogs;
CREATE POLICY "Admins can view all dogs" ON public.dogs FOR SELECT TO authenticated USING (is_admin());

-- exercise_categories
DROP POLICY IF EXISTS "Admins can delete categories" ON public.exercise_categories;
CREATE POLICY "Admins can delete categories" ON public.exercise_categories FOR DELETE TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "Admins can insert categories" ON public.exercise_categories;
CREATE POLICY "Admins can insert categories" ON public.exercise_categories FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admins can update categories" ON public.exercise_categories;
CREATE POLICY "Admins can update categories" ON public.exercise_categories FOR UPDATE TO authenticated USING (is_admin());

-- exercises
DROP POLICY IF EXISTS "Admins can delete exercises" ON public.exercises;
CREATE POLICY "Admins can delete exercises" ON public.exercises FOR DELETE TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "Admins can insert exercises" ON public.exercises;
CREATE POLICY "Admins can insert exercises" ON public.exercises FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admins can update exercises" ON public.exercises;
CREATE POLICY "Admins can update exercises" ON public.exercises FOR UPDATE TO authenticated USING (is_admin());

-- profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (is_admin());

-- user_roles
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (is_admin());