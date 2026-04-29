-- 1. Bucket public brand-assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. RLS storage policies (chaque user gère son dossier {user_id}/...)
DROP POLICY IF EXISTS "brand_assets_public_read" ON storage.objects;
CREATE POLICY "brand_assets_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-assets');

DROP POLICY IF EXISTS "brand_assets_owner_insert" ON storage.objects;
CREATE POLICY "brand_assets_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'brand-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "brand_assets_owner_update" ON storage.objects;
CREATE POLICY "brand_assets_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'brand-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "brand_assets_owner_delete" ON storage.objects;
CREATE POLICY "brand_assets_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'brand-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3. Colonne avatar_url pour coach_profiles (logo cabinet / photo pro)
ALTER TABLE public.coach_profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 4. RPC pour redimensionner un compartiment refuge (uniquement le propriétaire)
CREATE OR REPLACE FUNCTION public.update_shelter_space_size(
  _space_id UUID,
  _width INTEGER,
  _height INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.shelter_spaces
     SET width = GREATEST(1, LEAST(8, _width)),
         height = GREATEST(1, LEAST(8, _height)),
         updated_at = now()
   WHERE id = _space_id
     AND shelter_user_id = auth.uid();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_shelter_space_size(UUID, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_shelter_space_size(UUID, INTEGER, INTEGER) TO authenticated;