
-- Add new detailed fields to exercises table for enrichment v2
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS voice_commands jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS body_positioning jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS troubleshooting jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS validation_protocol text DEFAULT '';

-- Create public storage bucket for exercise images
INSERT INTO storage.buckets (id, name, public) VALUES ('exercise-images', 'exercise-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to exercise images
CREATE POLICY "Public read exercise images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'exercise-images');

-- Allow admin insert
CREATE POLICY "Admin insert exercise images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'exercise-images' AND (SELECT public.is_admin()));

-- Allow admin delete
CREATE POLICY "Admin delete exercise images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'exercise-images' AND (SELECT public.is_admin()));

-- Update get_unenriched_exercises to also catch exercises without new v2 fields
CREATE OR REPLACE FUNCTION public.get_unenriched_exercises(batch_limit integer DEFAULT 2, batch_offset integer DEFAULT 0)
RETURNS SETOF exercises
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM exercises
  WHERE (description IS NULL OR length(description) <= 200)
     OR (tutorial_steps IS NULL OR tutorial_steps = '[]'::jsonb OR jsonb_array_length(tutorial_steps) < 4)
     OR (voice_commands IS NULL OR voice_commands = '[]'::jsonb)
     OR (troubleshooting IS NULL OR troubleshooting = '[]'::jsonb)
     OR (validation_protocol IS NULL OR validation_protocol = '')
  ORDER BY name
  LIMIT batch_limit
  OFFSET batch_offset;
$$;
