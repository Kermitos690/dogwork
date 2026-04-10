-- Temporarily disable RLS to allow data fix
ALTER TABLE ai_credit_packs DISABLE ROW LEVEL SECURITY;

UPDATE ai_credit_packs SET cost_estimate_usd = 0.4000, margin_estimate = 0.92 WHERE slug = 'decouverte';
UPDATE ai_credit_packs SET cost_estimate_usd = 0.7500, margin_estimate = 0.90 WHERE slug = 'standard';
UPDATE ai_credit_packs SET cost_estimate_usd = 2.5000, margin_estimate = 0.89 WHERE slug = 'premium';

-- Re-enable RLS
ALTER TABLE ai_credit_packs ENABLE ROW LEVEL SECURITY;