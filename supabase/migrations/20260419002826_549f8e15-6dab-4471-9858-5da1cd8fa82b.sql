-- Remove direct SELECT access on shelter_animals for employees and coaches
-- They must use shelter_animals_safe (which excludes adopter_email / adopter_name)
DROP POLICY IF EXISTS "Shelter employees can view shelter animals via safe view" ON public.shelter_animals;
DROP POLICY IF EXISTS "Coaches can view shelter animals" ON public.shelter_animals;

-- Allow authenticated users to read AI pricing config (non-sensitive display data)
CREATE POLICY "Authenticated users can read AI pricing config"
ON public.ai_pricing_config
FOR SELECT
TO authenticated
USING (true);