-- 1. Cleanup orphan wallets blocking FK creation in Live
DELETE FROM public.ai_credit_ledger
WHERE user_id IN ('9aa77aa0-cf30-494c-913f-a689b71d4482', '73935353-0e14-4e25-9896-e44e3dad01a8')
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = ai_credit_ledger.user_id);

DELETE FROM public.ai_credit_wallets
WHERE user_id IN ('9aa77aa0-cf30-494c-913f-a689b71d4482', '73935353-0e14-4e25-9896-e44e3dad01a8')
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = ai_credit_wallets.user_id);

-- 2. Cron run log table
CREATE TABLE IF NOT EXISTS public.cron_run_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','partial','error')),
  eligible_count integer NOT NULL DEFAULT 0,
  credited_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  period_key text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cron_run_logs_job_started
  ON public.cron_run_logs(job_name, started_at DESC);

ALTER TABLE public.cron_run_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read cron logs" ON public.cron_run_logs;
CREATE POLICY "Admins read cron logs"
  ON public.cron_run_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Writes are performed by edge functions via service role (bypasses RLS).