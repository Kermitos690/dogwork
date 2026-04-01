
-- C1: Block all direct writes on ai_credit_wallets and ai_credit_ledger
-- (SECURITY DEFINER functions bypass RLS, so they still work)

CREATE POLICY "No direct insert wallets" ON public.ai_credit_wallets
  FOR INSERT WITH CHECK (false);

CREATE POLICY "No direct update wallets" ON public.ai_credit_wallets
  FOR UPDATE USING (false);

CREATE POLICY "No direct delete wallets" ON public.ai_credit_wallets
  FOR DELETE USING (false);

CREATE POLICY "No direct insert ledger" ON public.ai_credit_ledger
  FOR INSERT WITH CHECK (false);

CREATE POLICY "No direct update ledger" ON public.ai_credit_ledger
  FOR UPDATE USING (false);

CREATE POLICY "No direct delete ledger" ON public.ai_credit_ledger
  FOR DELETE USING (false);

-- C2: Secure credit_ai_wallet to only allow admin or refund operations
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
  -- Security: only allow refund from non-admin callers
  -- purchase and bonus should only come from webhooks/admin edge functions (service_role bypasses this)
  -- This function is SECURITY DEFINER so auth.uid() may be null when called from service_role context
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() AND _operation_type NOT IN ('refund') THEN
    RAISE EXCEPTION 'Accès non autorisé à credit_ai_wallet';
  END IF;

  w_id := public.ensure_ai_wallet(_user_id);

  UPDATE public.ai_credit_wallets
  SET balance = balance + _credits,
      lifetime_purchased = CASE WHEN _operation_type = 'purchase' THEN lifetime_purchased + _credits ELSE lifetime_purchased END,
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

-- C6: Log admin/educator calls in ledger (modify debit function to log privileged calls too)
-- We'll handle this in the edge function instead (no DB change needed)
