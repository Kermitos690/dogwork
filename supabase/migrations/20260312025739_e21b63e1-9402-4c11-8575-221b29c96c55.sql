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
  ORDER BY name
  LIMIT batch_limit
  OFFSET batch_offset;
$$;