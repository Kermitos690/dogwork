-- ─── Système 3 zones (vert/orange/rouge) — colonnes zone_state ───
-- Convention : 'green' (1-2 tension), 'orange' (3-4), 'red' (5+).
-- Auto-déduit par trigger si NULL, override manuel possible.

-- Type enum sécurisé
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'behavior_zone') THEN
    CREATE TYPE public.behavior_zone AS ENUM ('green', 'orange', 'red');
  END IF;
END$$;

-- Ajout colonnes
ALTER TABLE public.behavior_logs
  ADD COLUMN IF NOT EXISTS zone_state public.behavior_zone;

ALTER TABLE public.exercise_sessions
  ADD COLUMN IF NOT EXISTS zone_state public.behavior_zone;

-- Fonction de déduction depuis tension_level (1-2 vert, 3-4 orange, 5+ rouge)
CREATE OR REPLACE FUNCTION public.derive_behavior_zone(_tension integer)
RETURNS public.behavior_zone
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _tension IS NULL THEN NULL
    WHEN _tension <= 2 THEN 'green'::public.behavior_zone
    WHEN _tension <= 4 THEN 'orange'::public.behavior_zone
    ELSE 'red'::public.behavior_zone
  END;
$$;

-- Trigger : auto-remplir zone_state si non fourni explicitement (override manuel respecté)
CREATE OR REPLACE FUNCTION public.auto_set_behavior_zone()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.zone_state IS NULL AND NEW.tension_level IS NOT NULL THEN
    NEW.zone_state := public.derive_behavior_zone(NEW.tension_level);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_zone_behavior_logs ON public.behavior_logs;
CREATE TRIGGER trg_auto_zone_behavior_logs
  BEFORE INSERT OR UPDATE ON public.behavior_logs
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_behavior_zone();

-- Backfill : remplir zone_state pour les lignes existantes
UPDATE public.behavior_logs
SET zone_state = public.derive_behavior_zone(tension_level)
WHERE zone_state IS NULL AND tension_level IS NOT NULL;

-- Index pour l'agrégation stats
CREATE INDEX IF NOT EXISTS idx_behavior_logs_dog_zone ON public.behavior_logs(dog_id, zone_state);
CREATE INDEX IF NOT EXISTS idx_exercise_sessions_dog_zone ON public.exercise_sessions(dog_id, zone_state);

COMMENT ON COLUMN public.behavior_logs.zone_state IS 'Zone comportementale (vert/orange/rouge) — auto-déduite depuis tension_level si NULL, override manuel possible.';
COMMENT ON COLUMN public.exercise_sessions.zone_state IS 'Zone comportementale observée pendant l''exercice — saisie manuelle par l''utilisateur en fin de session.';