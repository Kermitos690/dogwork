
-- Fix AI chatbot: switch overloaded model
UPDATE ai_feature_catalog SET model = 'google/gemini-3-flash-preview' WHERE code = 'chat_general' AND model = 'google/gemini-2.5-flash';

-- ============================================================
-- ADMIN CREDIT VIEWS
-- ============================================================

CREATE OR REPLACE VIEW public.v_credit_orders_admin AS
SELECT
  l.id,
  l.created_at,
  l.user_id,
  p.display_name AS user_name,
  l.credits_delta AS credits,
  l.public_price_chf AS amount_chf,
  l.stripe_payment_id,
  l.status,
  l.description,
  l.operation_type,
  l.feature_code
FROM ai_credit_ledger l
LEFT JOIN profiles p ON p.user_id = l.user_id
WHERE l.operation_type = 'purchase'
ORDER BY l.created_at DESC;

CREATE OR REPLACE VIEW public.v_credit_kpis AS
SELECT
  COUNT(*) FILTER (WHERE operation_type = 'purchase') AS total_orders,
  COUNT(*) FILTER (WHERE operation_type = 'purchase' AND status = 'success') AS total_credited,
  COALESCE(SUM(credits_delta) FILTER (WHERE operation_type = 'purchase' AND status = 'success'), 0) AS total_credits_sold,
  COALESCE(SUM(public_price_chf) FILTER (WHERE operation_type = 'purchase' AND status = 'success'), 0)::numeric AS revenue_chf,
  CASE 
    WHEN COUNT(*) FILTER (WHERE operation_type = 'purchase' AND status = 'success') > 0
    THEN ROUND(SUM(public_price_chf) FILTER (WHERE operation_type = 'purchase' AND status = 'success')::numeric / COUNT(*) FILTER (WHERE operation_type = 'purchase' AND status = 'success'), 2)
    ELSE 0
  END AS avg_basket_chf,
  COUNT(DISTINCT user_id) FILTER (WHERE operation_type = 'purchase' AND status = 'success') AS unique_buyers
FROM ai_credit_ledger;

CREATE OR REPLACE VIEW public.v_credit_orders_daily AS
SELECT
  (created_at AT TIME ZONE 'Europe/Zurich')::date AS day,
  COUNT(*) FILTER (WHERE operation_type = 'purchase') AS orders,
  COUNT(*) FILTER (WHERE operation_type = 'purchase' AND status = 'success') AS credited,
  COALESCE(SUM(credits_delta) FILTER (WHERE operation_type = 'purchase' AND status = 'success'), 0) AS credits_sold,
  COALESCE(SUM(public_price_chf) FILTER (WHERE operation_type = 'purchase' AND status = 'success'), 0)::numeric AS daily_revenue
FROM ai_credit_ledger
GROUP BY 1
ORDER BY 1 DESC;

-- ============================================================
-- USER WALLET VIEWS (filtered by auth.uid())
-- ============================================================

CREATE OR REPLACE VIEW public.v_my_wallet_summary AS
SELECT
  w.balance,
  w.lifetime_purchased AS total_in,
  w.lifetime_consumed AS total_out,
  w.lifetime_refunded AS total_refunded,
  w.updated_at AS last_activity
FROM ai_credit_wallets w
WHERE w.user_id = auth.uid();

CREATE OR REPLACE VIEW public.v_my_credit_orders AS
SELECT
  l.id,
  l.created_at,
  l.credits_delta AS credits,
  l.public_price_chf AS amount_chf,
  l.stripe_payment_id,
  l.status,
  l.description
FROM ai_credit_ledger l
WHERE l.user_id = auth.uid()
  AND l.operation_type = 'purchase'
ORDER BY l.created_at DESC;

CREATE OR REPLACE VIEW public.v_my_wallet_daily_activity AS
SELECT
  (l.created_at AT TIME ZONE 'Europe/Zurich')::date AS day,
  COALESCE(SUM(l.credits_delta) FILTER (WHERE l.credits_delta > 0), 0) AS credits_in,
  COALESCE(ABS(SUM(l.credits_delta) FILTER (WHERE l.credits_delta < 0)), 0) AS credits_out,
  COUNT(*) AS operations
FROM ai_credit_ledger l
WHERE l.user_id = auth.uid()
GROUP BY 1
ORDER BY 1 DESC;

-- ============================================================
-- SHELTER SPACE VIEWS
-- ============================================================

CREATE OR REPLACE VIEW public.v_shelter_spaces_grid AS
SELECT
  s.id,
  s.shelter_user_id,
  s.name,
  s.space_type,
  s.capacity,
  s.current_animal_id,
  s.position_x,
  s.position_y,
  s.width,
  s.height,
  s.color,
  s.notes,
  a.name AS animal_name,
  a.species AS animal_species,
  a.breed AS animal_breed,
  a.status AS animal_status
FROM shelter_spaces s
LEFT JOIN shelter_animals a ON a.id = s.current_animal_id
WHERE s.shelter_user_id = auth.uid()
ORDER BY s.position_y, s.position_x, s.name;

CREATE OR REPLACE VIEW public.v_shelter_spaces_occupancy AS
SELECT
  s.shelter_user_id,
  s.space_type,
  COUNT(*) AS total,
  COUNT(s.current_animal_id) AS occupied,
  COUNT(*) - COUNT(s.current_animal_id) AS free,
  ROUND(COUNT(s.current_animal_id)::numeric / GREATEST(COUNT(*), 1) * 100) AS occupancy_pct
FROM shelter_spaces s
WHERE s.shelter_user_id = auth.uid()
GROUP BY s.shelter_user_id, s.space_type
ORDER BY s.space_type;

CREATE OR REPLACE VIEW public.v_shelter_spaces_stats AS
SELECT
  COUNT(*) AS total_spaces,
  COUNT(s.current_animal_id) AS occupied_spaces,
  COUNT(*) - COUNT(s.current_animal_id) AS free_spaces,
  ROUND(COUNT(s.current_animal_id)::numeric / GREATEST(COUNT(*), 1) * 100) AS occupancy_pct,
  SUM(s.capacity) AS total_capacity,
  COUNT(DISTINCT s.space_type) AS space_types
FROM shelter_spaces s
WHERE s.shelter_user_id = auth.uid();

-- ============================================================
-- SHELTER SPACE RPC FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.assign_animal_to_shelter_space(
  _space_id uuid,
  _animal_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _shelter_id uuid;
BEGIN
  SELECT shelter_user_id INTO _shelter_id FROM shelter_spaces WHERE id = _space_id;
  IF _shelter_id IS NULL OR (_shelter_id != auth.uid() AND NOT is_admin()) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  
  UPDATE shelter_spaces SET current_animal_id = NULL, updated_at = now()
  WHERE shelter_user_id = _shelter_id AND current_animal_id = _animal_id AND id != _space_id;
  
  UPDATE shelter_spaces SET current_animal_id = _animal_id, updated_at = now()
  WHERE id = _space_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.end_shelter_space_assignment(_space_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _shelter_id uuid;
BEGIN
  SELECT shelter_user_id INTO _shelter_id FROM shelter_spaces WHERE id = _space_id;
  IF _shelter_id IS NULL OR (_shelter_id != auth.uid() AND NOT is_admin()) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  
  UPDATE shelter_spaces SET current_animal_id = NULL, updated_at = now()
  WHERE id = _space_id;
END;
$$;
