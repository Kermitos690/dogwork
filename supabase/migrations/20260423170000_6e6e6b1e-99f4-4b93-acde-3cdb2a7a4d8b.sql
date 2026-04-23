-- Supplemental indexes kept separate from the orphan cleanup
-- so production publish applies only the pieces that are still needed.

CREATE INDEX IF NOT EXISTS idx_ai_credit_ledger_user_created
  ON public.ai_credit_ledger (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_credit_ledger_operation_status
  ON public.ai_credit_ledger (operation_type, status);

CREATE INDEX IF NOT EXISTS idx_ai_credit_ledger_period_key
  ON public.ai_credit_ledger ((metadata->>''period_key''))
  WHERE metadata ? ''period_key'';

CREATE INDEX IF NOT EXISTS idx_cron_run_logs_job_period
  ON public.cron_run_logs (job_name, period_key);

CREATE INDEX IF NOT EXISTS idx_cron_run_logs_started
  ON public.cron_run_logs (started_at DESC);
