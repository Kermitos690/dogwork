
-- Add shelter_employee to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'shelter_employee';

-- Add auth_user_id and pin_code columns to shelter_employees
ALTER TABLE public.shelter_employees 
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS pin_code text;
