-- Pre-cleanup for orphan AI credit rows before the historical
-- 20260423000836 migration recreates foreign keys on Live.
-- Safe on Test and idempotent on repeated runs.

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
