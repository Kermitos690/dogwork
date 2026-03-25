
-- Add job_title to shelter_employees
ALTER TABLE shelter_employees ADD COLUMN IF NOT EXISTS job_title text DEFAULT '';

-- Add employee tracking to shelter_observations
ALTER TABLE shelter_observations ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES shelter_employees(id);
ALTER TABLE shelter_observations ADD COLUMN IF NOT EXISTS employee_name text DEFAULT '';

-- Create shelter_activity_log table
CREATE TABLE IF NOT EXISTS public.shelter_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shelter_user_id uuid NOT NULL,
  employee_id uuid REFERENCES shelter_employees(id),
  animal_id uuid REFERENCES shelter_animals(id),
  action_type text NOT NULL DEFAULT 'observation',
  description text NOT NULL DEFAULT '',
  employee_name text NOT NULL DEFAULT '',
  employee_role text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shelter_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shelter can view own activity logs" ON public.shelter_activity_log FOR SELECT TO authenticated USING ((auth.uid() = shelter_user_id) OR is_admin());
CREATE POLICY "Shelter can insert activity logs" ON public.shelter_activity_log FOR INSERT TO authenticated WITH CHECK ((auth.uid() = shelter_user_id) AND is_shelter());

-- Create shelter_spaces table
CREATE TABLE IF NOT EXISTS public.shelter_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shelter_user_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  space_type text NOT NULL DEFAULT 'box',
  capacity integer DEFAULT 1,
  current_animal_id uuid REFERENCES shelter_animals(id),
  position_x integer DEFAULT 0,
  position_y integer DEFAULT 0,
  width integer DEFAULT 1,
  height integer DEFAULT 1,
  color text DEFAULT '#94a3b8',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shelter_spaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shelter can view own spaces" ON public.shelter_spaces FOR SELECT TO authenticated USING ((auth.uid() = shelter_user_id) OR is_admin());
CREATE POLICY "Shelter can insert spaces" ON public.shelter_spaces FOR INSERT TO authenticated WITH CHECK ((auth.uid() = shelter_user_id) AND is_shelter());
CREATE POLICY "Shelter can update spaces" ON public.shelter_spaces FOR UPDATE TO authenticated USING ((auth.uid() = shelter_user_id) AND is_shelter());
CREATE POLICY "Shelter can delete spaces" ON public.shelter_spaces FOR DELETE TO authenticated USING ((auth.uid() = shelter_user_id) AND is_shelter());
