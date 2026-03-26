-- Drop and recreate the INSERT policy for shelter_employees with a simpler check
DROP POLICY IF EXISTS "Shelter can insert employees" ON public.shelter_employees;

CREATE POLICY "Shelter can insert employees"
ON public.shelter_employees
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = shelter_user_id
  AND public.has_role(auth.uid(), 'shelter')
);
