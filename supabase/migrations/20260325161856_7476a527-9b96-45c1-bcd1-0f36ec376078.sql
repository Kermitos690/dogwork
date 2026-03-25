
-- Junction table: shelter ↔ coach (many-to-many)
CREATE TABLE public.shelter_coaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shelter_user_id uuid NOT NULL,
  coach_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  specialty text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shelter_user_id, coach_user_id)
);

ALTER TABLE public.shelter_coaches ENABLE ROW LEVEL SECURITY;

-- Shelter can view/manage their own coaches
CREATE POLICY "Shelter can view own coaches"
  ON public.shelter_coaches FOR SELECT TO authenticated
  USING (auth.uid() = shelter_user_id OR is_admin());

CREATE POLICY "Shelter can insert coaches"
  ON public.shelter_coaches FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = shelter_user_id AND is_shelter());

CREATE POLICY "Shelter can update coaches"
  ON public.shelter_coaches FOR UPDATE TO authenticated
  USING (auth.uid() = shelter_user_id AND is_shelter());

CREATE POLICY "Shelter can delete coaches"
  ON public.shelter_coaches FOR DELETE TO authenticated
  USING (auth.uid() = shelter_user_id AND is_shelter());

-- Educators can see which shelters they're linked to
CREATE POLICY "Coaches can view own shelter links"
  ON public.shelter_coaches FOR SELECT TO authenticated
  USING (auth.uid() = coach_user_id AND is_educator());
