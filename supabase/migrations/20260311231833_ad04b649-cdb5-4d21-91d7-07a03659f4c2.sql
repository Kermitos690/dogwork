
-- ============================================================
-- Convert ALL RESTRICTIVE RLS policies to PERMISSIVE
-- by dropping and recreating each policy.
-- ============================================================

-- ======================== behavior_logs ========================
DROP POLICY IF EXISTS "Users can insert their own behavior logs" ON public.behavior_logs;
CREATE POLICY "Users can insert their own behavior logs" ON public.behavior_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own behavior logs" ON public.behavior_logs;
CREATE POLICY "Users can update their own behavior logs" ON public.behavior_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "coach_read_client_behavior" ON public.behavior_logs;
CREATE POLICY "coach_read_client_behavior" ON public.behavior_logs FOR SELECT TO authenticated USING (
  (user_id = auth.uid()) OR (EXISTS (SELECT 1 FROM client_links WHERE client_links.client_user_id = behavior_logs.user_id AND client_links.coach_user_id = auth.uid() AND client_links.status = 'active'))
);

-- ======================== client_links ========================
DROP POLICY IF EXISTS "Coaches can delete links" ON public.client_links;
CREATE POLICY "Coaches can delete links" ON public.client_links FOR DELETE TO authenticated USING (auth.uid() = coach_user_id AND is_educator());

DROP POLICY IF EXISTS "Coaches can insert links" ON public.client_links;
CREATE POLICY "Coaches can insert links" ON public.client_links FOR INSERT TO authenticated WITH CHECK (auth.uid() = coach_user_id AND is_educator());

DROP POLICY IF EXISTS "Coaches can update links" ON public.client_links;
CREATE POLICY "Coaches can update links" ON public.client_links FOR UPDATE TO authenticated USING (auth.uid() = coach_user_id AND is_educator());

DROP POLICY IF EXISTS "Coaches can view their links" ON public.client_links;
CREATE POLICY "Coaches can view their links" ON public.client_links FOR SELECT TO authenticated USING (auth.uid() = coach_user_id OR auth.uid() = client_user_id);

-- ======================== coach_notes ========================
DROP POLICY IF EXISTS "Coaches can delete notes" ON public.coach_notes;
CREATE POLICY "Coaches can delete notes" ON public.coach_notes FOR DELETE TO authenticated USING (auth.uid() = coach_user_id AND is_educator());

DROP POLICY IF EXISTS "Coaches can insert notes" ON public.coach_notes;
CREATE POLICY "Coaches can insert notes" ON public.coach_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = coach_user_id AND is_educator());

DROP POLICY IF EXISTS "Coaches can update notes" ON public.coach_notes;
CREATE POLICY "Coaches can update notes" ON public.coach_notes FOR UPDATE TO authenticated USING (auth.uid() = coach_user_id AND is_educator());

DROP POLICY IF EXISTS "Coaches can view own notes" ON public.coach_notes;
CREATE POLICY "Coaches can view own notes" ON public.coach_notes FOR SELECT TO authenticated USING (auth.uid() = coach_user_id AND is_educator());

-- ======================== coach_profiles ========================
DROP POLICY IF EXISTS "Anyone can view coach profiles" ON public.coach_profiles;
CREATE POLICY "Anyone can view coach profiles" ON public.coach_profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Coaches can insert own profile" ON public.coach_profiles;
CREATE POLICY "Coaches can insert own profile" ON public.coach_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND is_educator());

DROP POLICY IF EXISTS "Coaches can update own profile" ON public.coach_profiles;
CREATE POLICY "Coaches can update own profile" ON public.coach_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id AND is_educator());

-- ======================== course_bookings ========================
DROP POLICY IF EXISTS "Admins can update bookings" ON public.course_bookings;
CREATE POLICY "Admins can update bookings" ON public.course_bookings FOR UPDATE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Admins can view all bookings" ON public.course_bookings;
CREATE POLICY "Admins can view all bookings" ON public.course_bookings FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Educators can view bookings for own courses" ON public.course_bookings;
CREATE POLICY "Educators can view bookings for own courses" ON public.course_bookings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_bookings.course_id AND courses.educator_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create bookings" ON public.course_bookings;
CREATE POLICY "Users can create bookings" ON public.course_bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own bookings" ON public.course_bookings;
CREATE POLICY "Users can view own bookings" ON public.course_bookings FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ======================== course_reviews ========================
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.course_reviews;
CREATE POLICY "Anyone can view reviews" ON public.course_reviews FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert own reviews" ON public.course_reviews;
CREATE POLICY "Users can insert own reviews" ON public.course_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reviews" ON public.course_reviews;
CREATE POLICY "Users can update own reviews" ON public.course_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ======================== courses ========================
DROP POLICY IF EXISTS "Admins can delete courses" ON public.courses;
CREATE POLICY "Admins can delete courses" ON public.courses FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert courses" ON public.courses;
CREATE POLICY "Admins can insert courses" ON public.courses FOR INSERT TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Anyone can view active courses" ON public.courses;
CREATE POLICY "Anyone can view active courses" ON public.courses FOR SELECT TO authenticated USING (
  (is_active = true AND approval_status = 'approved') OR auth.uid() = educator_user_id OR is_admin()
);

DROP POLICY IF EXISTS "Educators can insert own courses" ON public.courses;
CREATE POLICY "Educators can insert own courses" ON public.courses FOR INSERT TO authenticated WITH CHECK (auth.uid() = educator_user_id AND is_educator());

DROP POLICY IF EXISTS "Educators or admins can update courses" ON public.courses;
CREATE POLICY "Educators or admins can update courses" ON public.courses FOR UPDATE TO authenticated USING (auth.uid() = educator_user_id OR is_admin());

-- ======================== day_progress ========================
DROP POLICY IF EXISTS "Users can insert their own progress" ON public.day_progress;
CREATE POLICY "Users can insert their own progress" ON public.day_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own progress" ON public.day_progress;
CREATE POLICY "Users can update their own progress" ON public.day_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "coach_read_client_progress" ON public.day_progress;
CREATE POLICY "coach_read_client_progress" ON public.day_progress FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM client_links WHERE client_links.client_user_id = day_progress.user_id AND client_links.coach_user_id = auth.uid() AND client_links.status = 'active')
);

-- ======================== dog_evaluations ========================
DROP POLICY IF EXISTS "Users can insert their own evaluations" ON public.dog_evaluations;
CREATE POLICY "Users can insert their own evaluations" ON public.dog_evaluations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own evaluations" ON public.dog_evaluations;
CREATE POLICY "Users can update their own evaluations" ON public.dog_evaluations FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "coach_read_client_evaluations" ON public.dog_evaluations;
CREATE POLICY "coach_read_client_evaluations" ON public.dog_evaluations FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM client_links WHERE client_links.client_user_id = dog_evaluations.user_id AND client_links.coach_user_id = auth.uid() AND client_links.status = 'active')
);

-- ======================== dog_objectives ========================
DROP POLICY IF EXISTS "Users can delete their own objectives" ON public.dog_objectives;
CREATE POLICY "Users can delete their own objectives" ON public.dog_objectives FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own objectives" ON public.dog_objectives;
CREATE POLICY "Users can insert their own objectives" ON public.dog_objectives FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own objectives" ON public.dog_objectives;
CREATE POLICY "Users can update their own objectives" ON public.dog_objectives FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "coach_read_client_objectives" ON public.dog_objectives;
CREATE POLICY "coach_read_client_objectives" ON public.dog_objectives FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM client_links WHERE client_links.client_user_id = dog_objectives.user_id AND client_links.coach_user_id = auth.uid() AND client_links.status = 'active')
);

-- ======================== dog_problems ========================
DROP POLICY IF EXISTS "Users can delete their own problems" ON public.dog_problems;
CREATE POLICY "Users can delete their own problems" ON public.dog_problems FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own problems" ON public.dog_problems;
CREATE POLICY "Users can insert their own problems" ON public.dog_problems FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own problems" ON public.dog_problems;
CREATE POLICY "Users can update their own problems" ON public.dog_problems FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "coach_read_client_problems" ON public.dog_problems;
CREATE POLICY "coach_read_client_problems" ON public.dog_problems FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM client_links WHERE client_links.client_user_id = dog_problems.user_id AND client_links.coach_user_id = auth.uid() AND client_links.status = 'active')
);

-- ======================== dogs ========================
DROP POLICY IF EXISTS "Admins can view all dogs" ON public.dogs;
CREATE POLICY "Admins can view all dogs" ON public.dogs FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Users can delete their own dogs" ON public.dogs;
CREATE POLICY "Users can delete their own dogs" ON public.dogs FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own dogs" ON public.dogs;
CREATE POLICY "Users can insert their own dogs" ON public.dogs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own dogs" ON public.dogs;
CREATE POLICY "Users can update their own dogs" ON public.dogs FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "coach_read_client_dogs" ON public.dogs;
CREATE POLICY "coach_read_client_dogs" ON public.dogs FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM client_links WHERE client_links.client_user_id = dogs.user_id AND client_links.coach_user_id = auth.uid() AND client_links.status = 'active')
);

-- ======================== exercise_categories ========================
DROP POLICY IF EXISTS "Admins can delete categories" ON public.exercise_categories;
CREATE POLICY "Admins can delete categories" ON public.exercise_categories FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert categories" ON public.exercise_categories;
CREATE POLICY "Admins can insert categories" ON public.exercise_categories FOR INSERT TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update categories" ON public.exercise_categories;
CREATE POLICY "Admins can update categories" ON public.exercise_categories FOR UPDATE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Anyone can view categories" ON public.exercise_categories;
CREATE POLICY "Anyone can view categories" ON public.exercise_categories FOR SELECT TO authenticated USING (true);

-- ======================== exercise_sessions ========================
DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.exercise_sessions;
CREATE POLICY "Users can insert their own sessions" ON public.exercise_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sessions" ON public.exercise_sessions;
CREATE POLICY "Users can update their own sessions" ON public.exercise_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "coach_read_client_sessions" ON public.exercise_sessions;
CREATE POLICY "coach_read_client_sessions" ON public.exercise_sessions FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM client_links WHERE client_links.client_user_id = exercise_sessions.user_id AND client_links.coach_user_id = auth.uid() AND client_links.status = 'active')
);

-- ======================== exercises ========================
DROP POLICY IF EXISTS "Admins can delete exercises" ON public.exercises;
CREATE POLICY "Admins can delete exercises" ON public.exercises FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert exercises" ON public.exercises;
CREATE POLICY "Admins can insert exercises" ON public.exercises FOR INSERT TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update exercises" ON public.exercises;
CREATE POLICY "Admins can update exercises" ON public.exercises FOR UPDATE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Anyone can view exercises" ON public.exercises;
CREATE POLICY "Anyone can view exercises" ON public.exercises FOR SELECT TO authenticated USING (true);

-- ======================== journal_entries ========================
DROP POLICY IF EXISTS "Users can delete their own journal" ON public.journal_entries;
CREATE POLICY "Users can delete their own journal" ON public.journal_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own journal" ON public.journal_entries;
CREATE POLICY "Users can insert their own journal" ON public.journal_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own journal" ON public.journal_entries;
CREATE POLICY "Users can update their own journal" ON public.journal_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "coach_read_client_journals" ON public.journal_entries;
CREATE POLICY "coach_read_client_journals" ON public.journal_entries FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM client_links WHERE client_links.client_user_id = journal_entries.user_id AND client_links.coach_user_id = auth.uid() AND client_links.status = 'active')
);

-- ======================== messages ========================
DROP POLICY IF EXISTS "Recipients can update messages" ON public.messages;
CREATE POLICY "Recipients can update messages" ON public.messages FOR UPDATE TO authenticated USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- ======================== plan_adjustments ========================
DROP POLICY IF EXISTS "Clients can view their plan adjustments" ON public.plan_adjustments;
CREATE POLICY "Clients can view their plan adjustments" ON public.plan_adjustments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM training_plans WHERE training_plans.id = plan_adjustments.training_plan_id AND training_plans.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Coaches can insert adjustments" ON public.plan_adjustments;
CREATE POLICY "Coaches can insert adjustments" ON public.plan_adjustments FOR INSERT TO authenticated WITH CHECK (auth.uid() = coach_user_id AND is_educator());

DROP POLICY IF EXISTS "Coaches can update adjustments" ON public.plan_adjustments;
CREATE POLICY "Coaches can update adjustments" ON public.plan_adjustments FOR UPDATE TO authenticated USING (auth.uid() = coach_user_id AND is_educator());

DROP POLICY IF EXISTS "Coaches can view own adjustments" ON public.plan_adjustments;
CREATE POLICY "Coaches can view own adjustments" ON public.plan_adjustments FOR SELECT TO authenticated USING (auth.uid() = coach_user_id AND is_educator());

-- ======================== professional_alerts ========================
DROP POLICY IF EXISTS "Coaches can insert alerts" ON public.professional_alerts;
CREATE POLICY "Coaches can insert alerts" ON public.professional_alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = coach_user_id AND is_educator());

DROP POLICY IF EXISTS "Coaches can update alerts" ON public.professional_alerts;
CREATE POLICY "Coaches can update alerts" ON public.professional_alerts FOR UPDATE TO authenticated USING (auth.uid() = coach_user_id AND is_educator());

DROP POLICY IF EXISTS "Coaches can view alerts for their clients" ON public.professional_alerts;
CREATE POLICY "Coaches can view alerts for their clients" ON public.professional_alerts FOR SELECT TO authenticated USING (
  (auth.uid() = coach_user_id AND is_educator()) OR auth.uid() = client_user_id
);

-- ======================== profiles ========================
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "coach_read_client_profiles" ON public.profiles;
CREATE POLICY "coach_read_client_profiles" ON public.profiles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM client_links WHERE client_links.client_user_id = profiles.user_id AND client_links.coach_user_id = auth.uid() AND client_links.status = 'active')
);

-- ======================== training_plans ========================
DROP POLICY IF EXISTS "Users can delete their own plans" ON public.training_plans;
CREATE POLICY "Users can delete their own plans" ON public.training_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own plans" ON public.training_plans;
CREATE POLICY "Users can insert their own plans" ON public.training_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own plans" ON public.training_plans;
CREATE POLICY "Users can update their own plans" ON public.training_plans FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "coach_read_client_plans" ON public.training_plans;
CREATE POLICY "coach_read_client_plans" ON public.training_plans FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM client_links WHERE client_links.client_user_id = training_plans.user_id AND client_links.coach_user_id = auth.uid() AND client_links.status = 'active')
);

-- ======================== user_roles ========================
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
