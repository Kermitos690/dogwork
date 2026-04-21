-- ─── Table ai_generated_documents ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_generated_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  dog_id uuid,
  feature_code text NOT NULL,
  document_type text NOT NULL,
  title text NOT NULL DEFAULT 'Document IA',
  summary text DEFAULT '',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  credits_spent integer NOT NULL DEFAULT 0,
  model_used text,
  is_archived boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_docs_user ON public.ai_generated_documents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_docs_type ON public.ai_generated_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_ai_docs_dog ON public.ai_generated_documents(dog_id) WHERE dog_id IS NOT NULL;

ALTER TABLE public.ai_generated_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own documents"
  ON public.ai_generated_documents FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin full access documents"
  ON public.ai_generated_documents FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE TRIGGER update_ai_docs_updated_at
  BEFORE UPDATE ON public.ai_generated_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ─── Mise à jour tarifaire des features IA (+85%) ─────────────────
-- Upsert pour chaque feature : INSERT si absent, UPDATE du coût sinon

INSERT INTO public.ai_feature_catalog (code, label, description, model, credits_cost, is_active)
VALUES
  ('ai_plan_generation', 'Plan d''entraînement IA', 'Génération d''un plan d''entraînement personnalisé sur mesure', 'google/gemini-2.5-pro', 10, true),
  ('ai_behavior_analysis', 'Analyse comportementale', 'Analyse approfondie du comportement et recommandations', 'google/gemini-2.5-flash', 6, true),
  ('ai_evaluation_scoring', 'Évaluation IA scoring', 'Scoring comportemental complet d''un chien', 'google/gemini-2.5-flash', 6, true),
  ('ai_adoption_plan', 'Plan post-adoption', 'Plan structuré pour les premières semaines après adoption', 'google/gemini-2.5-pro', 10, true),
  ('ai_progress_report', 'Rapport de progression', 'Rapport synthétique des progrès sur une période donnée', 'google/gemini-2.5-flash', 6, true),
  ('ai_image_generation', 'Génération d''image', 'Génération d''image illustrative', 'google/gemini-3.1-flash-image-preview', 4, true)
ON CONFLICT (code) DO UPDATE SET
  credits_cost = EXCLUDED.credits_cost,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  is_active = true,
  updated_at = now();