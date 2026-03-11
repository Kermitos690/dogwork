
-- RLS policies for coach access to client data via client_links
-- Coaches can read dogs of their linked clients
CREATE POLICY "coach_read_client_dogs" ON public.dogs
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.client_links
    WHERE client_links.client_user_id = dogs.user_id
      AND client_links.coach_user_id = auth.uid()
      AND client_links.status = 'active'
  )
);

-- Drop existing select policy on dogs if it only allows owner
DROP POLICY IF EXISTS "Users can view own dogs" ON public.dogs;
DROP POLICY IF EXISTS "Users can read own dogs" ON public.dogs;

-- Coaches can read journal_entries of linked clients
CREATE POLICY "coach_read_client_journals" ON public.journal_entries
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.client_links
    WHERE client_links.client_user_id = journal_entries.user_id
      AND client_links.coach_user_id = auth.uid()
      AND client_links.status = 'active'
  )
);

DROP POLICY IF EXISTS "Users can read own journal entries" ON public.journal_entries;

-- Coaches can read behavior_logs of linked clients
CREATE POLICY "coach_read_client_behavior" ON public.behavior_logs
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.client_links
    WHERE client_links.client_user_id = behavior_logs.user_id
      AND client_links.coach_user_id = auth.uid()
      AND client_links.status = 'active'
  )
);

DROP POLICY IF EXISTS "Users can read own behavior logs" ON public.behavior_logs;

-- Coaches can read day_progress of linked clients
CREATE POLICY "coach_read_client_progress" ON public.day_progress
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.client_links
    WHERE client_links.client_user_id = day_progress.user_id
      AND client_links.coach_user_id = auth.uid()
      AND client_links.status = 'active'
  )
);

DROP POLICY IF EXISTS "Users can read own day progress" ON public.day_progress;

-- Coaches can read dog_evaluations of linked clients
CREATE POLICY "coach_read_client_evaluations" ON public.dog_evaluations
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.client_links
    WHERE client_links.client_user_id = dog_evaluations.user_id
      AND client_links.coach_user_id = auth.uid()
      AND client_links.status = 'active'
  )
);

DROP POLICY IF EXISTS "Users can read own evaluations" ON public.dog_evaluations;

-- Coaches can read dog_problems of linked clients
CREATE POLICY "coach_read_client_problems" ON public.dog_problems
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.client_links
    WHERE client_links.client_user_id = dog_problems.user_id
      AND client_links.coach_user_id = auth.uid()
      AND client_links.status = 'active'
  )
);

DROP POLICY IF EXISTS "Users can read own problems" ON public.dog_problems;

-- Coaches can read dog_objectives of linked clients
CREATE POLICY "coach_read_client_objectives" ON public.dog_objectives
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.client_links
    WHERE client_links.client_user_id = dog_objectives.user_id
      AND client_links.coach_user_id = auth.uid()
      AND client_links.status = 'active'
  )
);

DROP POLICY IF EXISTS "Users can read own objectives" ON public.dog_objectives;

-- Coaches can read training_plans of linked clients
CREATE POLICY "coach_read_client_plans" ON public.training_plans
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.client_links
    WHERE client_links.client_user_id = training_plans.user_id
      AND client_links.coach_user_id = auth.uid()
      AND client_links.status = 'active'
  )
);

DROP POLICY IF EXISTS "Users can read own training plans" ON public.training_plans;

-- Coaches can read exercise_sessions of linked clients
CREATE POLICY "coach_read_client_sessions" ON public.exercise_sessions
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.client_links
    WHERE client_links.client_user_id = exercise_sessions.user_id
      AND client_links.coach_user_id = auth.uid()
      AND client_links.status = 'active'
  )
);

DROP POLICY IF EXISTS "Users can read own exercise sessions" ON public.exercise_sessions;

-- Coaches can read profiles of linked clients (for display names)
CREATE POLICY "coach_read_client_profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.client_links
    WHERE client_links.client_user_id = profiles.user_id
      AND client_links.coach_user_id = auth.uid()
      AND client_links.status = 'active'
  )
);

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
