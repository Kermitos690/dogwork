
-- =====================================================
-- Post-adoption follow-up plans system
-- =====================================================

-- Plan created by shelter for each adoption
CREATE TABLE public.adoption_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shelter_user_id uuid NOT NULL,
  adopter_user_id uuid NOT NULL,
  animal_id uuid NOT NULL REFERENCES public.shelter_animals(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  duration_weeks integer NOT NULL DEFAULT 8,
  status text NOT NULL DEFAULT 'active',
  objectives jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(adopter_user_id, animal_id)
);

ALTER TABLE public.adoption_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shelter can manage own plans" ON public.adoption_plans
  FOR ALL TO authenticated
  USING (auth.uid() = shelter_user_id AND is_shelter())
  WITH CHECK (auth.uid() = shelter_user_id AND is_shelter());

CREATE POLICY "Adopters can view own plans" ON public.adoption_plans
  FOR SELECT TO authenticated
  USING (auth.uid() = adopter_user_id);

CREATE POLICY "Admin full access" ON public.adoption_plans
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Weekly tasks within a plan
CREATE TABLE public.adoption_plan_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.adoption_plans(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  task_type text NOT NULL DEFAULT 'observation',
  exercise_slug text DEFAULT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.adoption_plan_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shelter can manage plan tasks" ON public.adoption_plan_tasks
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.adoption_plans p
    WHERE p.id = adoption_plan_tasks.plan_id
      AND p.shelter_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.adoption_plans p
    WHERE p.id = adoption_plan_tasks.plan_id
      AND p.shelter_user_id = auth.uid()
  ));

CREATE POLICY "Adopters can view tasks" ON public.adoption_plan_tasks
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.adoption_plans p
    WHERE p.id = adoption_plan_tasks.plan_id
      AND p.adopter_user_id = auth.uid()
  ));

CREATE POLICY "Admin full access tasks" ON public.adoption_plan_tasks
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Adopter progress entries (completion of tasks with optional media)
CREATE TABLE public.adoption_plan_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.adoption_plan_tasks(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.adoption_plans(id) ON DELETE CASCADE,
  adopter_user_id uuid NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  notes text DEFAULT '',
  photos text[] DEFAULT '{}',
  video_url text DEFAULT NULL,
  mood text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.adoption_plan_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Adopters can manage own entries" ON public.adoption_plan_entries
  FOR ALL TO authenticated
  USING (auth.uid() = adopter_user_id)
  WITH CHECK (auth.uid() = adopter_user_id);

CREATE POLICY "Shelter can view entries" ON public.adoption_plan_entries
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.adoption_plans p
    WHERE p.id = adoption_plan_entries.plan_id
      AND p.shelter_user_id = auth.uid()
  ));

CREATE POLICY "Admin full access entries" ON public.adoption_plan_entries
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Updated at trigger
CREATE TRIGGER update_adoption_plans_updated_at
  BEFORE UPDATE ON public.adoption_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_adoption_plan_entries_updated_at
  BEFORE UPDATE ON public.adoption_plan_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
