DROP POLICY IF EXISTS "Anyone can submit a contact request" ON public.contact_requests;

CREATE POLICY "Anyone can submit a contact request"
ON public.contact_requests
FOR INSERT
WITH CHECK (
  admin_notes IS NULL
  AND status = 'new'
  AND (user_id IS NULL OR user_id = auth.uid())
);