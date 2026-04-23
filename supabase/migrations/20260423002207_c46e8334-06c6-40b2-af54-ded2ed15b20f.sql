-- Remove SELECT access on the base shelter_employees table to prevent any
-- exposure of the sensitive hashed_pin column. All application reads go
-- through the public.shelter_employees_safe view (which excludes hashed_pin),
-- and PIN verification uses the SECURITY DEFINER verify_employee_pin() function.

DROP POLICY IF EXISTS "Admin can view all employees" ON public.shelter_employees;
DROP POLICY IF EXISTS "Employees can only view own employee record" ON public.shelter_employees;
DROP POLICY IF EXISTS "Shelter can view own employees" ON public.shelter_employees;
DROP POLICY IF EXISTS "Shelter employees can view own record" ON public.shelter_employees;

-- Note: INSERT / UPDATE / DELETE policies remain unchanged (shelter owners + admins).
-- The shelter_employees_safe view (security_invoker) already enforces
-- the equivalent read access through its own RLS surface.
-- Edge functions that need hashed_pin keep using the service role key,
-- which bypasses RLS by design.