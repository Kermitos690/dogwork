-- =========================================================================
-- 1. NETTOYAGE ORDONNÉ DES ORPHELINS (idempotent, safe en Test ET en Live)
-- =========================================================================

-- 1a. Supprimer d'abord les lignes ledger qui pointent vers un wallet
--     dont le user_id n'existe plus dans auth.users
DELETE FROM public.ai_credit_ledger
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- 1b. Supprimer aussi les lignes ledger qui pointent vers un wallet inexistant
DELETE FROM public.ai_credit_ledger l
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_credit_wallets w WHERE w.id = l.wallet_id
);

-- 1c. Supprimer maintenant les wallets orphelins (user supprimé)
DELETE FROM public.ai_credit_wallets
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- =========================================================================
-- 2. RECRÉATION PROPRE DE LA FK ai_credit_wallets -> auth.users
-- =========================================================================

-- 2a. Supprimer toute version existante de la contrainte (idempotent)
ALTER TABLE public.ai_credit_wallets
  DROP CONSTRAINT IF EXISTS ai_credit_wallets_user_fk;

ALTER TABLE public.ai_credit_wallets
  DROP CONSTRAINT IF EXISTS ai_credit_wallets_user_id_fkey;

-- 2b. Recréer la FK avec ON DELETE CASCADE
ALTER TABLE public.ai_credit_wallets
  ADD CONSTRAINT ai_credit_wallets_user_fk
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- =========================================================================
-- 3. FK ai_credit_ledger -> ai_credit_wallets en cascade (sécurité)
-- =========================================================================

ALTER TABLE public.ai_credit_ledger
  DROP CONSTRAINT IF EXISTS ai_credit_ledger_wallet_fk;

ALTER TABLE public.ai_credit_ledger
  DROP CONSTRAINT IF EXISTS ai_credit_ledger_wallet_id_fkey;

ALTER TABLE public.ai_credit_ledger
  ADD CONSTRAINT ai_credit_ledger_wallet_fk
  FOREIGN KEY (wallet_id)
  REFERENCES public.ai_credit_wallets(id)
  ON DELETE CASCADE;

-- =========================================================================
-- 4. INDEX UTILES POUR LE LEDGER ET LE CRON MENSUEL
-- =========================================================================

CREATE INDEX IF NOT EXISTS idx_ai_credit_ledger_user_created
  ON public.ai_credit_ledger (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_credit_ledger_operation_status
  ON public.ai_credit_ledger (operation_type, status);

CREATE INDEX IF NOT EXISTS idx_ai_credit_ledger_period_key
  ON public.ai_credit_ledger ((metadata->>'period_key'))
  WHERE metadata ? 'period_key';

-- =========================================================================
-- 5. GARANTIR L'EXISTENCE DE cron_run_logs (no-op si déjà présente)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.cron_run_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  period_key text,
  status text NOT NULL DEFAULT 'running',
  eligible_count integer NOT NULL DEFAULT 0,
  credited_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cron_run_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read cron logs" ON public.cron_run_logs;
CREATE POLICY "Admins read cron logs"
  ON public.cron_run_logs
  FOR SELECT
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_cron_run_logs_job_period
  ON public.cron_run_logs (job_name, period_key);

CREATE INDEX IF NOT EXISTS idx_cron_run_logs_started
  ON public.cron_run_logs (started_at DESC);