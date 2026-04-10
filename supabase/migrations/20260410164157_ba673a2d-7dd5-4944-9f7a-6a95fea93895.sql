-- Add unique constraint on slug for ai_credit_packs to enable upserts
ALTER TABLE ai_credit_packs ADD CONSTRAINT ai_credit_packs_slug_unique UNIQUE (slug);

-- Fix ai_credit_packs cost estimates (were NULL)
UPDATE ai_credit_packs SET cost_estimate_usd = 0.40, margin_estimate = 0.92 WHERE slug = 'decouverte';
UPDATE ai_credit_packs SET cost_estimate_usd = 0.75, margin_estimate = 0.90 WHERE slug = 'standard';
UPDATE ai_credit_packs SET cost_estimate_usd = 2.50, margin_estimate = 0.89 WHERE slug = 'premium';

-- Fix exercise cover_image URLs pointing to old Supabase instance
-- The images exist in the current instance's storage bucket but URLs reference an old project
UPDATE exercises 
SET cover_image = regexp_replace(
  cover_image, 
  'https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/exercise-images/',
  (SELECT current_setting('app.settings.supabase_url', true) || '/storage/v1/object/public/exercise-images/')
)
WHERE cover_image LIKE '%supabase.co/storage/v1/object/public/exercise-images/%'
  AND cover_image NOT LIKE '%' || split_part(current_setting('app.settings.supabase_url', true), '/', 3) || '%';