
-- Étendre les triggers pour couvrir INSERT OR UPDATE sur dog_evaluations
DROP TRIGGER IF EXISTS enforce_evaluation_tier_trigger ON public.dog_evaluations;
CREATE TRIGGER enforce_evaluation_tier_trigger
  BEFORE INSERT OR UPDATE ON public.dog_evaluations
  FOR EACH ROW EXECUTE FUNCTION enforce_evaluation_tier();
