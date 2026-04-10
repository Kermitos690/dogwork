-- Debug: check what slugs actually exist
DO $$
DECLARE
  r RECORD;
  cnt int;
BEGIN
  FOR r IN SELECT id, slug, cost_estimate_usd FROM ai_credit_packs ORDER BY sort_order LOOP
    RAISE NOTICE 'Pack: id=% slug=% cost=%', r.id, r.slug, r.cost_estimate_usd;
  END LOOP;
  
  -- Direct update by id pattern
  UPDATE ai_credit_packs SET cost_estimate_usd = 0.4000, margin_estimate = 0.92 WHERE slug = 'decouverte';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  RAISE NOTICE 'Updated decouverte: % rows', cnt;
  
  UPDATE ai_credit_packs SET cost_estimate_usd = 0.7500, margin_estimate = 0.90 WHERE slug = 'standard';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  RAISE NOTICE 'Updated standard: % rows', cnt;
  
  UPDATE ai_credit_packs SET cost_estimate_usd = 2.5000, margin_estimate = 0.89 WHERE slug = 'premium';
  GET DIAGNOSTICS cnt = ROW_COUNT;
  RAISE NOTICE 'Updated premium: % rows', cnt;
END $$;