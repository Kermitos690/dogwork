-- Fix: grant EXECUTE on has_role(uuid, app_role) to authenticated.
-- Root cause: function existed as SECURITY DEFINER but lacked GRANT EXECUTE
-- to the `authenticated` role, so any RLS policy or client RPC calling it
-- from an authenticated session returned "permission denied for function has_role".
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Safety net: re-affirm grants on related role helpers (idempotent).
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_educator() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_shelter() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_shelter_employee() TO authenticated;