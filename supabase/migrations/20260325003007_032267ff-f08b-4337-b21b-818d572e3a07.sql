CREATE TABLE public.shelter_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shelter_user_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'soigneur',
  email text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shelter_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shelter can view own employees"
  ON public.shelter_employees FOR SELECT
  TO authenticated
  USING (auth.uid() = shelter_user_id AND is_shelter());

CREATE POLICY "Shelter can insert employees"
  ON public.shelter_employees FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = shelter_user_id AND is_shelter());

CREATE POLICY "Shelter can update employees"
  ON public.shelter_employees FOR UPDATE
  TO authenticated
  USING (auth.uid() = shelter_user_id AND is_shelter());

CREATE POLICY "Shelter can delete employees"
  ON public.shelter_employees FOR DELETE
  TO authenticated
  USING (auth.uid() = shelter_user_id AND is_shelter());

CREATE POLICY "Admin can view all employees"
  ON public.shelter_employees FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE TRIGGER update_shelter_employees_updated_at
  BEFORE UPDATE ON public.shelter_employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();