
CREATE TABLE public.adoption_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid NOT NULL REFERENCES public.shelter_animals(id) ON DELETE CASCADE,
  shelter_user_id uuid NOT NULL,
  adopter_name text DEFAULT '',
  adopter_email text DEFAULT '',
  message text DEFAULT '',
  photo_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.adoption_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shelter can view own adoption updates"
  ON public.adoption_updates FOR SELECT TO authenticated
  USING (auth.uid() = shelter_user_id OR is_admin());

CREATE POLICY "Shelter can insert adoption updates"
  ON public.adoption_updates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = shelter_user_id AND is_shelter());

CREATE POLICY "Shelter can update adoption updates"
  ON public.adoption_updates FOR UPDATE TO authenticated
  USING (auth.uid() = shelter_user_id AND is_shelter());

ALTER TABLE public.shelter_animals ADD COLUMN IF NOT EXISTS adopter_name text DEFAULT '';
ALTER TABLE public.shelter_animals ADD COLUMN IF NOT EXISTS adopter_email text DEFAULT '';
