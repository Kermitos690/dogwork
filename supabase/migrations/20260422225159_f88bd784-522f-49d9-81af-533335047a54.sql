-- Phase 2C: add real avoidance column on behavior_logs and backfill from
-- the temporary `recovery_after_trigger='avoidance'` sentinel introduced in
-- Phase 1. No destructive changes — old field stays usable.

ALTER TABLE public.behavior_logs
  ADD COLUMN IF NOT EXISTS avoidance boolean NOT NULL DEFAULT false;

-- Backfill: any row whose recovery field carries the sentinel string becomes
-- a real avoidance row, and we clear the sentinel.
UPDATE public.behavior_logs
SET avoidance = true,
    recovery_after_trigger = NULL
WHERE recovery_after_trigger = 'avoidance';

-- Lightweight partial index — most rows will be FALSE, so we only index TRUE.
CREATE INDEX IF NOT EXISTS idx_behavior_logs_avoidance_true
  ON public.behavior_logs (dog_id, created_at)
  WHERE avoidance = true;