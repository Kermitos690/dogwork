-- Re-apply has_role EXECUTE grant (previous migration did not propagate to Live).
-- Without this, every authenticated query on tables whose RLS uses has_role()
-- (e.g. notification_preferences) fails with "permission denied for function has_role".
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_educator() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_shelter() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_shelter_employee() TO authenticated, anon;