-- Restore EXECUTE on has_role for authenticated users.
-- has_role is SECURITY DEFINER with fixed search_path; safe to expose to authenticated.
-- It is referenced by dozens of RLS policies; revoking it broke saves on tables
-- like notification_preferences whose policies call has_role(auth.uid(),'admin').
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;