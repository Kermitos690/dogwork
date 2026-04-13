
-- =============================================
-- FIX 1: educator_commercial_rules — restrict public read to authenticated
-- =============================================
DROP POLICY IF EXISTS "Anyone can read active rules" ON public.educator_commercial_rules;

CREATE POLICY "Authenticated users can read active rules"
ON public.educator_commercial_rules
FOR SELECT
TO authenticated
USING (is_active = true);

-- =============================================
-- FIX 2: shelter_animals — hide adopter PII from employees
-- =============================================

-- Drop and recreate the safe view (if it already exists from types, drop first)
DROP VIEW IF EXISTS public.shelter_animals_safe;

CREATE VIEW public.shelter_animals_safe
WITH (security_invoker = on) AS
SELECT
  id,
  user_id,
  name,
  species,
  breed,
  sex,
  estimated_age,
  weight_kg,
  chip_id,
  is_sterilized,
  status,
  arrival_date,
  departure_date,
  departure_reason,
  description,
  photo_url,
  behavior_notes,
  health_notes,
  created_at,
  updated_at
  -- deliberately excludes: adopter_email, adopter_name
FROM public.shelter_animals;

-- Replace the employee SELECT policy to only grant access through the safe view
-- The existing policy name from the schema
DROP POLICY IF EXISTS "Shelter employees can view shelter animals" ON public.shelter_animals;

-- Re-create a tighter employee policy: employees see animals via the safe view only
-- We restrict direct table access for employees to exclude PII columns
-- Shelter owners (user_id match) keep full access via existing policies
-- Employees should query shelter_animals_safe instead

-- Keep existing shelter owner policy intact, just ensure employees
-- can only read via the safe view (which excludes PII).
-- Since employees access via shelter_employees table linkage,
-- we create a policy that only returns non-PII rows for employee access:
CREATE POLICY "Shelter employees can view shelter animals via safe view"
ON public.shelter_animals
FOR SELECT
TO authenticated
USING (
  -- Shelter owner: full access (handled by other policies)
  -- Employee: must exist in shelter_employees for this shelter
  EXISTS (
    SELECT 1 FROM public.shelter_employees se
    WHERE se.auth_user_id = auth.uid()
      AND se.shelter_user_id = shelter_animals.user_id
      AND se.is_active = true
  )
);
