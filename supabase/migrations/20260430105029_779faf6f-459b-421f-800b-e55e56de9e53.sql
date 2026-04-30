
-- 1. AI credit packs : retirer la policy publique sur la table brute
DROP POLICY IF EXISTS "Public can read active credit packs" ON public.ai_credit_packs;

-- 2. AI feature catalog : idem
DROP POLICY IF EXISTS "Public can read active AI features" ON public.ai_feature_catalog;

-- 3. Public profile boosts : idem (la vue *_public existe déjà)
DROP POLICY IF EXISTS "Public can read active boosts (anonymized)" ON public.public_profile_boosts;

-- 4. shelter_animals : ne pas supprimer les colonnes Live utilisées par le flux adoption.
-- La PII adoptant reste protégée par shelter_animals_safe et les politiques RLS.

-- 5. shelter_employees : restreindre l'accès à la colonne hashed_pin
-- Révoquer l'accès colonne pour authenticated
REVOKE SELECT (hashed_pin) ON public.shelter_employees FROM authenticated;
REVOKE SELECT (hashed_pin) ON public.shelter_employees FROM anon;
-- Note: les Edge Functions utilisent service_role qui conserve l'accès complet.
