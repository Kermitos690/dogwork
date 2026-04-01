
-- Secure debit_ai_credits: only callable from service_role (edge functions)
-- Regular authenticated users must never call this directly
CREATE OR REPLACE FUNCTION public.debit_ai_credits(
  _user_id uuid,
  _feature_code text,
  _credits integer,
  _provider_cost_usd numeric DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  w_id uuid;
  current_balance integer;
  new_balance integer;
BEGIN
  -- Security: only service_role (auth.uid() IS NULL) or admin can debit
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Accès non autorisé à debit_ai_credits';
  END IF;

  w_id := public.ensure_ai_wallet(_user_id);

  SELECT balance INTO current_balance
  FROM public.ai_credit_wallets
  WHERE id = w_id
  FOR UPDATE;

  IF current_balance < _credits THEN
    INSERT INTO public.ai_credit_ledger (user_id, wallet_id, operation_type, credits_delta, balance_after, feature_code, status, metadata)
    VALUES (_user_id, w_id, 'consumption', -_credits, current_balance, _feature_code, 'failed_insufficient', _metadata);
    RETURN false;
  END IF;

  new_balance := current_balance - _credits;

  UPDATE public.ai_credit_wallets
  SET balance = new_balance, lifetime_consumed = lifetime_consumed + _credits
  WHERE id = w_id;

  INSERT INTO public.ai_credit_ledger (
    user_id, wallet_id, operation_type, credits_delta, balance_after,
    feature_code, provider_cost_usd, status, metadata
  )
  VALUES (
    _user_id, w_id, 'consumption', -_credits, new_balance,
    _feature_code, _provider_cost_usd, 'success', _metadata
  );

  RETURN true;
END;
$$;

-- GIN index on metadata for efficient containment queries (monthly grant idempotency)
CREATE INDEX IF NOT EXISTS idx_ai_credit_ledger_metadata ON public.ai_credit_ledger USING gin (metadata jsonb_path_ops);
