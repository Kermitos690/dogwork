
-- Allow shelter employees to read animals from their shelter
CREATE POLICY "Shelter employees can view shelter animals"
ON public.shelter_animals FOR SELECT TO authenticated
USING (
  is_shelter_employee() AND user_id = get_employee_shelter_id(auth.uid())
);

-- Allow shelter employees to read activity logs from their shelter
CREATE POLICY "Shelter employees can view shelter activity"
ON public.shelter_activity_log FOR SELECT TO authenticated
USING (
  is_shelter_employee() AND shelter_user_id = get_employee_shelter_id(auth.uid())
);

-- Allow shelter employees to insert activity logs for their shelter
CREATE POLICY "Shelter employees can insert activity logs"
ON public.shelter_activity_log FOR INSERT TO authenticated
WITH CHECK (
  is_shelter_employee() AND shelter_user_id = get_employee_shelter_id(auth.uid())
);

-- Allow shelter employees to read shelter profile
CREATE POLICY "Shelter employees can view shelter profile"
ON public.shelter_profiles FOR SELECT TO authenticated
USING (
  is_shelter_employee() AND user_id = get_employee_shelter_id(auth.uid())
);

-- Allow shelter employees to read shelter spaces
CREATE POLICY "Shelter employees can view shelter spaces"
ON public.shelter_spaces FOR SELECT TO authenticated
USING (
  is_shelter_employee() AND shelter_user_id = get_employee_shelter_id(auth.uid())
);

-- Allow shelter employees to read observations
CREATE POLICY "Shelter employees can view observations"
ON public.shelter_observations FOR SELECT TO authenticated
USING (
  is_shelter_employee() AND EXISTS (
    SELECT 1 FROM shelter_animals
    WHERE shelter_animals.id = shelter_observations.animal_id
    AND shelter_animals.user_id = get_employee_shelter_id(auth.uid())
  )
);

-- Allow shelter employees to insert observations
CREATE POLICY "Shelter employees can insert observations"
ON public.shelter_observations FOR INSERT TO authenticated
WITH CHECK (
  is_shelter_employee() AND auth.uid() = author_id
);

-- Shelter employees can view own employee record
CREATE POLICY "Shelter employees can view own record"
ON public.shelter_employees FOR SELECT TO authenticated
USING (
  is_shelter_employee() AND auth_user_id = auth.uid()
);
