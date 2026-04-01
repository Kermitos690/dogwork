
-- Add unique constraint on code if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_feature_catalog_code_key') THEN
    ALTER TABLE public.ai_feature_catalog ADD CONSTRAINT ai_feature_catalog_code_key UNIQUE (code);
  END IF;
END $$;

-- Update credit_ai_wallet to also allow monthly_grant from service_role (auth.uid() is null)
CREATE OR REPLACE FUNCTION public.credit_ai_wallet(
  _user_id uuid,
  _credits integer,
  _operation_type ai_ledger_type,
  _description text DEFAULT NULL,
  _stripe_payment_id text DEFAULT NULL,
  _public_price_chf numeric DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  w_id uuid;
  new_balance integer;
BEGIN
  -- Security: only allow refund/monthly_grant from non-admin callers
  -- purchase and bonus should only come from webhooks/admin edge functions (service_role bypasses: auth.uid() IS NULL)
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() AND _operation_type NOT IN ('refund', 'monthly_grant') THEN
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
    description, stripe_payment_id, public_price_chf, status
  )
  VALUES (
    _user_id, w_id, _operation_type, _credits, new_balance,
    _description, _stripe_payment_id, _public_price_chf, 'success'
  );

  RETURN new_balance;
END;
$$;
