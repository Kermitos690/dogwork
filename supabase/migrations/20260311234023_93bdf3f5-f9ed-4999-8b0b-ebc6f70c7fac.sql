-- Delete the self-referencing client_link
DELETE FROM public.client_links WHERE coach_user_id = client_user_id;

-- Add constraint to prevent self-links in the future
ALTER TABLE public.client_links ADD CONSTRAINT no_self_link CHECK (coach_user_id != client_user_id);