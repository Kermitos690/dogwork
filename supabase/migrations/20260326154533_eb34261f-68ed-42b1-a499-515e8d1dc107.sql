-- Lot 2: Allow shelter employees to UPDATE and DELETE shelter_animals for their shelter
CREATE POLICY "Shelter employees can update shelter animals"
ON public.shelter_animals
FOR UPDATE
USING (is_shelter_employee() AND user_id = get_employee_shelter_id(auth.uid()));

CREATE POLICY "Shelter employees can delete shelter animals"
ON public.shelter_animals
FOR DELETE
USING (is_shelter_employee() AND user_id = get_employee_shelter_id(auth.uid()));

-- Allow shelter employees to INSERT shelter_animals for their shelter
CREATE POLICY "Shelter employees can insert shelter animals"
ON public.shelter_animals
FOR INSERT
WITH CHECK (is_shelter_employee() AND user_id = get_employee_shelter_id(auth.uid()));

-- Allow shelter employees to UPDATE shelter_spaces for their shelter
CREATE POLICY "Shelter employees can update shelter spaces"
ON public.shelter_spaces
FOR UPDATE
USING (is_shelter_employee() AND shelter_user_id = get_employee_shelter_id(auth.uid()));
