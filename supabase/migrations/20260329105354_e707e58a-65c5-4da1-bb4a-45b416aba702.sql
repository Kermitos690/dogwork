
CREATE TABLE public.image_generation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  exercise_slug text NOT NULL,
  exercise_name text NOT NULL,
  exercise_objective text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.image_generation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage image queue"
ON public.image_generation_queue
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_image_queue_status ON public.image_generation_queue(status);
