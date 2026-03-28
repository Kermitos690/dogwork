-- Table for post-adoption weekly check-ins (8-week program)
CREATE TABLE public.adoption_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  adopter_user_id UUID NOT NULL,
  animal_id UUID NOT NULL REFERENCES public.shelter_animals(id) ON DELETE CASCADE,
  shelter_user_id UUID NOT NULL,
  checkin_week INTEGER NOT NULL,
  due_date DATE NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE,
  photos TEXT[] DEFAULT '{}',
  video_url TEXT,
  general_mood TEXT,
  health_status TEXT,
  behavior_notes TEXT,
  highlights TEXT,
  concerns TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(adopter_user_id, animal_id, checkin_week)
);

ALTER TABLE public.adoption_checkins ENABLE ROW LEVEL SECURITY;

-- Adopters can view and submit their own check-ins
CREATE POLICY "Adopters can view own checkins"
ON public.adoption_checkins FOR SELECT
TO authenticated
USING (auth.uid() = adopter_user_id);

CREATE POLICY "Adopters can insert own checkins"
ON public.adoption_checkins FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = adopter_user_id);

CREATE POLICY "Adopters can update own checkins"
ON public.adoption_checkins FOR UPDATE
TO authenticated
USING (auth.uid() = adopter_user_id);

-- Shelters can view check-ins for their animals
CREATE POLICY "Shelters can view adoption checkins"
ON public.adoption_checkins FOR SELECT
TO authenticated
USING (auth.uid() = shelter_user_id AND is_shelter());

-- Admin full access
CREATE POLICY "Admin full access checkins select"
ON public.adoption_checkins FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Admin full access checkins delete"
ON public.adoption_checkins FOR DELETE
TO authenticated
USING (is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_adoption_checkins_updated_at
BEFORE UPDATE ON public.adoption_checkins
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Shelter config for checkin frequency
ALTER TABLE public.shelter_profiles
ADD COLUMN IF NOT EXISTS checkin_frequency_weeks INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS checkin_total_weeks INTEGER DEFAULT 8;

-- Allow anyone authenticated to read shelter_profiles (for dropdown in onboarding)
CREATE POLICY "Anyone can view shelter names"
ON public.shelter_profiles FOR SELECT
TO authenticated
USING (true);

-- Allow anyone authenticated to search shelter_animals by chip_id (for matching)
CREATE POLICY "Anyone can search animals by chip"
ON public.shelter_animals FOR SELECT
TO authenticated
USING (chip_id IS NOT NULL AND chip_id != '');