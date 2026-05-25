-- ============================================================
-- Phase 5B v2 — Correctifs LIVE + Monitoring Cron
-- Projet LIVE : hdmmqwpypvhwohhhaqnf
-- À exécuter dans : Cloud View > Run SQL (env = Live)
-- TEST est déjà conforme — ne PAS exécuter sur TEST.
--
-- AVANT EXÉCUTION :
--   1) Récupérer la clé anon LIVE (Cloud > Settings > API > anon public)
--   2) Faire un rechercher/remplacer global :  <LIVE_ANON_KEY>  →  ta_cle
--   3) Vérifier que les edge functions `monthly-credit-grant`
--      et `send-appointment-reminders` sont bien déployées sur LIVE
-- ============================================================

-- ====== 1. REALTIME : publication messages + notifications ======
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.messages       REPLICA IDENTITY FULL;
ALTER TABLE public.notifications  REPLICA IDENTITY FULL;


-- ====== 2. TABLE DE LOG DES EXÉCUTIONS CRON ======
CREATE TABLE IF NOT EXISTS public.cron_job_runs (
  id              bigserial PRIMARY KEY,
  job_name        text        NOT NULL,
  request_id      bigint,                       -- id retourné par net.http_post
  triggered_at    timestamptz NOT NULL DEFAULT now(),
  checked_at      timestamptz,
  status_code     int,
  is_success      boolean,
  response_excerpt text,
  alerted         boolean     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_cron_job_runs_triggered_at
  ON public.cron_job_runs (triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_job_runs_unchecked
  ON public.cron_job_runs (checked_at) WHERE checked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cron_job_runs_failed_unalerted
  ON public.cron_job_runs (alerted) WHERE is_success = false AND alerted = false;

ALTER TABLE public.cron_job_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read cron_job_runs" ON public.cron_job_runs;
CREATE POLICY "Admins read cron_job_runs"
  ON public.cron_job_runs FOR SELECT
  USING (public.is_admin());


-- ====== 3. WRAPPER : déclenche un job + enregistre le request_id ======
CREATE OR REPLACE FUNCTION public.cron_invoke_edge(
  _job_name   text,
  _path       text,
  _anon_key   text,
  _body       jsonb DEFAULT '{}'::jsonb
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  v_req_id bigint;
BEGIN
  SELECT net.http_post(
    url     := 'https://hdmmqwpypvhwohhhaqnf.supabase.co/functions/v1/' || _path,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _anon_key
    ),
    body    := _body || jsonb_build_object('triggered_at', now(), 'source', 'pg_cron')
  ) INTO v_req_id;

  INSERT INTO public.cron_job_runs (job_name, request_id, triggered_at)
  VALUES (_job_name, v_req_id, now());

  RETURN v_req_id;
END;
$$;


-- ====== 4. CRON JOBS (utilisent le wrapper) ======

-- 4.1 Grant mensuel (1er du mois 02:00 UTC)
SELECT cron.schedule(
  'monthly-ai-credit-grant',
  '0 2 1 * *',
  $$ SELECT public.cron_invoke_edge('monthly-ai-credit-grant', 'monthly-credit-grant', '<LIVE_ANON_KEY>', '{}'::jsonb); $$
);

-- 4.2 Filet de sécurité quotidien (01:00 UTC)
SELECT cron.schedule(
  'monthly-credit-grant-daily',
  '0 1 * * *',
  $$ SELECT public.cron_invoke_edge('monthly-credit-grant-daily', 'monthly-credit-grant', '<LIVE_ANON_KEY>', '{}'::jsonb); $$
);

-- 4.3 Rappels rendez-vous quotidiens (08:00 UTC)
SELECT cron.schedule(
  'send-appointment-reminders-daily',
  '0 8 * * *',
  $$ SELECT public.cron_invoke_edge('send-appointment-reminders-daily', 'send-appointment-reminders', '<LIVE_ANON_KEY>', '{}'::jsonb); $$
);


-- ====== 5. CHECKER : récupère le statut HTTP des requêtes lancées ======
CREATE OR REPLACE FUNCTION public.cron_check_recent_runs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  rec RECORD;
  v_resp RECORD;
  v_checked int := 0;
  v_failed  int := 0;
BEGIN
  -- Parcourt les runs déclenchés depuis 24h non encore vérifiés
  FOR rec IN
    SELECT id, request_id, job_name
      FROM public.cron_job_runs
     WHERE checked_at IS NULL
       AND triggered_at > now() - interval '24 hours'
       AND request_id IS NOT NULL
  LOOP
    BEGIN
      SELECT status_code, LEFT(content::text, 500) AS excerpt
        INTO v_resp
        FROM net._http_response
       WHERE id = rec.request_id
       LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_resp := NULL;
    END;

    IF v_resp.status_code IS NOT NULL THEN
      UPDATE public.cron_job_runs
         SET checked_at        = now(),
             status_code       = v_resp.status_code,
             is_success        = (v_resp.status_code BETWEEN 200 AND 299),
             response_excerpt  = v_resp.excerpt
       WHERE id = rec.id;
      v_checked := v_checked + 1;
      IF v_resp.status_code < 200 OR v_resp.status_code >= 300 THEN
        v_failed := v_failed + 1;
      END IF;
    END IF;
  END LOOP;

  -- Pour les runs lancés > 5min sans réponse net, marquer en échec (timeout)
  UPDATE public.cron_job_runs
     SET checked_at       = now(),
         is_success       = false,
         status_code      = 0,
         response_excerpt = 'timeout: pas de réponse net après 5min'
   WHERE checked_at IS NULL
     AND triggered_at < now() - interval '5 minutes';

  RETURN jsonb_build_object('checked', v_checked, 'failed', v_failed);
END;
$$;


-- ====== 6. ALERTING : notifie les admins push pour chaque run échoué ======
CREATE OR REPLACE FUNCTION public.cron_alert_failures()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  v_alerts int := 0;
BEGIN
  FOR rec IN
    SELECT id, job_name, status_code, response_excerpt, triggered_at
      FROM public.cron_job_runs
     WHERE is_success = false
       AND alerted    = false
       AND triggered_at > now() - interval '7 days'
     ORDER BY triggered_at DESC
     LIMIT 20
  LOOP
    BEGIN
      PERFORM public.notify_users_push(
        NULL,                              -- user_id
        'admin',                           -- broadcast_role
        'admin_alerts',                    -- category
        'Cron LIVE en échec : ' || rec.job_name,
        'HTTP ' || COALESCE(rec.status_code::text, '?')
          || ' — ' || COALESCE(LEFT(rec.response_excerpt, 120), 'no body')
          || ' (' || to_char(rec.triggered_at, 'DD/MM HH24:MI') || ')',
        '/admin/system-health',
        'cron-fail-' || rec.id::text,
        'cron-fail-' || rec.id::text,
        jsonb_build_object('cron_run_id', rec.id, 'job_name', rec.job_name)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'cron_alert_failures: push failed for run %: %', rec.id, SQLERRM;
    END;

    UPDATE public.cron_job_runs SET alerted = true WHERE id = rec.id;
    v_alerts := v_alerts + 1;
  END LOOP;

  RETURN jsonb_build_object('alerts_sent', v_alerts);
END;
$$;


-- ====== 7. CRON DE SURVEILLANCE (toutes les 15 min) ======
SELECT cron.schedule(
  'cron-health-checker',
  '*/15 * * * *',
  $$
  SELECT public.cron_check_recent_runs();
  SELECT public.cron_alert_failures();
  $$
);


-- ============================================================
-- VÉRIFICATIONS POST-EXÉCUTION (à lancer après le script)
-- ============================================================

-- A. Publication realtime
-- SELECT schemaname, tablename
--   FROM pg_publication_tables
--  WHERE pubname='supabase_realtime'
--  ORDER BY tablename;
-- Attendu : au moins messages + notifications

-- B. Crons enregistrés
-- SELECT jobname, schedule, active
--   FROM cron.job
--  ORDER BY jobname;
-- Attendu : monthly-ai-credit-grant, monthly-credit-grant-daily,
--          send-appointment-reminders-daily, cron-health-checker

-- C. Test à chaud du wrapper (force un appel maintenant — vérifie le pipeline)
-- SELECT public.cron_invoke_edge(
--   'manual-smoketest', 'monthly-credit-grant', '<LIVE_ANON_KEY>', '{}'::jsonb
-- );
-- Puis dans 30s :
-- SELECT public.cron_check_recent_runs();
-- SELECT id, job_name, status_code, is_success, response_excerpt, triggered_at
--   FROM public.cron_job_runs
--  ORDER BY id DESC LIMIT 5;

-- D. Vérifier les échecs récents
-- SELECT job_name, status_code, response_excerpt, triggered_at, alerted
--   FROM public.cron_job_runs
--  WHERE is_success = false
--  ORDER BY triggered_at DESC LIMIT 10;

-- E. Forcer une alerte (si run en échec)
-- SELECT public.cron_alert_failures();
