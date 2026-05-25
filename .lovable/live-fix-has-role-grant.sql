-- DogWork — Fix LIVE: restaure EXECUTE sur has_role pour authenticated
-- Contexte: la révocation antérieure cassait toutes les RLS appelant has_role
-- (notification_preferences, profiles, etc.) avec "permission denied for function has_role".
-- has_role est SECURITY DEFINER + search_path=public → re-grant sûr.
-- REVOKE volontairement omis sur is_admin/is_shelter/is_educator/is_shelter_employee
-- car de nombreuses policies utilisent roles={public} et casseraient pour anon.

BEGIN;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
COMMIT;

-- Vérification
SELECT has_function_privilege('authenticated', 'public.has_role(uuid, public.app_role)', 'EXECUTE') AS authenticated_can_execute;
