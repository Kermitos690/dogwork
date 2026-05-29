-- ============================================================
-- Phase B v2 — Correctifs LIVE (hdmmqwpypvhwohhhaqnf)
-- À exécuter via : /admin/sql-live-runner (app DogWork, admin)
-- ✅ AUCUNE clé à coller — utilise app_internal_settings.service_role_key
-- ✅ Idempotent — safe à relancer
-- ============================================================

-- Garde-fou : refuse l'exécution si on n'est PAS sur LIVE
DO $$
DECLARE v_ref text;
BEGIN
  SELECT current_setting('app.settings.supabase_url', true) INTO v_ref;
  IF v_ref IS NOT NULL AND v_ref NOT LIKE '%hdmmqwpypvhwohhhaqnf%' THEN
    RAISE EXCEPTION 'REFUS : ce script est destiné à LIVE (hdmmqwpypvhwohhhaqnf). Détecté : %', v_ref;
  END IF;
END $$;

-- ----------------------------------------------------------------
-- B3 — pgmq queue auth_emails
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
-- B4 — Cron jobs (utilise service_role_key depuis app_internal_settings)
-- ----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE
  v_key   text;
  v_url   text := 'https://hdmmqwpypvhwohhhaqnf.supabase.co';
  v_jobs  text[] := ARRAY[
    'monthly-ai-credit-grant',
    'monthly-credit-grant-daily',
    'send-appointment-reminders-daily',
    'send-exercise-reminders-daily',
    'stripe-subscription-sync-hourly'
  ];
  j text;
BEGIN
  SELECT value INTO v_key FROM public.app_internal_settings WHERE key = 'service_role_key';
  IF v_key IS NULL OR v_key = '' THEN
    RAISE EXCEPTION 'service_role_key absente de app_internal_settings — exécute d''abord setup-push-internals';
  END IF;

  -- Unschedule existing
  FOREACH j IN ARRAY v_jobs LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = j) THEN
      PERFORM cron.unschedule(j);
    END IF;
  END LOOP;

  -- 1. Grant mensuel crédits IA (1er du mois 02:00 UTC)
  PERFORM cron.schedule(
    'monthly-ai-credit-grant', '0 2 1 * *',
    format($CRON$ SELECT net.http_post(
      url := %L,
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s'),
      body := jsonb_build_object('triggered_at', now()::text, 'source','cron-monthly')
    ); $CRON$, v_url || '/functions/v1/monthly-credit-grant', v_key)
  );

  -- 2. Filet de sécurité quotidien (01:00 UTC)
  PERFORM cron.schedule(
    'monthly-credit-grant-daily', '0 1 * * *',
    format($CRON$ SELECT net.http_post(
      url := %L,
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s'),
      body := jsonb_build_object('triggered_at', now()::text, 'source','cron-daily')
    ); $CRON$, v_url || '/functions/v1/monthly-credit-grant', v_key)
  );

  -- 3. Rappels rendez-vous (08:00 UTC)
  PERFORM cron.schedule(
    'send-appointment-reminders-daily', '0 8 * * *',
    format($CRON$ SELECT net.http_post(
      url := %L,
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s'),
      body := jsonb_build_object('triggered_by','cron')
    ); $CRON$, v_url || '/functions/v1/send-appointment-reminders', v_key)
  );

  -- 4. Rappels exercices (09:00 UTC)
  PERFORM cron.schedule(
    'send-exercise-reminders-daily', '0 9 * * *',
    format($CRON$ SELECT net.http_post(
      url := %L,
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s'),
      body := jsonb_build_object('triggered_by','cron')
    ); $CRON$, v_url || '/functions/v1/send-exercise-reminders', v_key)
  );

  -- 5. Sync Stripe subscriptions (toutes les heures)
  PERFORM cron.schedule(
    'stripe-subscription-sync-hourly', '0 * * * *',
    format($CRON$ SELECT net.http_post(
      url := %L,
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s'),
      body := jsonb_build_object('triggered_by','cron')
    ); $CRON$, v_url || '/functions/v1/sync-stripe-subscriptions', v_key)
  );
END $$;

-- ============================================================
-- Vérification (à coller séparément après exécution)
-- ============================================================
-- SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;
-- SELECT * FROM pgmq.list_queues();
