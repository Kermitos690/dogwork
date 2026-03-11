
-- Create storage bucket for dog photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('dog-photos', 'dog-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload dog photos
CREATE POLICY "Users can upload dog photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'dog-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to update their own photos
CREATE POLICY "Users can update own dog photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'dog-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to delete their own photos
CREATE POLICY "Users can delete own dog photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'dog-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access to dog photos
CREATE POLICY "Public can view dog photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'dog-photos');
