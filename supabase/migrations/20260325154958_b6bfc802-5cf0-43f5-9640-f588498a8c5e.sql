
-- Create a public storage bucket for shelter animal photos
INSERT INTO storage.buckets (id, name, public) VALUES ('shelter-photos', 'shelter-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for shelter-photos bucket
CREATE POLICY "Shelter users can upload animal photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'shelter-photos' AND (SELECT public.is_shelter()));

CREATE POLICY "Shelter users can update their photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'shelter-photos' AND (SELECT public.is_shelter()));

CREATE POLICY "Shelter users can delete their photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'shelter-photos' AND (SELECT public.is_shelter()));

CREATE POLICY "Anyone can view shelter photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'shelter-photos');
