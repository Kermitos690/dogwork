
-- Second decode pass for steps
UPDATE exercises
SET steps = (steps #>> '{}')::jsonb
WHERE jsonb_typeof(steps) = 'string';

-- Second decode pass for tutorial_steps
UPDATE exercises
SET tutorial_steps = (tutorial_steps #>> '{}')::jsonb
WHERE jsonb_typeof(tutorial_steps) = 'string';
