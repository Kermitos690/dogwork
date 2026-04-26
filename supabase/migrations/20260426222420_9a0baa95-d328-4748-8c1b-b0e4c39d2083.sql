-- Aligner le coût du générateur de plan IA sur ce qui est annoncé sur la landing (5 crédits)
UPDATE public.ai_feature_catalog
SET credits_cost = 5,
    updated_at = now()
WHERE code = 'plan_generator'
  AND credits_cost <> 5;