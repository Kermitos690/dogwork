-- Drop misconfigured policies targeting 'public' role
DROP POLICY IF EXISTS "Shelter employees can delete shelter animals" ON public.shelter_animals;
DROP POLICY IF EXISTS "Shelter employees can insert shelter animals" ON public.shelter_animals;
DROP POLICY IF EXISTS "Shelter employees can update shelter animals" ON public.shelter_animals;

-- Recreate with correct 'authenticated' role
CREATE POLICY "Shelter employees can insert shelter animals"
ON public.shelter_animals
FOR INSERT
TO authenticated
WITH CHECK (is_shelter_employee() AND user_id = get_employee_shelter_id(auth.uid()));

CREATE POLICY "Shelter employees can update shelter animals"
ON public.shelter_animals
FOR UPDATE
TO authenticated
USING (is_shelter_employee() AND user_id = get_employee_shelter_id(auth.uid()));

CREATE POLICY "Shelter employees can delete shelter animals"
ON public.shelter_animals
FOR DELETE
TO authenticated
USING (is_shelter_employee() AND user_id = get_employee_shelter_id(auth.uid()));