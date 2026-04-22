-- Final hardening: physically remove the deprecated PII columns from the base table.
-- Data already lives in shelter_animal_adopter_info; the safe view sources from there.

-- Drop sync triggers + function (no longer needed once columns are gone).
DROP TRIGGER IF EXISTS trg_sync_adopter_info_ins ON public.shelter_animals;
DROP TRIGGER IF EXISTS trg_sync_adopter_info_upd ON public.shelter_animals;
DROP FUNCTION IF EXISTS public.sync_adopter_info_from_base();

-- Drop the view that depends on the columns, then drop the columns, then recreate the view.
DROP VIEW IF EXISTS public.shelter_animals_safe;

ALTER TABLE public.shelter_animals
  DROP COLUMN IF EXISTS adopter_email,
  DROP COLUMN IF EXISTS adopter_name;

-- Recreate safe view sourcing PII exclusively from the RLS-protected private table.
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
  ai.adopter_email,
  ai.adopter_name
FROM public.shelter_animals sa
LEFT JOIN public.shelter_animal_adopter_info ai ON ai.animal_id = sa.id;

GRANT SELECT ON public.shelter_animals_safe TO authenticated;