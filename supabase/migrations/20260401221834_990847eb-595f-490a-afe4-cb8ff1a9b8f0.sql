
-- Harden ensure_ai_wallet: atomic + restricted caller
CREATE OR REPLACE FUNCTION public.ensure_ai_wallet(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  w_id uuid;
  bonus integer;
  inserted boolean := false;
BEGIN
  -- Security: only the user themselves or service_role/admin can create a wallet
  IF auth.uid() IS NOT NULL AND auth.uid() != _user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Accès non autorisé : vous ne pouvez créer un wallet que pour vous-même';
  END IF;

  -- Atomic upsert: INSERT ... ON CONFLICT prevents race conditions
  -- If wallet already exists, this is a no-op returning the existing id
  SELECT COALESCE(value, 10)::integer INTO bonus FROM public.ai_pricing_config WHERE key = 'welcome_bonus_credits';

  INSERT INTO public.ai_credit_wallets (user_id, balance)
  VALUES (_user_id, COALESCE(bonus, 10))
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO w_id;

  -- If w_id is not null, we just created a new wallet (INSERT succeeded)
  IF w_id IS NOT NULL THEN
    inserted := true;
  ELSE
    -- Wallet already existed, fetch its id
    SELECT id INTO w_id FROM public.ai_credit_wallets WHERE user_id = _user_id;
  END IF;

  -- Log welcome bonus ONLY if we just created the wallet (not on conflict)
  IF inserted AND COALESCE(bonus, 10) > 0 THEN
    INSERT INTO public.ai_credit_ledger (user_id, wallet_id, operation_type, credits_delta, balance_after, description)
    VALUES (_user_id, w_id, 'bonus', COALESCE(bonus, 10), COALESCE(bonus, 10), 'Bonus de bienvenue');
  END IF;

  RETURN w_id;
END;
$$;

-- Revoke EXECUTE from public, grant only to authenticated and service_role
REVOKE EXECUTE ON FUNCTION public.ensure_ai_wallet(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_ai_wallet(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_ai_wallet(uuid) TO service_role;
