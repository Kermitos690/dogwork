
-- 1. Drop the overly broad chip search policy
DROP POLICY IF EXISTS "Anyone can search animals by chip" ON public.shelter_animals;

-- 2. Add policy for adopters to view their linked animals (needed for adoption features)
CREATE POLICY "Adopters can view linked animals"
ON public.shelter_animals
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.adopter_links al
    WHERE al.animal_id = shelter_animals.id
      AND al.adopter_user_id = auth.uid()
  )
);

-- 3. Add policy for linked coaches to view shelter animals
CREATE POLICY "Coaches can view shelter animals"
ON public.shelter_animals
FOR SELECT
TO authenticated
USING (
  is_educator() AND EXISTS (
    SELECT 1 FROM public.shelter_coaches sc
    WHERE sc.shelter_user_id = shelter_animals.user_id
      AND sc.coach_user_id = auth.uid()
      AND sc.status = 'active'
  )
);

-- 4. Create a safe chip lookup function that returns only non-PII fields
CREATE OR REPLACE FUNCTION public.search_animal_by_chip(_chip_id text)
RETURNS TABLE(
  id uuid,
  name text,
  species text,
  breed text,
  sex text,
  estimated_age text,
  chip_id text,
  photo_url text,
  status text,
  shelter_user_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    sa.id, sa.name, sa.species, sa.breed, sa.sex, sa.estimated_age,
    sa.chip_id, sa.photo_url, sa.status, sa.user_id as shelter_user_id
  FROM public.shelter_animals sa
  WHERE sa.chip_id = _chip_id
    AND sa.chip_id IS NOT NULL
    AND sa.chip_id <> '';
$$;
