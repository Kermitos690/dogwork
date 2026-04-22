
COMMENT ON COLUMN public.shelter_animals.adopter_email IS
  'PII — application code MUST query public.shelter_animals_safe for non-owner roles. Employees should never select this column from the base table.';
COMMENT ON COLUMN public.shelter_animals.adopter_name IS
  'PII — application code MUST query public.shelter_animals_safe for non-owner roles.';

-- Tighten storage object listing on public buckets.
DROP POLICY IF EXISTS "Email assets list admin only" ON storage.objects;
CREATE POLICY "Email assets list admin only"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'email-assets' AND is_admin());

DROP POLICY IF EXISTS "Exercise images list admin only" ON storage.objects;
CREATE POLICY "Exercise images list admin only"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'exercise-images' AND is_admin());

DROP POLICY IF EXISTS "Shelter photos owner can list" ON storage.objects;
CREATE POLICY "Shelter photos owner can list"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'shelter-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );
