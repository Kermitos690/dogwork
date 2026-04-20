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
  v_public_price_chf numeric(10,4);
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Accès non autorisé à debit_ai_credits';
  END IF;

  w_id := public.ensure_ai_wallet(_user_id);

  SELECT balance INTO current_balance
  FROM public.ai_credit_wallets
  WHERE id = w_id
  FOR UPDATE;

  v_public_price_chf := (
    COALESCE(
      (
        SELECT value
        FROM public.ai_pricing_config
        WHERE key IN ('credit_value_chf', 'chf_per_credit')
        ORDER BY CASE WHEN key = 'credit_value_chf' THEN 0 ELSE 1 END
        LIMIT 1
      ),
      0.05
    ) * _credits
  )::numeric(10,4);

  IF current_balance < _credits THEN
    INSERT INTO public.ai_credit_ledger (
      user_id,
      wallet_id,
      operation_type,
      credits_delta,
      balance_after,
      feature_code,
      status,
      metadata,
      public_price_chf
    )
    VALUES (
      _user_id,
      w_id,
      'consumption',
      -_credits,
      current_balance,
      _feature_code,
      'failed_insufficient',
      _metadata,
      v_public_price_chf
    );
    RETURN false;
  END IF;

  new_balance := current_balance - _credits;

  UPDATE public.ai_credit_wallets
  SET balance = new_balance,
      lifetime_consumed = lifetime_consumed + _credits
  WHERE id = w_id;

  INSERT INTO public.ai_credit_ledger (
    user_id,
    wallet_id,
    operation_type,
    credits_delta,
    balance_after,
    feature_code,
    provider_cost_usd,
    public_price_chf,
    status,
    metadata
  )
  VALUES (
    _user_id,
    w_id,
    'consumption',
    -_credits,
    new_balance,
    _feature_code,
    _provider_cost_usd,
    v_public_price_chf,
    'success',
    _metadata
  );

  RETURN true;
END;
$$;

UPDATE public.ai_credit_ledger l
SET public_price_chf = (
  COALESCE(
    (
      SELECT value
      FROM public.ai_pricing_config
      WHERE key IN ('credit_value_chf', 'chf_per_credit')
      ORDER BY CASE WHEN key = 'credit_value_chf' THEN 0 ELSE 1 END
      LIMIT 1
    ),
    0.05
  ) * ABS(l.credits_delta)
)::numeric(10,4)
WHERE l.operation_type = 'consumption'
  AND l.status = 'success'
  AND l.public_price_chf IS NULL;