ALTER TABLE public.dog_walks
  ADD COLUMN IF NOT EXISTS day_id integer,
  ADD COLUMN IF NOT EXISTS related_exercise_ids jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_dog_walks_user_day
  ON public.dog_walks (user_id, dog_id, day_id);