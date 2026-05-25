-- ============================================================
-- Phase 5B — Correctifs LIVE (hdmmqwpypvhwohhhaqnf)
-- À exécuter dans : Cloud View > Run SQL (env = Live)
-- TEST est déjà conforme — ne PAS exécuter sur TEST.
--
-- Avant exécution :
--   1) Vérifier que la fonction edge `monthly-credit-grant` est déployée sur LIVE
--   2) Remplacer <LIVE_ANON_KEY> par la clé anon publique du projet LIVE
--      (Cloud > Settings > API > anon public key)
-- ============================================================

-- 1. Realtime — ajouter messages + notifications à la publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- REPLICA IDENTITY FULL pour récupérer le old record lors des UPDATE/DELETE
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- 2. Cron — grant mensuel des crédits IA (tous les 1ers du mois à 02:00 UTC)
SELECT cron.schedule(
  'monthly-ai-credit-grant',
  '0 2 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://hdmmqwpypvhwohhhaqnf.supabase.co/functions/v1/monthly-credit-grant',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <LIVE_ANON_KEY>"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);

-- 3. Cron — filet de sécurité quotidien (rattrape les utilisateurs manqués)
SELECT cron.schedule(
  'monthly-credit-grant-daily',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://hdmmqwpypvhwohhhaqnf.supabase.co/functions/v1/monthly-credit-grant',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <LIVE_ANON_KEY>'
    ),
    body := jsonb_build_object('triggered_at', now()::text, 'source', 'pg_cron-daily')
  ) AS request_id;
  $$
);

-- 4. (Optionnel) Rappels rendez-vous quotidiens 08:00 UTC
SELECT cron.schedule(
  'send-appointment-reminders-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://hdmmqwpypvhwohhhaqnf.supabase.co/functions/v1/send-appointment-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <LIVE_ANON_KEY>"}'::jsonb,
    body := '{"triggered_by": "cron"}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================
-- Vérifications post-exécution
-- ============================================================
-- SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname='supabase_realtime';
-- SELECT jobname, schedule FROM cron.job ORDER BY jobid;
