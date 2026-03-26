
-- Allow admins to insert shelter employees
DROP POLICY IF EXISTS "Shelter can insert employees" ON public.shelter_employees;
CREATE POLICY "Shelter or admin can insert employees"
ON public.shelter_employees
FOR INSERT
TO authenticated
WITH CHECK (
  ((auth.uid() = shelter_user_id) AND is_shelter())
  OR is_admin()
);

-- Allow admins to update shelter employees
DROP POLICY IF EXISTS "Shelter can update employees" ON public.shelter_employees;
CREATE POLICY "Shelter or admin can update employees"
ON public.shelter_employees
FOR UPDATE
TO authenticated
USING (
  ((auth.uid() = shelter_user_id) AND is_shelter())
  OR is_admin()
);

-- Allow admins to delete shelter employees
DROP POLICY IF EXISTS "Shelter can delete employees" ON public.shelter_employees;
CREATE POLICY "Shelter or admin can delete employees"
ON public.shelter_employees
FOR DELETE
TO authenticated
USING (
  ((auth.uid() = shelter_user_id) AND is_shelter())
  OR is_admin()
);
