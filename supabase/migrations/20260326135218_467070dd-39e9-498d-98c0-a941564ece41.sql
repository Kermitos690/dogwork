
-- Fix messages UPDATE policy to only allow toggling 'read' field
DROP POLICY IF EXISTS "Recipients can update messages" ON public.messages;

CREATE POLICY "Recipients can mark messages as read"
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = recipient_id)
WITH CHECK (
  auth.uid() = recipient_id
  AND sender_id IS NOT DISTINCT FROM (SELECT m.sender_id FROM public.messages m WHERE m.id = messages.id)
  AND content IS NOT DISTINCT FROM (SELECT m.content FROM public.messages m WHERE m.id = messages.id)
);
