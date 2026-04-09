
-- 1. Drop and recreate views with correct columns
DROP VIEW IF EXISTS public.ai_feature_catalog_public;
CREATE VIEW public.ai_feature_catalog_public
WITH (security_invoker = on) AS
SELECT code, label, description, credits_cost, is_active, model
FROM public.ai_feature_catalog
WHERE is_active = true;

DROP VIEW IF EXISTS public.ai_credit_packs_public;
CREATE VIEW public.ai_credit_packs_public
WITH (security_invoker = on) AS
SELECT id, slug, label, description, credits, price_chf, is_active, sort_order
FROM public.ai_credit_packs
WHERE is_active = true;

GRANT SELECT ON public.ai_feature_catalog_public TO authenticated, anon;
GRANT SELECT ON public.ai_credit_packs_public TO authenticated, anon;

-- 2. Fix credit_ai_wallet security hole
CREATE OR REPLACE FUNCTION public.credit_ai_wallet(
  _user_id uuid,
  _credits integer,
  _operation_type ai_ledger_type,
  _description text DEFAULT NULL,
  _stripe_payment_id text DEFAULT NULL,
  _public_price_chf numeric DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w_id uuid;
  new_balance integer;
BEGIN
  -- SECURITY: Only service_role (auth.uid() IS NULL) or admin can credit wallets
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Accès non autorisé à credit_ai_wallet';
  END IF;

  w_id := public.ensure_ai_wallet(_user_id);

  UPDATE public.ai_credit_wallets
  SET balance = balance + _credits,
      lifetime_purchased = CASE WHEN _operation_type IN ('purchase', 'monthly_grant') THEN lifetime_purchased + _credits ELSE lifetime_purchased END,
      lifetime_refunded = CASE WHEN _operation_type = 'refund' THEN lifetime_refunded + _credits ELSE lifetime_refunded END
  WHERE id = w_id
  RETURNING balance INTO new_balance;

  INSERT INTO public.ai_credit_ledger (
    user_id, wallet_id, operation_type, credits_delta, balance_after,
    description, stripe_payment_id, public_price_chf, status, metadata
  )
  VALUES (
    _user_id, w_id, _operation_type, _credits, new_balance,
    _description, _stripe_payment_id, _public_price_chf, 'success', _metadata
  );

  RETURN new_balance;
END;
$$;

-- 3. Revoke PUBLIC execute on sensitive financial RPCs
REVOKE EXECUTE ON FUNCTION public.debit_ai_credits(uuid, text, integer, numeric, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.credit_ai_wallet(uuid, integer, ai_ledger_type, text, text, numeric, jsonb) FROM PUBLIC;

-- Keep ensure_ai_wallet and get_ai_balance callable by authenticated users
REVOKE EXECUTE ON FUNCTION public.ensure_ai_wallet(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_ai_wallet(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_ai_balance(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ai_balance(uuid) TO authenticated;
