CREATE OR REPLACE FUNCTION public.sync_exercise_stats()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'total_exercises', COUNT(*),
    'with_cover_image', COUNT(NULLIF(cover_image, '')),
    'without_cover_image', COUNT(*) - COUNT(NULLIF(cover_image, '')),
    'with_description', COUNT(NULLIF(description, '')),
    'with_short_instruction', COUNT(NULLIF(short_instruction, '')),
    'with_tutorial_steps', COUNT(CASE WHEN jsonb_typeof(tutorial_steps) = 'array' AND jsonb_array_length(tutorial_steps) >= 1 THEN 1 END),
    'fully_enriched', COUNT(CASE WHEN NULLIF(description,'') IS NOT NULL AND NULLIF(cover_image,'') IS NOT NULL AND jsonb_typeof(tutorial_steps) = 'array' AND jsonb_array_length(tutorial_steps) >= 4 AND NULLIF(objective,'') IS NOT NULL THEN 1 END)
  )
  FROM exercises;
$$;