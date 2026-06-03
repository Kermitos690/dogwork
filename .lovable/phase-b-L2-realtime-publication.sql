-- =============================================================
-- PHASE B — L2 : Publier les tables dans supabase_realtime (LIVE)
-- =============================================================
-- Cible : projet LIVE hdmmqwpypvhwohhhaqnf
-- Idempotent. Active le realtime in-app (toaster + messages + notifications).
-- =============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='notification_logs'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_logs';
  END IF;
END$$;

-- REPLICA IDENTITY FULL : nécessaire pour recevoir les UPDATE complets côté client.
ALTER TABLE public.notifications     REPLICA IDENTITY FULL;
ALTER TABLE public.messages          REPLICA IDENTITY FULL;
ALTER TABLE public.notification_logs REPLICA IDENTITY FULL;

-- Vérification :
-- SELECT tablename FROM pg_publication_tables WHERE pubname='supabase_realtime' ORDER BY tablename;
-- Attendu : messages, notification_logs, notifications
