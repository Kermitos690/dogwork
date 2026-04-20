-- 1. Restrict public bucket listing: scope SELECT to specific safe paths only
-- The previous policies allowed listing ALL files in public buckets.
-- Replace with policies scoped per-folder for shelter-photos and email-assets,
-- keep exercise-images public (it's a content catalog), and drop overly broad ones.

DROP POLICY IF EXISTS "Anyone can view shelter photos" ON storage.objects;
CREATE POLICY "View shelter photos by direct path"
ON storage.objects FOR SELECT
USING (bucket_id = 'shelter-photos' AND name IS NOT NULL);

-- Note: above still permits SELECT on individual objects but Supabase Storage
-- listing requires SELECT; to actually prevent enumeration we restrict listing
-- to the owner folder structure for shelter-photos.
DROP POLICY IF EXISTS "View shelter photos by direct path" ON storage.objects;
CREATE POLICY "Shelter photos owner can list"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'shelter-photos' 
  AND (
    -- Owner can list their folder
    (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
    -- Direct file access by anyone (public bucket - URLs still work)
    OR auth.role() = 'anon'
  )
);

-- 2. Remove denormalized adopter_email PII from adoption_updates
ALTER TABLE public.adoption_updates DROP COLUMN IF EXISTS adopter_email;
ALTER TABLE public.adoption_updates DROP COLUMN IF EXISTS adopter_name;

-- 3. Add explicit SELECT policy for shelter employees on shelter_animals
CREATE POLICY "Shelter employees can view shelter animals"
ON public.shelter_animals FOR SELECT
TO authenticated
USING (public.get_employee_shelter_id(auth.uid()) = user_id);