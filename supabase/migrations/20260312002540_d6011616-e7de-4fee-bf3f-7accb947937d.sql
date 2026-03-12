
-- Create is_shelter() helper function
CREATE OR REPLACE FUNCTION public.is_shelter()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'shelter'
  )
$$;

-- Create shelter_profiles table
CREATE TABLE public.shelter_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  address text DEFAULT '',
  phone text DEFAULT '',
  organization_type text DEFAULT 'refuge',
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.shelter_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shelter can view own profile" ON public.shelter_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Shelter can insert own profile" ON public.shelter_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND is_shelter());
CREATE POLICY "Shelter can update own profile" ON public.shelter_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id AND is_shelter());

-- Create shelter_animals table
CREATE TABLE public.shelter_animals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  species text NOT NULL DEFAULT 'chien',
  breed text DEFAULT '',
  sex text DEFAULT '',
  estimated_age text DEFAULT '',
  weight_kg numeric DEFAULT NULL,
  status text NOT NULL DEFAULT 'arrivée',
  photo_url text DEFAULT NULL,
  description text DEFAULT '',
  chip_id text DEFAULT '',
  arrival_date date NOT NULL DEFAULT CURRENT_DATE,
  departure_date date DEFAULT NULL,
  departure_reason text DEFAULT '',
  is_sterilized boolean DEFAULT false,
  health_notes text DEFAULT '',
  behavior_notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shelter_animals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shelter can view own animals" ON public.shelter_animals
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Shelter can insert animals" ON public.shelter_animals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND is_shelter());
CREATE POLICY "Shelter can update animals" ON public.shelter_animals
  FOR UPDATE TO authenticated USING (auth.uid() = user_id AND is_shelter());
CREATE POLICY "Shelter can delete animals" ON public.shelter_animals
  FOR DELETE TO authenticated USING (auth.uid() = user_id AND is_shelter());

-- Create shelter_observations table
CREATE TABLE public.shelter_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid NOT NULL REFERENCES public.shelter_animals(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  observation_type text NOT NULL DEFAULT 'général',
  content text NOT NULL DEFAULT '',
  observation_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shelter_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shelter can view own observations" ON public.shelter_observations
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.shelter_animals WHERE id = animal_id AND user_id = auth.uid())
    OR is_admin()
  );
CREATE POLICY "Shelter can insert observations" ON public.shelter_observations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id AND is_shelter());
CREATE POLICY "Shelter can update observations" ON public.shelter_observations
  FOR UPDATE TO authenticated USING (auth.uid() = author_id AND is_shelter());
CREATE POLICY "Shelter can delete observations" ON public.shelter_observations
  FOR DELETE TO authenticated USING (auth.uid() = author_id AND is_shelter());

-- Triggers for updated_at
CREATE TRIGGER update_shelter_profiles_updated_at
  BEFORE UPDATE ON public.shelter_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shelter_animals_updated_at
  BEFORE UPDATE ON public.shelter_animals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
