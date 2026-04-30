
-- 1) Tighten shelter_employees SELECT: hide colleague rows (incl. hashed_pin, email, phone) from regular employees
DROP POLICY IF EXISTS "Shelter owner and employee can read" ON public.shelter_employees;

CREATE POLICY "Shelter owner reads all employees"
ON public.shelter_employees
FOR SELECT
TO authenticated
USING (
  auth.uid() = shelter_user_id
  OR public.is_admin()
);

CREATE POLICY "Employee reads only their own row"
ON public.shelter_employees
FOR SELECT
TO authenticated
USING (
  auth.uid() = auth_user_id
);

-- Note: the public.shelter_employees_safe view (security_invoker) excludes hashed_pin
-- and remains the recommended read path for employee-facing UI.

-- 2) Restrict ai_pricing_config reads to admins only (internal margin/pricing logic)
DROP POLICY IF EXISTS "Authenticated users can read AI pricing config" ON public.ai_pricing_config;
DROP POLICY IF EXISTS "Anyone reads pricing config" ON public.ai_pricing_config;

-- "Admin manages pricing config" policy (FOR ALL with is_admin()) already covers admin SELECT.
-- No additional read policy: non-admins cannot read internal pricing config.
