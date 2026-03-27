-- P0-3: Fix shelter employee policies from public to authenticated

-- shelter_animals: 3 policies
ALTER POLICY "Shelter employees can delete shelter animals" ON public.shelter_animals TO authenticated;
ALTER POLICY "Shelter employees can insert shelter animals" ON public.shelter_animals TO authenticated;
ALTER POLICY "Shelter employees can update shelter animals" ON public.shelter_animals TO authenticated;

-- shelter_spaces: 1 policy
ALTER POLICY "Shelter employees can update shelter spaces" ON public.shelter_spaces TO authenticated;