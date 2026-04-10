
-- Add missing columns to stripe_customers (idempotent with IF NOT EXISTS pattern)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stripe_customers' AND column_name='stripe_subscription_id') THEN
    ALTER TABLE public.stripe_customers ADD COLUMN stripe_subscription_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stripe_customers' AND column_name='stripe_price_id') THEN
    ALTER TABLE public.stripe_customers ADD COLUMN stripe_price_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stripe_customers' AND column_name='subscription_status') THEN
    ALTER TABLE public.stripe_customers ADD COLUMN subscription_status text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stripe_customers' AND column_name='current_period_end') THEN
    ALTER TABLE public.stripe_customers ADD COLUMN current_period_end timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stripe_customers' AND column_name='cancel_at_period_end') THEN
    ALTER TABLE public.stripe_customers ADD COLUMN cancel_at_period_end boolean DEFAULT false;
  END IF;
END $$;

-- Create missing RPCs in Test (these already exist in Live via prior migrations)

CREATE OR REPLACE FUNCTION public.ensure_ai_wallet(_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  w_id uuid;
  bonus integer;
  inserted boolean := false;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() != _user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Accès non autorisé : vous ne pouvez créer un wallet que pour vous-même';
  END IF;

  SELECT COALESCE(value, 10)::integer INTO bonus FROM public.ai_pricing_config WHERE key = 'welcome_bonus_credits';

  INSERT INTO public.ai_credit_wallets (user_id, balance)
  VALUES (_user_id, COALESCE(bonus, 10))
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO w_id;

  IF w_id IS NOT NULL THEN
    inserted := true;
  ELSE
    SELECT id INTO w_id FROM public.ai_credit_wallets WHERE user_id = _user_id;
  END IF;

  IF inserted AND COALESCE(bonus, 10) > 0 THEN
    INSERT INTO public.ai_credit_ledger (user_id, wallet_id, operation_type, credits_delta, balance_after, description)
    VALUES (_user_id, w_id, 'bonus', COALESCE(bonus, 10), COALESCE(bonus, 10), 'Bonus de bienvenue');
  END IF;

  RETURN w_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_ai_balance(_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  bal integer;
BEGIN
  SELECT balance INTO bal FROM public.ai_credit_wallets WHERE user_id = _user_id;
  IF bal IS NULL THEN
    PERFORM public.ensure_ai_wallet(_user_id);
    SELECT balance INTO bal FROM public.ai_credit_wallets WHERE user_id = _user_id;
  END IF;
  RETURN COALESCE(bal, 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.debit_ai_credits(_user_id uuid, _feature_code text, _credits integer, _provider_cost_usd numeric DEFAULT NULL::numeric, _metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  w_id uuid;
  current_balance integer;
  new_balance integer;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Accès non autorisé à debit_ai_credits';
  END IF;

  w_id := public.ensure_ai_wallet(_user_id);

  SELECT balance INTO current_balance
  FROM public.ai_credit_wallets WHERE id = w_id FOR UPDATE;

  IF current_balance < _credits THEN
    INSERT INTO public.ai_credit_ledger (user_id, wallet_id, operation_type, credits_delta, balance_after, feature_code, status, metadata)
    VALUES (_user_id, w_id, 'consumption', -_credits, current_balance, _feature_code, 'failed_insufficient', _metadata);
    RETURN false;
  END IF;

  new_balance := current_balance - _credits;

  UPDATE public.ai_credit_wallets SET balance = new_balance, lifetime_consumed = lifetime_consumed + _credits WHERE id = w_id;

  INSERT INTO public.ai_credit_ledger (user_id, wallet_id, operation_type, credits_delta, balance_after, feature_code, provider_cost_usd, status, metadata)
  VALUES (_user_id, w_id, 'consumption', -_credits, new_balance, _feature_code, _provider_cost_usd, 'success', _metadata);

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.credit_ai_wallet(_user_id uuid, _credits integer, _operation_type ai_ledger_type, _description text DEFAULT NULL::text, _stripe_payment_id text DEFAULT NULL::text, _public_price_chf numeric DEFAULT NULL::numeric, _metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  w_id uuid;
  new_balance integer;
BEGIN
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

  INSERT INTO public.ai_credit_ledger (user_id, wallet_id, operation_type, credits_delta, balance_after, description, stripe_payment_id, public_price_chf, status, metadata)
  VALUES (_user_id, w_id, _operation_type, _credits, new_balance, _description, _stripe_payment_id, _public_price_chf, 'success', _metadata);

  RETURN new_balance;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_list_users()
 RETURNS TABLE(user_id uuid, email text, display_name text, created_at timestamp with time zone, roles text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  SELECT u.id AS user_id, u.email::text,
    COALESCE(NULLIF(p.display_name, ''), NULLIF(u.raw_user_meta_data ->> 'display_name', ''), split_part(u.email, '@', 1))::text AS display_name,
    u.created_at,
    COALESCE(array_agg(DISTINCT ur.role::text) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::text[]) AS roles
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  WHERE public.is_admin()
  GROUP BY u.id, u.email, u.created_at, p.display_name, u.raw_user_meta_data
  ORDER BY u.created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.search_linkable_users(_query text)
 RETURNS TABLE(user_id uuid, display_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  SELECT p.user_id,
         COALESCE(NULLIF(p.display_name, ''), split_part(u.email, '@', 1)) AS display_name
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'owner'
  WHERE (public.is_admin() OR public.is_educator() OR public.is_shelter())
    AND (lower(u.email) = lower(trim(_query)) OR p.display_name ILIKE '%' || trim(_query) || '%')
  ORDER BY CASE WHEN lower(u.email) = lower(trim(_query)) THEN 0 ELSE 1 END, p.created_at DESC
  LIMIT 20;
$function$;

-- Revoke dangerous RPCs from public, grant only to authenticated
REVOKE EXECUTE ON FUNCTION public.debit_ai_credits FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.credit_ai_wallet FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_ai_wallet TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_balance TO authenticated;
