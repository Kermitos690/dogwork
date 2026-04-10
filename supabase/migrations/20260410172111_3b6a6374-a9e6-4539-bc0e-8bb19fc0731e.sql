
-- Create function to recursively decode
CREATE OR REPLACE FUNCTION fix_double_encoded_jsonb(val jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb := val;
BEGIN
  WHILE jsonb_typeof(result) = 'string' LOOP
    result := (result #>> '{}')::jsonb;
  END LOOP;
  RETURN result;
END;
$$;

-- Apply to steps
UPDATE exercises SET steps = fix_double_encoded_jsonb(steps);

-- Apply to tutorial_steps
UPDATE exercises SET tutorial_steps = fix_double_encoded_jsonb(tutorial_steps);

-- Cleanup
DROP FUNCTION fix_double_encoded_jsonb(jsonb);
