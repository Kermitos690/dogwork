-- Remove SELECT policy on shelter_employees that exposes hashed_pin.
-- All application reads use the shelter_employees_safe view which excludes hashed_pin.
DROP POLICY IF EXISTS "Shelter owner and employee can read" ON public.shelter_employees;
DROP POLICY IF EXISTS "Employee reads only their own row" ON public.shelter_employees;
DROP POLICY IF EXISTS "Shelter owner reads all employees" ON public.shelter_employees;