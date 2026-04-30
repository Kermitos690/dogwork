
-- 1. AI_FEATURE_CATALOG
DROP POLICY IF EXISTS "Public can read active AI features" ON public.ai_feature_catalog;
DROP POLICY IF EXISTS "Anyone can read active AI features" ON public.ai_feature_catalog;
DROP POLICY IF EXISTS "Authenticated can read AI features" ON public.ai_feature_catalog;
DROP POLICY IF EXISTS "Admins read full AI feature catalog" ON public.ai_feature_catalog;

CREATE POLICY "Admins read full AI feature catalog"
ON public.ai_feature_catalog FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP VIEW IF EXISTS public.ai_feature_catalog_public CASCADE;
CREATE VIEW public.ai_feature_catalog_public
WITH (security_invoker = on) AS
SELECT id, code, label, description, model, credits_cost, is_active
FROM public.ai_feature_catalog WHERE is_active = true;
GRANT SELECT ON public.ai_feature_catalog_public TO anon, authenticated;

-- 2. AI_CREDIT_PACKS
DROP POLICY IF EXISTS "Public can read active credit packs" ON public.ai_credit_packs;
DROP POLICY IF EXISTS "Anyone can read active credit packs" ON public.ai_credit_packs;
DROP POLICY IF EXISTS "Admins read full credit packs" ON public.ai_credit_packs;

CREATE POLICY "Admins read full credit packs"
ON public.ai_credit_packs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP VIEW IF EXISTS public.ai_credit_packs_public CASCADE;
CREATE VIEW public.ai_credit_packs_public
WITH (security_invoker = on) AS
SELECT id, slug, label, description, credits, price_chf,
       stripe_price_id, stripe_product_id, sort_order, is_active
FROM public.ai_credit_packs WHERE is_active = true;
GRANT SELECT ON public.ai_credit_packs_public TO anon, authenticated;

-- 3. PUBLIC_PROFILE_BOOSTS
DROP POLICY IF EXISTS "Public can read active boosts (anonymized)" ON public.public_profile_boosts;
DROP POLICY IF EXISTS "Public reads anonymized boosts" ON public.public_profile_boosts;
DROP POLICY IF EXISTS "Owner reads own boosts" ON public.public_profile_boosts;

CREATE POLICY "Owner reads own boosts"
ON public.public_profile_boosts FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP VIEW IF EXISTS public.public_profile_boosts_public CASCADE;
CREATE VIEW public.public_profile_boosts_public
WITH (security_invoker = on) AS
SELECT id, profile_kind, boost_type, starts_at, expires_at
FROM public.public_profile_boosts WHERE expires_at > now();
GRANT SELECT ON public.public_profile_boosts_public TO anon, authenticated;

-- 4. ALIGNEMENT CATALOGUE IA
INSERT INTO public.ai_feature_catalog (code, label, description, credits_cost, is_active) VALUES
  ('agent_behavior_analysis', 'Agent analyse comportementale', 'Code agent autonome de compatibilité', 3, true),
  ('agent_dog_insights',      'Agent insights chien',          'Code agent autonome de compatibilité', 3, true),
  ('agent_plan_adjustment',   'Agent ajustement du plan',      'Code agent autonome de compatibilité', 3, true),
  ('agent_progress_report',   'Agent rapport de progression',  'Code agent autonome de compatibilité', 2, true),
  ('ai_adoption_plan',        'Plan post-adoption',            'Alias de compatibilité', 10, true),
  ('ai_behavior_analysis',    'Analyse comportementale',       'Alias de compatibilité', 3, true),
  ('ai_evaluation_scoring',   'Évaluation IA scoring',         'Alias de compatibilité', 3, true),
  ('ai_image_generation',     'Génération d''image',           'Alias de compatibilité', 5, true),
  ('ai_plan_generation',      'Plan d''entraînement',          'Alias de compatibilité', 3, true),
  ('ai_progress_report',      'Rapport de progression',        'Alias de compatibilité', 2, true),
  ('boost_badge_video',       'Badge enrichi + vidéo (30 j)',  NULL, 40, true),
  ('boost_banner_gallery',    'Bannière + galerie (30 j)',     NULL, 30, true),
  ('boost_directory_featured','Mise en avant annuaire (30 j)', NULL, 50, true)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  description = COALESCE(EXCLUDED.description, public.ai_feature_catalog.description),
  credits_cost = EXCLUDED.credits_cost,
  is_active = EXCLUDED.is_active,
  updated_at = now();

UPDATE public.ai_feature_catalog SET credits_cost = 5, is_active = true, updated_at = now() WHERE code = 'plan_generator';
UPDATE public.ai_feature_catalog SET is_active = true, updated_at = now() WHERE code IN ('connection_guide','exercise_enrich','record_enrichment');
