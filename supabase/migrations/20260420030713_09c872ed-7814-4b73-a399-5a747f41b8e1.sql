-- Restrict bulk listing of public buckets to admins only.
-- Direct file access via public URL still works (CDN-level, doesn't query objects table).

DROP POLICY IF EXISTS "Email assets are publicly accessible" ON storage.objects;
CREATE POLICY "Email assets list admin only"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'email-assets'
  AND (auth.role() = 'anon' OR public.is_admin())
);

DROP POLICY IF EXISTS "Public read exercise images" ON storage.objects;
CREATE POLICY "Exercise images list admin only"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'exercise-images'
  AND (auth.role() = 'anon' OR public.is_admin())
);