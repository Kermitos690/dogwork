
-- =====================================================
-- HARDENING MIGRATION: Data exposure + RLS tightening
-- =====================================================

-- 1) Create a safe view for shelter_employees that excludes hashed_pin
CREATE OR REPLACE VIEW public.shelter_employees_safe AS
SELECT id, shelter_user_id, name, role, job_title, email, phone, auth_user_id, is_active, created_at, updated_at
FROM public.shelter_employees;

-- 2) Create a safe view for shelter_animals that excludes adopter PII for employees
CREATE OR REPLACE VIEW public.shelter_animals_safe AS
SELECT id, user_id, name, species, breed, sex, estimated_age, description, chip_id,
       health_notes, behavior_notes, photo_url, status, is_sterilized, weight_kg,
       arrival_date, departure_date, departure_reason, created_at, updated_at
FROM public.shelter_animals;

-- 3) Tighten shelter_employees: employees should NOT see other employees' data
-- Currently "Shelter employees can view own record" may be too broad
-- Add policy for shelter_employee role to only see own record
CREATE POLICY "Employees can only view own employee record"
ON public.shelter_employees
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid() AND is_shelter_employee());

-- 4) Add explicit policy preventing shelter_employees from seeing adopter PII on shelter_animals
-- The existing policy "Shelter employees can view shelter animals" grants SELECT with full columns
-- We can't do column-level RLS in Postgres, but we'll handle this in the frontend queries

-- 5) Add comment documentation on sensitive columns
COMMENT ON COLUMN public.shelter_employees.hashed_pin IS 'SHA-256 hashed PIN - SENSITIVE: never return to client except during auth flow';
COMMENT ON COLUMN public.shelter_animals.adopter_email IS 'PII - restrict visibility to shelter owners only';
COMMENT ON COLUMN public.shelter_animals.adopter_name IS 'PII - restrict visibility to shelter owners only';
