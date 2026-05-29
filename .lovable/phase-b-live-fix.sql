-- ============================================================
-- Phase B — Correctifs LIVE (hdmmqwpypvhwohhhaqnf)
-- À exécuter dans : Cloud View > Run SQL (env = LIVE)
-- NE PAS exécuter sur TEST.
--
-- Avant exécution : remplacer <LIVE_ANON_KEY> par la clé anon LIVE
-- (Cloud > Settings > API > anon public key)
--
-- Idempotent : safe à relancer.
-- ============================================================

-- ----------------------------------------------------------------
-- B3 — pgmq queue manquante (auth_emails)
-- Cause des erreurs Postgres toutes les 5s sur LIVE
-- ----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgmq;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'pgmq' AND c.relname = 'q_auth_emails'
  ) THEN
    PERFORM pgmq.create('auth_emails');
  END IF;
END $$;

-- ----------------------------------------------------------------
-- B4 — Cron jobs manquants sur LIVE
-- Drop si existants puis recréation (idempotent)
-- ----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper: unschedule si présent
DO $$
DECLARE j text;
BEGIN
  FOREACH j IN ARRAY ARRAY[
    'monthly-ai-credit-grant',
    'monthly-credit-grant-daily',
    'send-appointment-reminders-daily',
    'send-exercise-reminders-daily',
    'stripe-subscription-sync-hourly'
  ] LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = j) THEN
      PERFORM cron.unschedule(j);
    END IF;
  END LOOP;
END $$;

-- 1. Grant mensuel crédits IA (1er du mois 02:00 UTC)
SELECT cron.schedule(
  'monthly-ai-credit-grant',
  '0 2 1 * *',
  $$ SELECT net.http_post(
    url := 'https://hdmmqwpypvhwohhhaqnf.supabase.co/functions/v1/monthly-credit-grant',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <LIVE_ANON_KEY>"}'::jsonb,
    body := jsonb_build_object('triggered_at', now()::text, 'source','cron-monthly')
  ); $$
);

-- 2. Filet de sécurité quotidien (rattrapage)
SELECT cron.schedule(
  'monthly-credit-grant-daily',
  '0 1 * * *',
  $$ SELECT net.http_post(
    url := 'https://hdmmqwpypvhwohhhaqnf.supabase.co/functions/v1/monthly-credit-grant',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <LIVE_ANON_KEY>"}'::jsonb,
    body := jsonb_build_object('triggered_at', now()::text, 'source','cron-daily')
  ); $$
);

-- 3. Rappels rendez-vous (08:00 UTC)
SELECT cron.schedule(
  'send-appointment-reminders-daily',
  '0 8 * * *',
  $$ SELECT net.http_post(
    url := 'https://hdmmqwpypvhwohhhaqnf.supabase.co/functions/v1/send-appointment-reminders',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <LIVE_ANON_KEY>"}'::jsonb,
    body := jsonb_build_object('triggered_by','cron')
  ); $$
);

-- 4. Rappels exercices (09:00 UTC)
SELECT cron.schedule(
  'send-exercise-reminders-daily',
  '0 9 * * *',
  $$ SELECT net.http_post(
    url := 'https://hdmmqwpypvhwohhhaqnf.supabase.co/functions/v1/send-exercise-reminders',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <LIVE_ANON_KEY>"}'::jsonb,
    body := jsonb_build_object('triggered_by','cron')
  ); $$
);

-- 5. Sync Stripe subscriptions (toutes les heures)
SELECT cron.schedule(
  'stripe-subscription-sync-hourly',
  '0 * * * *',
  $$ SELECT net.http_post(
    url := 'https://hdmmqwpypvhwohhhaqnf.supabase.co/functions/v1/sync-stripe-subscriptions',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <LIVE_ANON_KEY>"}'::jsonb,
    body := jsonb_build_object('triggered_by','cron')
  ); $$
);

-- ============================================================
-- Vérifications post-exécution
-- ============================================================
-- SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;
-- SELECT * FROM pgmq.list_queues();
