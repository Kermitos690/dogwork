ALTER TABLE public.dog_walk_points
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS event_label text;
CREATE INDEX IF NOT EXISTS dog_walk_points_walk_event_idx
  ON public.dog_walk_points (walk_id, event_type)
  WHERE event_type IS NOT NULL;