-- 1) Tighten shelter_observations INSERT for employees: scope to their shelter's animals
DROP POLICY IF EXISTS "Shelter employees can insert observations" ON public.shelter_observations;

CREATE POLICY "Shelter employees can insert observations"
ON public.shelter_observations
FOR INSERT
WITH CHECK (
  is_shelter_employee()
  AND auth.uid() = author_id
  AND EXISTS (
    SELECT 1 FROM public.shelter_animals sa
    WHERE sa.id = shelter_observations.animal_id
      AND sa.user_id = public.get_employee_shelter_id(auth.uid())
  )
);

-- 2) Recreate shelter_animals_safe to mask adopter PII for non-owners
DROP VIEW IF EXISTS public.shelter_animals_safe CASCADE;

CREATE VIEW public.shelter_animals_safe
WITH (security_invoker = true)
AS
SELECT
  sa.id,
  sa.user_id,
  sa.name,
  sa.species,
  sa.breed,
  sa.sex,
  sa.estimated_age,
  sa.weight_kg,
  sa.status,
  sa.photo_url,
  sa.description,
  sa.chip_id,
  sa.arrival_date,
  sa.departure_date,
  sa.departure_reason,
  sa.is_sterilized,
  sa.health_notes,
  sa.behavior_notes,
  sa.created_at,
  sa.updated_at,
  CASE WHEN sa.user_id = auth.uid() OR public.is_admin() THEN sa.adopter_email ELSE NULL END AS adopter_email,
  CASE WHEN sa.user_id = auth.uid() OR public.is_admin() THEN sa.adopter_name  ELSE NULL END AS adopter_name
FROM public.shelter_animals sa;

GRANT SELECT ON public.shelter_animals_safe TO authenticated;

COMMENT ON COLUMN public.shelter_animals.adopter_email IS 'PII — only shelter owner and admins should read. Use shelter_animals_safe for filtered access.';
COMMENT ON COLUMN public.shelter_animals.adopter_name IS 'PII — only shelter owner and admins should read. Use shelter_animals_safe for filtered access.';