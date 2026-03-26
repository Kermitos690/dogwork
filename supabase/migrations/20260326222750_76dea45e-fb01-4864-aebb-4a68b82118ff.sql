
-- Admin full CRUD on all major tables

-- dogs: admin can delete
CREATE POLICY "Admin can delete any dog" ON public.dogs FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admin can update any dog" ON public.dogs FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admin can view all dogs" ON public.dogs FOR SELECT TO authenticated USING (is_admin());

-- behavior_logs: admin delete
CREATE POLICY "Admin can delete behavior logs" ON public.behavior_logs FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admin can update behavior logs" ON public.behavior_logs FOR UPDATE TO authenticated USING (is_admin());

-- day_progress: admin delete
CREATE POLICY "Admin can delete day progress" ON public.day_progress FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admin can update day progress" ON public.day_progress FOR UPDATE TO authenticated USING (is_admin());

-- dog_evaluations: admin delete
CREATE POLICY "Admin can delete dog evaluations" ON public.dog_evaluations FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admin can update dog evaluations" ON public.dog_evaluations FOR UPDATE TO authenticated USING (is_admin());

-- exercise_sessions: admin delete
CREATE POLICY "Admin can delete exercise sessions" ON public.exercise_sessions FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admin can update exercise sessions" ON public.exercise_sessions FOR UPDATE TO authenticated USING (is_admin());

-- journal_entries: admin delete/update
CREATE POLICY "Admin can delete journal entries" ON public.journal_entries FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admin can update journal entries" ON public.journal_entries FOR UPDATE TO authenticated USING (is_admin());

-- messages: admin delete
CREATE POLICY "Admin can delete messages" ON public.messages FOR DELETE TO authenticated USING (is_admin());

-- training_plans: admin delete
CREATE POLICY "Admin can delete training plans" ON public.training_plans FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admin can update training plans" ON public.training_plans FOR UPDATE TO authenticated USING (is_admin());

-- dog_problems: admin delete
CREATE POLICY "Admin can delete dog problems" ON public.dog_problems FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admin can update dog problems" ON public.dog_problems FOR UPDATE TO authenticated USING (is_admin());

-- dog_objectives: admin delete
CREATE POLICY "Admin can delete dog objectives" ON public.dog_objectives FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admin can update dog objectives" ON public.dog_objectives FOR UPDATE TO authenticated USING (is_admin());

-- profiles: admin update/delete
CREATE POLICY "Admin can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admin can delete any profile" ON public.profiles FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admin can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (is_admin());

-- coach_profiles: admin delete
CREATE POLICY "Admin can delete coach profiles" ON public.coach_profiles FOR DELETE TO authenticated USING (is_admin());

-- coach_notes: admin delete/update
CREATE POLICY "Admin can delete coach notes" ON public.coach_notes FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admin can update coach notes" ON public.coach_notes FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admin can view coach notes" ON public.coach_notes FOR SELECT TO authenticated USING (is_admin());

-- coach_calendar_events: admin delete
CREATE POLICY "Admin can delete calendar events" ON public.coach_calendar_events FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admin can update calendar events" ON public.coach_calendar_events FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admin can view calendar events" ON public.coach_calendar_events FOR SELECT TO authenticated USING (is_admin());

-- client_links: admin delete
CREATE POLICY "Admin can delete client links" ON public.client_links FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admin can view all client links" ON public.client_links FOR SELECT TO authenticated USING (is_admin());

-- courses: admin full
CREATE POLICY "Admin can update any course" ON public.courses FOR UPDATE TO authenticated USING (is_admin());

-- course_bookings: admin delete
CREATE POLICY "Admin can delete bookings" ON public.course_bookings FOR DELETE TO authenticated USING (is_admin());

-- course_reviews: admin delete
CREATE POLICY "Admin can delete reviews" ON public.course_reviews FOR DELETE TO authenticated USING (is_admin());

-- professional_alerts: admin delete
CREATE POLICY "Admin can delete alerts" ON public.professional_alerts FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admin can update alerts" ON public.professional_alerts FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admin can view all alerts" ON public.professional_alerts FOR SELECT TO authenticated USING (is_admin());

-- plan_adjustments: admin delete
CREATE POLICY "Admin can delete adjustments" ON public.plan_adjustments FOR DELETE TO authenticated USING (is_admin());

-- shelter_animals: admin delete/update already via is_admin in SELECT, add missing
CREATE POLICY "Admin can update shelter animals" ON public.shelter_animals FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admin can delete shelter animals" ON public.shelter_animals FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admin can insert shelter animals" ON public.shelter_animals FOR INSERT TO authenticated WITH CHECK (is_admin());

-- shelter_employees: admin already has policies

-- shelter_observations: admin delete
CREATE POLICY "Admin can delete observations" ON public.shelter_observations FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admin can update observations" ON public.shelter_observations FOR UPDATE TO authenticated USING (is_admin());

-- shelter_activity_log: admin delete/update
CREATE POLICY "Admin can delete activity logs" ON public.shelter_activity_log FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admin can update activity logs" ON public.shelter_activity_log FOR UPDATE TO authenticated USING (is_admin());

-- shelter_spaces: admin delete
CREATE POLICY "Admin can delete spaces" ON public.shelter_spaces FOR DELETE TO authenticated USING (is_admin());

-- shelter_animal_evaluations: admin delete
CREATE POLICY "Admin can delete animal evaluations" ON public.shelter_animal_evaluations FOR DELETE TO authenticated USING (is_admin());

-- adoption_updates: admin delete
CREATE POLICY "Admin can delete adoption updates" ON public.adoption_updates FOR DELETE TO authenticated USING (is_admin());

-- shelter_coaches: admin insert/update/delete
CREATE POLICY "Admin can insert shelter coaches" ON public.shelter_coaches FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admin can update shelter coaches" ON public.shelter_coaches FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admin can delete shelter coaches" ON public.shelter_coaches FOR DELETE TO authenticated USING (is_admin());

-- user_preferences: admin
CREATE POLICY "Admin can view all preferences" ON public.user_preferences FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admin can update preferences" ON public.user_preferences FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admin can delete preferences" ON public.user_preferences FOR DELETE TO authenticated USING (is_admin());

-- exercise_categories: admin CRUD
CREATE POLICY "Admin can insert categories" ON public.exercise_categories FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admin can update categories" ON public.exercise_categories FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admin can delete categories" ON public.exercise_categories FOR DELETE TO authenticated USING (is_admin());

-- exercises: admin CRUD
CREATE POLICY "Admin can insert exercises" ON public.exercises FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admin can update exercises" ON public.exercises FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admin can delete exercises" ON public.exercises FOR DELETE TO authenticated USING (is_admin());
