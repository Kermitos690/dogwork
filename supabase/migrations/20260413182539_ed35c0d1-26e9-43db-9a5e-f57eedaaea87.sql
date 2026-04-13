
-- Vue des packs actifs (safe pour le frontend, sans données de coût interne)
CREATE OR REPLACE VIEW public.v_active_credit_packs 
WITH (security_invoker = on)
AS
SELECT id, slug, label, description, credits, price_chf, sort_order
FROM public.ai_credit_packs
WHERE is_active = true
ORDER BY sort_order;

-- Fonction get_my_credit_balance : retourne le wallet de l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.get_my_credit_balance()
RETURNS TABLE(balance integer, lifetime_purchased integer, lifetime_consumed integer, lifetime_refunded integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  w_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  -- Ensure wallet exists
  w_id := public.ensure_ai_wallet(_uid);

  RETURN QUERY
  SELECT w.balance, w.lifetime_purchased, w.lifetime_consumed, w.lifetime_refunded
  FROM public.ai_credit_wallets w
  WHERE w.user_id = _uid;
END;
$$;

-- Fonction consume_my_credits : consomme des crédits pour l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.consume_my_credits(_feature_code text, _credits integer DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _cost integer;
  _result boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  -- If credits not specified, look up from feature catalog
  IF _credits IS NULL THEN
    SELECT credits_cost INTO _cost
    FROM public.ai_feature_catalog
    WHERE code = _feature_code AND is_active = true;
    
    IF _cost IS NULL THEN
      RAISE EXCEPTION 'Fonctionnalité IA inconnue ou inactive : %', _feature_code;
    END IF;
  ELSE
    _cost := _credits;
  END IF;

  -- Use existing debit function (runs as service role internally)
  _result := public.debit_ai_credits(_uid, _feature_code, _cost);
  
  RETURN _result;
END;
$$;

-- Fonction ensure_credit_wallet : wrapper user-facing
CREATE OR REPLACE FUNCTION public.ensure_credit_wallet()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;
  RETURN public.ensure_ai_wallet(auth.uid());
END;
$$;
