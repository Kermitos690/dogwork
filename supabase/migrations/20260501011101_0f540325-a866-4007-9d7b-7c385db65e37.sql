-- Remove direct SELECT access on shelter_animals for shelter employees.
-- Employees must use the shelter_animals_safe view which excludes adopter PII.
DROP POLICY IF EXISTS "Shelter employees can view shelter animals" ON public.shelter_animals;
