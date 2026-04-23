DELETE FROM public.ai_credit_ledger l
WHERE NOT EXISTS (
  SELECT 1
  FROM auth.users u
  WHERE u.id = l.user_id
);

DELETE FROM public.ai_credit_ledger l
WHERE NOT EXISTS (
  SELECT 1
  FROM public.ai_credit_wallets w
  WHERE w.id = l.wallet_id
);

DELETE FROM public.ai_credit_ledger l
USING public.ai_credit_wallets w
WHERE l.wallet_id = w.id
  AND NOT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = w.user_id
  );

DELETE FROM public.ai_credit_wallets w
WHERE NOT EXISTS (
  SELECT 1
  FROM auth.users u
  WHERE u.id = w.user_id
);

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