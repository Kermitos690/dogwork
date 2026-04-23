-- ============================================================
-- Force cleanup of AI credit orphans + recreate FKs idempotently.
-- This migration runs AFTER 20260423000836 and guarantees that
-- Live FKs are correctly in place even if the previous migration
-- left an inconsistent state.
-- ============================================================

-- Step 1: ledger rows whose user_id no longer exists in auth.users
DELETE FROM public.ai_credit_ledger l
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = l.user_id
);

-- Step 2: ledger rows whose wallet does not exist
DELETE FROM public.ai_credit_ledger l
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_credit_wallets w WHERE w.id = l.wallet_id
);

-- Step 3: ledger rows attached to wallets whose owner no longer exists
DELETE FROM public.ai_credit_ledger l
USING public.ai_credit_wallets w
WHERE l.wallet_id = w.id
  AND NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = w.user_id
  );

-- Step 4: wallets whose owner no longer exists
DELETE FROM public.ai_credit_wallets w
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = w.user_id
);

-- Step 5: ensure FK ai_credit_wallets.user_id -> auth.users(id) ON DELETE CASCADE
ALTER TABLE public.ai_credit_wallets
  DROP CONSTRAINT IF EXISTS ai_credit_wallets_user_fk;
ALTER TABLE public.ai_credit_wallets
  DROP CONSTRAINT IF EXISTS ai_credit_wallets_user_id_fkey;
ALTER TABLE public.ai_credit_wallets
  ADD CONSTRAINT ai_credit_wallets_user_fk
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 6: ensure FK ai_credit_ledger.wallet_id -> ai_credit_wallets(id) ON DELETE CASCADE
ALTER TABLE public.ai_credit_ledger
  DROP CONSTRAINT IF EXISTS ai_credit_ledger_wallet_fk;
ALTER TABLE public.ai_credit_ledger
  DROP CONSTRAINT IF EXISTS ai_credit_ledger_wallet_id_fkey;
ALTER TABLE public.ai_credit_ledger
  ADD CONSTRAINT ai_credit_ledger_wallet_fk
    FOREIGN KEY (wallet_id) REFERENCES public.ai_credit_wallets(id) ON DELETE CASCADE;