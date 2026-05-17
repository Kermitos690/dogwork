
-- 1. Table notifications (user-facing, distincte de notification_logs technique)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL,
  actor_user_id uuid NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  url text NULL,
  image_url text NULL,
  priority text NOT NULL DEFAULT 'normal',
  read_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON public.notifications (recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications (recipient_user_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS : user lit ses notifs
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = recipient_user_id);

-- RLS : admin diag
DROP POLICY IF EXISTS "Admins read all notifications" ON public.notifications;
CREATE POLICY "Admins read all notifications"
  ON public.notifications FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS : user marque comme lu (seul ce champ change ; les autres restent figés)
DROP POLICY IF EXISTS "Users mark own notifications read" ON public.notifications;
CREATE POLICY "Users mark own notifications read"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = recipient_user_id)
  WITH CHECK (auth.uid() = recipient_user_id);

-- Pas d'INSERT/DELETE pour les clients : tout passe par service_role ou la RPC.

-- 2. RPC sécurisée create_notification (SECURITY DEFINER, réservée service_role)
CREATE OR REPLACE FUNCTION public.create_notification(
  p_recipient_user_id uuid,
  p_type text,
  p_title text,
  p_body text DEFAULT '',
  p_url text DEFAULT NULL,
  p_image_url text DEFAULT NULL,
  p_priority text DEFAULT 'normal',
  p_actor_user_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_caller_role text;
BEGIN
  -- N'autorise que service_role (édge functions backend)
  v_caller_role := current_setting('request.jwt.claim.role', true);
  IF v_caller_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden: create_notification requires service_role';
  END IF;

  IF p_recipient_user_id IS NULL OR p_type IS NULL OR p_title IS NULL THEN
    RAISE EXCEPTION 'missing required fields';
  END IF;

  INSERT INTO public.notifications (
    recipient_user_id, actor_user_id, type, title, body,
    url, image_url, priority, metadata
  ) VALUES (
    p_recipient_user_id, p_actor_user_id, p_type, p_title, COALESCE(p_body,''),
    p_url, p_image_url,
    CASE WHEN p_priority IN ('low','normal','high') THEN p_priority ELSE 'normal' END,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_notification(uuid,text,text,text,text,text,text,uuid,jsonb) FROM PUBLIC, anon, authenticated;

-- 3. Realtime publication
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
