
-- ============================================================
-- PRIORITY 1: shelter_profiles — create public view, drop open policy
-- ============================================================

-- Drop the overly permissive "Anyone can view shelter names" policy
DROP POLICY IF EXISTS "Anyone can view shelter names" ON public.shelter_profiles;

-- Create a restricted public view with only non-sensitive columns
CREATE OR REPLACE VIEW public.shelter_profiles_public
AS SELECT id, user_id, name, description, organization_type
FROM public.shelter_profiles;

-- Grant select to authenticated users (view runs as definer, bypasses RLS)
GRANT SELECT ON public.shelter_profiles_public TO authenticated;
GRANT SELECT ON public.shelter_profiles_public TO anon;

-- ============================================================
-- PRIORITY 2: shelter_employees_safe — remove email, phone
-- ============================================================

DROP VIEW IF EXISTS public.shelter_employees_safe;

CREATE VIEW public.shelter_employees_safe
WITH (security_invoker = on)
AS SELECT
  id,
  shelter_user_id,
  name,
  role,
  job_title,
  auth_user_id,
  is_active,
  created_at,
  updated_at
FROM public.shelter_employees;

-- ============================================================
-- PRIORITY 3: shelter_animals_safe — remove chip_id, health_notes
-- ============================================================

DROP VIEW IF EXISTS public.shelter_animals_safe;

CREATE VIEW public.shelter_animals_safe
WITH (security_invoker = on)
AS SELECT
  id,
  user_id,
  name,
  species,
  breed,
  sex,
  estimated_age,
  description,
  behavior_notes,
  photo_url,
  status,
  is_sterilized,
  weight_kg,
  arrival_date,
  departure_date,
  departure_reason,
  created_at,
  updated_at
FROM public.shelter_animals;
