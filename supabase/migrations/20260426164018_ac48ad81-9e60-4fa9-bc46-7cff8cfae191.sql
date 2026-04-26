CREATE TABLE IF NOT EXISTS public.marketplace_content_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NULL,
  educator_user_id uuid NOT NULL,
  context text NOT NULL DEFAULT 'description',
  status text NOT NULL DEFAULT 'clean',
  matches jsonb NOT NULL DEFAULT '[]'::jsonb,
  scanned_text_excerpt text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_scans_educator ON public.marketplace_content_scans(educator_user_id);
CREATE INDEX IF NOT EXISTS idx_content_scans_status ON public.marketplace_content_scans(status);
CREATE INDEX IF NOT EXISTS idx_content_scans_course ON public.marketplace_content_scans(course_id);

ALTER TABLE public.marketplace_content_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full content scans" ON public.marketplace_content_scans;
CREATE POLICY "Admin full content scans"
  ON public.marketplace_content_scans
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Educators read own scans" ON public.marketplace_content_scans;
CREATE POLICY "Educators read own scans"
  ON public.marketplace_content_scans
  FOR SELECT TO authenticated
  USING (educator_user_id = auth.uid());