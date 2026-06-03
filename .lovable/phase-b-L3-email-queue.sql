-- =============================================================
-- PHASE B — L3 : Réparer la queue email LIVE
-- =============================================================
-- Cible : projet LIVE hdmmqwpypvhwohhhaqnf
--
-- DIAGNOSTIC :
--   pgmq.q_transactional_emails existe et contient 20 messages bloqués.
--   pgmq.q_auth_emails N'EXISTE PAS → le cron process-email-queue crashe
--   silencieusement toutes les 5 sec sur :
--     EXISTS (SELECT 1 FROM pgmq.q_auth_emails LIMIT 1)
--   donc net.http_post() n'est jamais appelé.
--
-- CORRECTION :
--   1. Créer la queue pgmq.q_auth_emails manquante (via API pgmq).
--   2. S'assurer que email_send_state contient bien la ligne id=1
--      (le cron lit retry_after_until depuis cette ligne).
--   3. Aucun email pending n'est supprimé.
-- =============================================================

-- 1. Créer la queue auth_emails si elle n'existe pas
SELECT pgmq.create('auth_emails')
WHERE NOT EXISTS (
  SELECT 1 FROM pgmq.list_queues() WHERE queue_name = 'auth_emails'
);

-- 2. Initialiser email_send_state ligne id=1 si vide
INSERT INTO public.email_send_state (id, batch_size, send_delay_ms, retry_after_until)
VALUES (1, 10, 250, NULL)
ON CONFLICT (id) DO NOTHING;

-- Vérification :
-- SELECT queue_name FROM pgmq.list_queues();
-- Attendu : auth_emails, transactional_emails
-- SELECT id, batch_size, retry_after_until FROM email_send_state;
-- Attendu : 1 ligne
-- SELECT count(*) FROM pgmq.q_transactional_emails;
-- Attendu : doit décroître dans les minutes suivant l'exécution.
