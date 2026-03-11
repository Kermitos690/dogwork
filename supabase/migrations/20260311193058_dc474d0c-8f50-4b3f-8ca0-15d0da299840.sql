
-- =====================================================
-- FIX: Recreate ALL RLS policies as PERMISSIVE (default)
-- Currently all policies are RESTRICTIVE which blocks all access
-- =====================================================

-- ============ behavior_logs ============
DROP POLICY IF EXISTS "Users can insert their own behavior logs" ON public.behavior_logs;
DROP POLICY IF EXISTS "Users can update their own behavior logs" ON public.behavior_logs;
DROP POLICY IF EXISTS "Users can view their own behavior logs" ON public.behavior_logs;

CREATE POLICY "Users can insert their own behavior logs" ON public.behavior_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own behavior logs" ON public.behavior_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own behavior logs" ON public.behavior_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ client_links ============
DROP POLICY IF EXISTS "Coaches can delete links" ON public.client_links;
DROP POLICY IF EXISTS "Coaches can insert links" ON public.client_links;
DROP POLICY IF EXISTS "Coaches can update links" ON public.client_links;
DROP POLICY IF EXISTS "Coaches can view their links" ON public.client_links;

CREATE POLICY "Coaches can delete links" ON public.client_links FOR DELETE TO authenticated USING (auth.uid() = coach_user_id AND is_educator());
CREATE POLICY "Coaches can insert links" ON public.client_links FOR INSERT TO authenticated WITH CHECK (auth.uid() = coach_user_id AND is_educator());
CREATE POLICY "Coaches can update links" ON public.client_links FOR UPDATE TO authenticated USING (auth.uid() = coach_user_id AND is_educator());
CREATE POLICY "Coaches can view their links" ON public.client_links FOR SELECT TO authenticated USING (auth.uid() = coach_user_id OR auth.uid() = client_user_id);

-- ============ coach_notes ============
DROP POLICY IF EXISTS "Coaches can delete notes" ON public.coach_notes;
DROP POLICY IF EXISTS "Coaches can insert notes" ON public.coach_notes;
DROP POLICY IF EXISTS "Coaches can update notes" ON public.coach_notes;
DROP POLICY IF EXISTS "Coaches can view own notes" ON public.coach_notes;

CREATE POLICY "Coaches can delete notes" ON public.coach_notes FOR DELETE TO authenticated USING (auth.uid() = coach_user_id AND is_educator());
CREATE POLICY "Coaches can insert notes" ON public.coach_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = coach_user_id AND is_educator());
CREATE POLICY "Coaches can update notes" ON public.coach_notes FOR UPDATE TO authenticated USING (auth.uid() = coach_user_id AND is_educator());
CREATE POLICY "Coaches can view own notes" ON public.coach_notes FOR SELECT TO authenticated USING (auth.uid() = coach_user_id AND is_educator());

-- ============ coach_profiles ============
DROP POLICY IF EXISTS "Anyone can view coach profiles" ON public.coach_profiles;
DROP POLICY IF EXISTS "Coaches can insert own profile" ON public.coach_profiles;
DROP POLICY IF EXISTS "Coaches can update own profile" ON public.coach_profiles;

CREATE POLICY "Anyone can view coach profiles" ON public.coach_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coaches can insert own profile" ON public.coach_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND is_educator());
CREATE POLICY "Coaches can update own profile" ON public.coach_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id AND is_educator());

-- ============ course_bookings ============
DROP POLICY IF EXISTS "Admins can update bookings" ON public.course_bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.course_bookings;
DROP POLICY IF EXISTS "Educators can view bookings for own courses" ON public.course_bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.course_bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON public.course_bookings;

CREATE POLICY "Admins can update bookings" ON public.course_bookings FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins can view all bookings" ON public.course_bookings FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Educators can view bookings for own courses" ON public.course_bookings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_bookings.course_id AND courses.educator_user_id = auth.uid()));
CREATE POLICY "Users can create bookings" ON public.course_bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own bookings" ON public.course_bookings FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ course_reviews ============
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.course_reviews;
DROP POLICY IF EXISTS "Users can insert own reviews" ON public.course_reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON public.course_reviews;

CREATE POLICY "Anyone can view reviews" ON public.course_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own reviews" ON public.course_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON public.course_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ============ courses ============
DROP POLICY IF EXISTS "Admins can delete courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can insert courses" ON public.courses;
DROP POLICY IF EXISTS "Anyone can view active courses" ON public.courses;
DROP POLICY IF EXISTS "Educators can insert own courses" ON public.courses;
DROP POLICY IF EXISTS "Educators or admins can update courses" ON public.courses;

CREATE POLICY "Admins can delete courses" ON public.courses FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admins can insert courses" ON public.courses FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Anyone can view active courses" ON public.courses FOR SELECT TO authenticated USING ((is_active = true AND approval_status = 'approved') OR auth.uid() = educator_user_id OR is_admin());
CREATE POLICY "Educators can insert own courses" ON public.courses FOR INSERT TO authenticated WITH CHECK (auth.uid() = educator_user_id AND is_educator());
CREATE POLICY "Educators or admins can update courses" ON public.courses FOR UPDATE TO authenticated USING (auth.uid() = educator_user_id OR is_admin());

-- ============ day_progress ============
DROP POLICY IF EXISTS "Users can insert their own progress" ON public.day_progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON public.day_progress;
DROP POLICY IF EXISTS "Users can view their own progress" ON public.day_progress;

CREATE POLICY "Users can insert their own progress" ON public.day_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own progress" ON public.day_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own progress" ON public.day_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ dog_evaluations ============
DROP POLICY IF EXISTS "Users can insert their own evaluations" ON public.dog_evaluations;
DROP POLICY IF EXISTS "Users can update their own evaluations" ON public.dog_evaluations;
DROP POLICY IF EXISTS "Users can view their own evaluations" ON public.dog_evaluations;

CREATE POLICY "Users can insert their own evaluations" ON public.dog_evaluations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own evaluations" ON public.dog_evaluations FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own evaluations" ON public.dog_evaluations FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ dog_objectives ============
DROP POLICY IF EXISTS "Users can delete their own objectives" ON public.dog_objectives;
DROP POLICY IF EXISTS "Users can insert their own objectives" ON public.dog_objectives;
DROP POLICY IF EXISTS "Users can update their own objectives" ON public.dog_objectives;
DROP POLICY IF EXISTS "Users can view their own objectives" ON public.dog_objectives;

CREATE POLICY "Users can delete their own objectives" ON public.dog_objectives FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own objectives" ON public.dog_objectives FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own objectives" ON public.dog_objectives FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own objectives" ON public.dog_objectives FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ dog_problems ============
DROP POLICY IF EXISTS "Users can delete their own problems" ON public.dog_problems;
DROP POLICY IF EXISTS "Users can insert their own problems" ON public.dog_problems;
DROP POLICY IF EXISTS "Users can update their own problems" ON public.dog_problems;
DROP POLICY IF EXISTS "Users can view their own problems" ON public.dog_problems;

CREATE POLICY "Users can delete their own problems" ON public.dog_problems FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own problems" ON public.dog_problems FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own problems" ON public.dog_problems FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own problems" ON public.dog_problems FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ dogs ============
DROP POLICY IF EXISTS "Admins can view all dogs" ON public.dogs;
DROP POLICY IF EXISTS "Users can delete their own dogs" ON public.dogs;
DROP POLICY IF EXISTS "Users can insert their own dogs" ON public.dogs;
DROP POLICY IF EXISTS "Users can update their own dogs" ON public.dogs;
DROP POLICY IF EXISTS "Users can view their own dogs" ON public.dogs;

CREATE POLICY "Admins can view all dogs" ON public.dogs FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Users can delete their own dogs" ON public.dogs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own dogs" ON public.dogs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own dogs" ON public.dogs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own dogs" ON public.dogs FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ exercise_categories ============
DROP POLICY IF EXISTS "Admins can delete categories" ON public.exercise_categories;
DROP POLICY IF EXISTS "Admins can insert categories" ON public.exercise_categories;
DROP POLICY IF EXISTS "Admins can update categories" ON public.exercise_categories;
DROP POLICY IF EXISTS "Anyone can view categories" ON public.exercise_categories;

CREATE POLICY "Admins can delete categories" ON public.exercise_categories FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admins can insert categories" ON public.exercise_categories FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update categories" ON public.exercise_categories FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Anyone can view categories" ON public.exercise_categories FOR SELECT TO authenticated USING (true);

-- ============ exercise_sessions ============
DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.exercise_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.exercise_sessions;
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.exercise_sessions;

CREATE POLICY "Users can insert their own sessions" ON public.exercise_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sessions" ON public.exercise_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own sessions" ON public.exercise_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ exercises ============
DROP POLICY IF EXISTS "Admins can delete exercises" ON public.exercises;
DROP POLICY IF EXISTS "Admins can insert exercises" ON public.exercises;
DROP POLICY IF EXISTS "Admins can update exercises" ON public.exercises;
DROP POLICY IF EXISTS "Anyone can view exercises" ON public.exercises;

CREATE POLICY "Admins can delete exercises" ON public.exercises FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admins can insert exercises" ON public.exercises FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update exercises" ON public.exercises FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Anyone can view exercises" ON public.exercises FOR SELECT TO authenticated USING (true);

-- ============ journal_entries ============
DROP POLICY IF EXISTS "Users can delete their own journal" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can insert their own journal" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can update their own journal" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can view their own journal" ON public.journal_entries;

CREATE POLICY "Users can delete their own journal" ON public.journal_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own journal" ON public.journal_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own journal" ON public.journal_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own journal" ON public.journal_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ plan_adjustments ============
DROP POLICY IF EXISTS "Coaches can insert adjustments" ON public.plan_adjustments;
DROP POLICY IF EXISTS "Coaches can update adjustments" ON public.plan_adjustments;
DROP POLICY IF EXISTS "Coaches can view own adjustments" ON public.plan_adjustments;

CREATE POLICY "Coaches can insert adjustments" ON public.plan_adjustments FOR INSERT TO authenticated WITH CHECK (auth.uid() = coach_user_id AND is_educator());
CREATE POLICY "Coaches can update adjustments" ON public.plan_adjustments FOR UPDATE TO authenticated USING (auth.uid() = coach_user_id AND is_educator());
CREATE POLICY "Coaches can view own adjustments" ON public.plan_adjustments FOR SELECT TO authenticated USING (auth.uid() = coach_user_id AND is_educator());

-- ============ professional_alerts ============
DROP POLICY IF EXISTS "Coaches can insert alerts" ON public.professional_alerts;
DROP POLICY IF EXISTS "Coaches can update alerts" ON public.professional_alerts;
DROP POLICY IF EXISTS "Coaches can view alerts for their clients" ON public.professional_alerts;

CREATE POLICY "Coaches can insert alerts" ON public.professional_alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = coach_user_id AND is_educator());
CREATE POLICY "Coaches can update alerts" ON public.professional_alerts FOR UPDATE TO authenticated USING (auth.uid() = coach_user_id AND is_educator());
CREATE POLICY "Coaches can view alerts for their clients" ON public.professional_alerts FOR SELECT TO authenticated USING ((auth.uid() = coach_user_id AND is_educator()) OR auth.uid() = client_user_id);

-- ============ profiles ============
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Educators can view client profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Educators can view client profiles" ON public.profiles FOR SELECT TO authenticated USING (is_educator() OR is_admin() OR auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ============ training_plans ============
DROP POLICY IF EXISTS "Users can delete their own plans" ON public.training_plans;
DROP POLICY IF EXISTS "Users can insert their own plans" ON public.training_plans;
DROP POLICY IF EXISTS "Users can update their own plans" ON public.training_plans;
DROP POLICY IF EXISTS "Users can view their own plans" ON public.training_plans;

CREATE POLICY "Users can delete their own plans" ON public.training_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own plans" ON public.training_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own plans" ON public.training_plans FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own plans" ON public.training_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ user_roles ============
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
