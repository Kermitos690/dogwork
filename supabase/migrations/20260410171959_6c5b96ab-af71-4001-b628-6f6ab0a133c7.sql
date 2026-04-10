
-- Fix double-encoded steps: stored as '"[...]"' (string) instead of '[...]' (array)
UPDATE exercises
SET steps = (steps #>> '{}')::jsonb
WHERE jsonb_typeof(steps) = 'string';

-- Fix double-encoded tutorial_steps
UPDATE exercises
SET tutorial_steps = (tutorial_steps #>> '{}')::jsonb
WHERE jsonb_typeof(tutorial_steps) = 'string';
