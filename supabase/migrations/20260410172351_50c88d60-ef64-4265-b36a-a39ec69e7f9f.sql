
-- Create a function that fixes double-encoded JSON and returns count of fixed rows
CREATE OR REPLACE FUNCTION public.fix_exercise_json_encoding()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fixed_count integer := 0;
  rec record;
  new_steps jsonb;
  new_tutorial jsonb;
  needs_update boolean;
BEGIN
  FOR rec IN SELECT id, steps, tutorial_steps FROM exercises LOOP
    needs_update := false;
    new_steps := rec.steps;
    new_tutorial := rec.tutorial_steps;
    
    -- Fix steps: recursively decode strings
    IF rec.steps IS NOT NULL AND jsonb_typeof(rec.steps) = 'string' THEN
      BEGIN
        new_steps := rec.steps;
        WHILE jsonb_typeof(new_steps) = 'string' LOOP
          new_steps := (new_steps #>> '{}')::jsonb;
        END LOOP;
        needs_update := true;
      EXCEPTION WHEN OTHERS THEN
        new_steps := rec.steps;
      END;
    END IF;
    
    -- Fix tutorial_steps: recursively decode strings
    IF rec.tutorial_steps IS NOT NULL AND jsonb_typeof(rec.tutorial_steps) = 'string' THEN
      BEGIN
        new_tutorial := rec.tutorial_steps;
        WHILE jsonb_typeof(new_tutorial) = 'string' LOOP
          new_tutorial := (new_tutorial #>> '{}')::jsonb;
        END LOOP;
        needs_update := true;
      EXCEPTION WHEN OTHERS THEN
        new_tutorial := rec.tutorial_steps;
      END;
    END IF;
    
    IF needs_update THEN
      UPDATE exercises SET steps = new_steps, tutorial_steps = new_tutorial WHERE id = rec.id;
      fixed_count := fixed_count + 1;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object('fixed', fixed_count);
END;
$$;
