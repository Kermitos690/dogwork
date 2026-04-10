
-- 1. Security definer function to verify PIN server-side only
CREATE OR REPLACE FUNCTION public.verify_employee_pin(_employee_id uuid, _pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  stored_hash text;
BEGIN
  SELECT hashed_pin INTO stored_hash
  FROM public.shelter_employees
  WHERE id = _employee_id AND is_active = true;
  
  IF stored_hash IS NULL THEN
    RETURN false;
  END IF;
  
  -- Compare using crypt (if pgcrypto is used) or direct comparison
  -- The system uses a technical password pattern, so direct compare
  RETURN stored_hash = _pin;
END;
$$;

-- 2. Allow authenticated users to read active credit packs
CREATE POLICY "Authenticated users can read active packs"
ON public.ai_credit_packs
FOR SELECT
TO authenticated
USING (is_active = true);

-- 3. Recreate shelter_employees_safe view without hashed_pin
DROP VIEW IF EXISTS public.shelter_employees_safe;
CREATE VIEW public.shelter_employees_safe
WITH (security_invoker = on)
AS
SELECT
  id,
  shelter_user_id,
  auth_user_id,
  name,
  role,
  job_title,
  email,
  phone,
  is_active,
  created_at,
  updated_at
FROM public.shelter_employees;
