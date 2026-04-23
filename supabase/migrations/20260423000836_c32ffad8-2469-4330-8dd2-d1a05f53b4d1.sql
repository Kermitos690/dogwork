-- ============================================================
-- 1. Lever la contrainte UNIQUE behavior_logs(dog_id, day_id)
-- ============================================================
ALTER TABLE public.behavior_logs
  DROP CONSTRAINT IF EXISTS behavior_logs_dog_id_day_id_key;

CREATE INDEX IF NOT EXISTS idx_behavior_logs_dog_day
  ON public.behavior_logs (dog_id, day_id, created_at DESC);

-- ============================================================
-- 2. credit_ai_wallet : tagger feature_code depuis _metadata
-- ============================================================
CREATE OR REPLACE FUNCTION public.credit_ai_wallet(
  _user_id uuid,
  _credits integer,
  _operation_type ai_ledger_type,
  _description text DEFAULT NULL::text,
  _stripe_payment_id text DEFAULT NULL::text,
  _public_price_chf numeric DEFAULT NULL::numeric,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  w_id uuid;
  new_balance integer;
  v_feature_code text;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Accès non autorisé à credit_ai_wallet';
  END IF;

  w_id := public.ensure_ai_wallet(_user_id);
  v_feature_code := NULLIF(_metadata->>'feature_code', '');

  UPDATE public.ai_credit_wallets
  SET balance = balance + _credits,
      lifetime_purchased = CASE WHEN _operation_type IN ('purchase', 'monthly_grant') THEN lifetime_purchased + _credits ELSE lifetime_purchased END,
      lifetime_refunded = CASE WHEN _operation_type = 'refund' THEN lifetime_refunded + _credits ELSE lifetime_refunded END
  WHERE id = w_id
  RETURNING balance INTO new_balance;

  INSERT INTO public.ai_credit_ledger (
    user_id, wallet_id, operation_type, credits_delta, balance_after,
    description, stripe_payment_id, public_price_chf, status, metadata, feature_code
  )
  VALUES (
    _user_id, w_id, _operation_type, _credits, new_balance,
    _description, _stripe_payment_id, _public_price_chf, 'success', _metadata, v_feature_code
  );

  RETURN new_balance;
END;
$function$;

-- ============================================================
-- 3. Foreign keys with ON DELETE CASCADE
--    Strategy: clean orphans first (in strict order), then add FK.
-- ============================================================

-- behavior_logs.dog_id → dogs.id
DELETE FROM public.behavior_logs WHERE dog_id NOT IN (SELECT id FROM public.dogs);
ALTER TABLE public.behavior_logs
  DROP CONSTRAINT IF EXISTS behavior_logs_dog_fk,
  ADD CONSTRAINT behavior_logs_dog_fk
    FOREIGN KEY (dog_id) REFERENCES public.dogs(id) ON DELETE CASCADE;

-- exercise_sessions.dog_id → dogs.id
DELETE FROM public.exercise_sessions WHERE dog_id NOT IN (SELECT id FROM public.dogs);
ALTER TABLE public.exercise_sessions
  DROP CONSTRAINT IF EXISTS exercise_sessions_dog_fk,
  ADD CONSTRAINT exercise_sessions_dog_fk
    FOREIGN KEY (dog_id) REFERENCES public.dogs(id) ON DELETE CASCADE;

-- day_progress.dog_id → dogs.id
DELETE FROM public.day_progress WHERE dog_id NOT IN (SELECT id FROM public.dogs);
ALTER TABLE public.day_progress
  DROP CONSTRAINT IF EXISTS day_progress_dog_fk,
  ADD CONSTRAINT day_progress_dog_fk
    FOREIGN KEY (dog_id) REFERENCES public.dogs(id) ON DELETE CASCADE;

-- dog_problems.dog_id → dogs.id
DELETE FROM public.dog_problems WHERE dog_id NOT IN (SELECT id FROM public.dogs);
ALTER TABLE public.dog_problems
  DROP CONSTRAINT IF EXISTS dog_problems_dog_fk,
  ADD CONSTRAINT dog_problems_dog_fk
    FOREIGN KEY (dog_id) REFERENCES public.dogs(id) ON DELETE CASCADE;

-- dog_objectives.dog_id → dogs.id
DELETE FROM public.dog_objectives WHERE dog_id NOT IN (SELECT id FROM public.dogs);
ALTER TABLE public.dog_objectives
  DROP CONSTRAINT IF EXISTS dog_objectives_dog_fk,
  ADD CONSTRAINT dog_objectives_dog_fk
    FOREIGN KEY (dog_id) REFERENCES public.dogs(id) ON DELETE CASCADE;

-- dog_evaluations.dog_id → dogs.id
DELETE FROM public.dog_evaluations WHERE dog_id NOT IN (SELECT id FROM public.dogs);
ALTER TABLE public.dog_evaluations
  DROP CONSTRAINT IF EXISTS dog_evaluations_dog_fk,
  ADD CONSTRAINT dog_evaluations_dog_fk
    FOREIGN KEY (dog_id) REFERENCES public.dogs(id) ON DELETE CASCADE;

-- journal_entries.dog_id → dogs.id
DELETE FROM public.journal_entries WHERE dog_id NOT IN (SELECT id FROM public.dogs);
ALTER TABLE public.journal_entries
  DROP CONSTRAINT IF EXISTS journal_entries_dog_fk,
  ADD CONSTRAINT journal_entries_dog_fk
    FOREIGN KEY (dog_id) REFERENCES public.dogs(id) ON DELETE CASCADE;

-- ============================================================
-- AI CREDITS: cleanup orphans in STRICT order, then add FKs.
-- Order is critical because orphan wallets on Live still have
-- ledger rows referencing them, and the existing FK without
-- CASCADE would block any DELETE on ai_credit_wallets.
-- ============================================================

-- Step A: ledger rows whose user_id no longer exists in auth.users
DELETE FROM public.ai_credit_ledger
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Step B: ledger rows pointing to a wallet that does not exist
DELETE FROM public.ai_credit_ledger l
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_credit_wallets w WHERE w.id = l.wallet_id
);

-- Step C: ledger rows whose wallet's owner no longer exists in auth.users
--         (covers wallets still present but whose owner is gone — they will
--          be deleted in step D, and we cannot rely on CASCADE yet because
--          the FK is not in place.)
DELETE FROM public.ai_credit_ledger l
USING public.ai_credit_wallets w
WHERE l.wallet_id = w.id
  AND w.user_id NOT IN (SELECT id FROM auth.users);

-- Step D: wallets whose owner no longer exists in auth.users
DELETE FROM public.ai_credit_wallets
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Step E: FK ai_credit_wallets.user_id → auth.users.id (CASCADE)
ALTER TABLE public.ai_credit_wallets
  DROP CONSTRAINT IF EXISTS ai_credit_wallets_user_fk;
ALTER TABLE public.ai_credit_wallets
  DROP CONSTRAINT IF EXISTS ai_credit_wallets_user_id_fkey;
ALTER TABLE public.ai_credit_wallets
  ADD CONSTRAINT ai_credit_wallets_user_fk
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step F: FK ai_credit_ledger.wallet_id → ai_credit_wallets.id (CASCADE)
ALTER TABLE public.ai_credit_ledger
  DROP CONSTRAINT IF EXISTS ai_credit_ledger_wallet_fk;
ALTER TABLE public.ai_credit_ledger
  DROP CONSTRAINT IF EXISTS ai_credit_ledger_wallet_id_fkey;
ALTER TABLE public.ai_credit_ledger
  ADD CONSTRAINT ai_credit_ledger_wallet_fk
    FOREIGN KEY (wallet_id) REFERENCES public.ai_credit_wallets(id) ON DELETE CASCADE;
