-- =========================================================================
-- Security hardening: PII on shelter_animals & shelter_employees
-- =========================================================================

-- ---------------------------------------------------------------
-- FIX 1: shelter_animals — remove adopter SELECT on base table,
--        provide SECURITY DEFINER RPC returning only safe columns
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_my_adopted_animals()
RETURNS TABLE (
  id uuid,
  name text,
  species text,
  breed text,
  sex text,
  estimated_age text,
  weight_kg numeric,
  status text,
  photo_url text,
  description text,
  arrival_date date,
  is_sterilized boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sa.id, sa.name, sa.species, sa.breed, sa.sex,
         sa.estimated_age, sa.weight_kg, sa.status,
         sa.photo_url, sa.description,
         sa.arrival_date, sa.is_sterilized, sa.created_at
  FROM public.shelter_animals sa
  JOIN public.adopter_links al ON al.animal_id = sa.id
  WHERE al.adopter_user_id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.get_my_adopted_animals() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_adopted_animals() TO authenticated;

-- Drop the base-table policy that exposed adopter_email / adopter_name to adopters
DROP POLICY IF EXISTS "Adopters can view linked animals" ON public.shelter_animals;

-- ---------------------------------------------------------------
-- FIX 2: shelter_employees — add scoped SELECT policy AND revoke
--        direct visibility of hashed_pin to all roles
-- ---------------------------------------------------------------

DROP POLICY IF EXISTS "Shelter and admin can view employees" ON public.shelter_employees;
CREATE POLICY "Shelter and admin can view employees"
ON public.shelter_employees
FOR SELECT
TO authenticated
USING (
  ((auth.uid() = shelter_user_id) AND public.is_shelter())
  OR public.is_admin()
);

-- Column-level lock: nobody can SELECT hashed_pin directly.
-- PIN verification must go exclusively through verify_employee_pin() (SECURITY DEFINER).
REVOKE SELECT (hashed_pin) ON public.shelter_employees FROM authenticated, anon, public;

-- ---------------------------------------------------------------
-- FIX 3: ai_credit_packs — defensive guard
-- Public-facing view `ai_credit_packs_public` already exists and excludes
-- cost_estimate_usd / margin_estimate. No additional client SELECT policy
-- on the base table. Add an explicit comment to discourage future drift.
-- ---------------------------------------------------------------
COMMENT ON TABLE public.ai_credit_packs IS
  'Internal pricing/cost table. DO NOT add an unrestricted SELECT policy. '
  'Client-facing reads must go through public.ai_credit_packs_public, '
  'which excludes cost_estimate_usd and margin_estimate.';