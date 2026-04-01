
-- 1. Add _metadata parameter to credit_ai_wallet
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
SET search_path TO 'public'
AS $$
DECLARE
  w_id uuid;
  new_balance integer;
BEGIN
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
    description, stripe_payment_id, public_price_chf, status, metadata
  )
  VALUES (
    _user_id, w_id, _operation_type, _credits, new_balance,
    _description, _stripe_payment_id, _public_price_chf, 'success', _metadata
  );

  RETURN new_balance;
END;
$$;

-- 2. Clean up duplicate April 2026 grants (keep only the first per user)
DELETE FROM public.ai_credit_ledger
WHERE id IN (
  SELECT id FROM (
    SELECT id, user_id, created_at,
      ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) as rn
    FROM public.ai_credit_ledger
    WHERE operation_type = 'monthly_grant'
      AND metadata @> '{"period_key":"2026-04"}'::jsonb
  ) sub
  WHERE sub.rn > 1
);

-- 3. Fix wallet balances to undo the double-grant (subtract 100 per affected user)
UPDATE public.ai_credit_wallets
SET balance = balance - 100,
    lifetime_purchased = lifetime_purchased - 100
WHERE user_id IN (
  SELECT DISTINCT user_id FROM public.ai_credit_ledger
  WHERE operation_type = 'monthly_grant'
    AND metadata @> '{"period_key":"2026-04"}'::jsonb
);
