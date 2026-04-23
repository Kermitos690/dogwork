-- Purge orphan AI credit data so that the historical migration
-- 20260423000836 can finally add ai_credit_wallets_user_fk on Live.
-- This migration is idempotent and a no-op on Test (no orphans).

-- 1. Ledger rows whose user_id no longer exists in auth.users
DELETE FROM public.ai_credit_ledger
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- 2. Ledger rows pointing to a wallet that does not exist
DELETE FROM public.ai_credit_ledger l
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_credit_wallets w WHERE w.id = l.wallet_id
);

-- 3. Ledger rows whose wallet's owner no longer exists in auth.users
DELETE FROM public.ai_credit_ledger l
USING public.ai_credit_wallets w
WHERE l.wallet_id = w.id
  AND w.user_id NOT IN (SELECT id FROM auth.users);

-- 4. Wallets whose owner no longer exists in auth.users
DELETE FROM public.ai_credit_wallets
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- 5. Pre-create the FK with CASCADE (idempotent) so that even if
--    the historical migration 20260423000836 is rerun, its DROP/ADD
--    pattern remains valid.
ALTER TABLE public.ai_credit_wallets
  DROP CONSTRAINT IF EXISTS ai_credit_wallets_user_fk;
ALTER TABLE public.ai_credit_wallets
  DROP CONSTRAINT IF EXISTS ai_credit_wallets_user_id_fkey;
ALTER TABLE public.ai_credit_wallets
  ADD CONSTRAINT ai_credit_wallets_user_fk
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.ai_credit_ledger
  DROP CONSTRAINT IF EXISTS ai_credit_ledger_wallet_fk;
ALTER TABLE public.ai_credit_ledger
  DROP CONSTRAINT IF EXISTS ai_credit_ledger_wallet_id_fkey;
ALTER TABLE public.ai_credit_ledger
  ADD CONSTRAINT ai_credit_ledger_wallet_fk
    FOREIGN KEY (wallet_id) REFERENCES public.ai_credit_wallets(id) ON DELETE CASCADE;