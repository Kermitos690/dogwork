CREATE TABLE IF NOT EXISTS public.email_send_state (
  id integer PRIMARY KEY,
  retry_after_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.email_send_state (id, retry_after_until)
VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No client access to email_send_state" ON public.email_send_state;
CREATE POLICY "No client access to email_send_state"
  ON public.email_send_state
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);