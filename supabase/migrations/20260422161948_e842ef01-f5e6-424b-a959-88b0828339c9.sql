
-- 1. Ajouter les codes features pour les agents autonomes au catalogue
INSERT INTO public.ai_feature_catalog (code, label, description, credits_cost, model, is_active, cost_estimate_avg_usd, margin_target)
VALUES
  ('agent_behavior_analysis', 'Agent Comportement', 'Analyse autonome des 7 derniers jours de logs comportementaux et génère un rapport synthétique.', 6, 'google/gemini-2.5-flash', true, 0.005, 3.0),
  ('agent_progress_report', 'Agent Progression', 'Rapport hebdomadaire automatique sur la progression du chien (exercices, journées validées).', 6, 'google/gemini-2.5-flash', true, 0.005, 3.0),
  ('agent_plan_adjustment', 'Agent Ajustement Plan', 'Recommandations IA d''ajustement du plan d''entraînement basées sur les performances récentes.', 10, 'google/gemini-2.5-pro', true, 0.015, 3.0),
  ('agent_dog_insights', 'Agent Insights Chien', 'Synthèse globale du profil et des tendances long terme du chien.', 3, 'google/gemini-2.5-pro', true, 0.008, 3.0)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  credits_cost = EXCLUDED.credits_cost,
  model = EXCLUDED.model,
  is_active = true,
  updated_at = now();

-- 2. Table de préférences utilisateur pour les agents (opt-in par agent)
CREATE TABLE IF NOT EXISTS public.ai_agent_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_code text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  last_run_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, agent_code)
);

ALTER TABLE public.ai_agent_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own agent preferences"
  ON public.ai_agent_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin full access agent preferences"
  ON public.ai_agent_preferences
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE TRIGGER update_ai_agent_preferences_updated_at
  BEFORE UPDATE ON public.ai_agent_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_ai_agent_preferences_user ON public.ai_agent_preferences(user_id);
