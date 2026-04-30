
-- Suppression effective de la policy publique
DROP POLICY IF EXISTS "Public can read active boosts (anonymized)" ON public.public_profile_boosts;

-- Vérification : lister policies restantes
DO $$
DECLARE
  cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM pg_policy
  WHERE polrelid = 'public.public_profile_boosts'::regclass
    AND polname = 'Public can read active boosts (anonymized)';
  IF cnt > 0 THEN
    RAISE EXCEPTION 'Policy still exists, drop failed';
  END IF;
END $$;
