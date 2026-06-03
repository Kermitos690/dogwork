-- =============================================================
-- PHASE B — L1 : GRANT EXECUTE sur has_role (LIVE uniquement)
-- =============================================================
-- Cible : projet LIVE hdmmqwpypvhwohhhaqnf
-- Idempotent. Aucune donnée touchée. Aucune RLS modifiée.
-- =============================================================

BEGIN;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;

COMMIT;

-- Vérification (à relancer depuis le SQL Runner après exécution) :
-- SELECT has_function_privilege('authenticated','public.has_role(uuid,app_role)','EXECUTE');
-- Attendu : true
