-- Create a temporary function to fix data (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public._temp_fix_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  packs_fixed int := 0;
  urls_fixed int := 0;
BEGIN
  -- Fix ai_credit_packs cost estimates
  UPDATE ai_credit_packs SET cost_estimate_usd = 0.40, margin_estimate = 0.92 WHERE slug = 'decouverte';
  packs_fixed := packs_fixed + 1;
  UPDATE ai_credit_packs SET cost_estimate_usd = 0.75, margin_estimate = 0.90 WHERE slug = 'standard';
  packs_fixed := packs_fixed + 1;
  UPDATE ai_credit_packs SET cost_estimate_usd = 2.50, margin_estimate = 0.89 WHERE slug = 'premium';
  packs_fixed := packs_fixed + 1;

  -- Fix cover_image URLs: old instance → dynamic current instance  
  UPDATE exercises 
  SET cover_image = REPLACE(
    cover_image, 
    'hdmmqwpypvhwohhhaqnf.supabase.co',
    split_part(current_setting('pgrst.db_uri', true), '@', 2)
  )
  WHERE cover_image LIKE '%hdmmqwpypvhwohhhaqnf%';
  GET DIAGNOSTICS urls_fixed = ROW_COUNT;

  RETURN jsonb_build_object('packs_fixed', packs_fixed, 'urls_fixed', urls_fixed);
END;
$$;

-- Execute immediately
SELECT public._temp_fix_data();

-- Clean up
DROP FUNCTION public._temp_fix_data();