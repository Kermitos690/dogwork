-- Push notification infrastructure, idempotent and safe for Test/Live publish

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  platform TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  failure_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_active
  ON public.push_subscriptions(user_id) WHERE is_active = true;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins read all push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Admins read all push subscriptions"
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID NOT NULL PRIMARY KEY,
  exercises_enabled BOOLEAN NOT NULL DEFAULT true,
  exercises_time TIME NOT NULL DEFAULT '18:00:00',
  messages_enabled BOOLEAN NOT NULL DEFAULT true,
  shelter_enabled BOOLEAN NOT NULL DEFAULT true,
  billing_enabled BOOLEAN NOT NULL DEFAULT true,
  timezone TEXT NOT NULL DEFAULT 'Europe/Zurich',
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own notification prefs" ON public.notification_preferences;
CREATE POLICY "Users manage own notification prefs"
  ON public.notification_preferences FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins read all notification prefs" ON public.notification_preferences;
CREATE POLICY "Admins read all notification prefs"
  ON public.notification_preferences FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  url TEXT,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  endpoints_total INTEGER NOT NULL DEFAULT 0,
  endpoints_succeeded INTEGER NOT NULL DEFAULT 0,
  endpoints_failed INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  dedup_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_created
  ON public.notification_logs(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_logs_dedup
  ON public.notification_logs(user_id, dedup_key) WHERE dedup_key IS NOT NULL;

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notification logs" ON public.notification_logs;
CREATE POLICY "Users read own notification logs"
  ON public.notification_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins read all notification logs" ON public.notification_logs;
CREATE POLICY "Admins read all notification logs"
  ON public.notification_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_push_subs_updated ON public.push_subscriptions;
CREATE TRIGGER trg_push_subs_updated
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_notif_prefs_updated ON public.notification_preferences;
CREATE TRIGGER trg_notif_prefs_updated
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.app_internal_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_internal_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_internal_settings FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  v_url text;
  v_secret text;
BEGIN
  SELECT value INTO v_url FROM public.app_internal_settings WHERE key = 'supabase_url';
  SELECT value INTO v_secret FROM public.app_internal_settings WHERE key = 'service_role_key';

  IF v_url IS NULL OR v_secret IS NULL THEN
    RAISE LOG 'trg_notify_new_message: settings missing';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := v_url || '/functions/v1/notify-message',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', v_secret
    ),
    body := jsonb_build_object(
      'message_id', NEW.id,
      'sender_id', NEW.sender_id,
      'recipient_id', NEW.recipient_id,
      'content', NEW.content
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'trg_notify_new_message failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.trg_notify_new_message() FROM anon, authenticated, public;

-- Security hardening from scan: users must read public pricing through masked views only.
DROP POLICY IF EXISTS "Authenticated users can read active packs" ON public.ai_credit_packs;
DROP POLICY IF EXISTS "Public can read active credit packs" ON public.ai_credit_packs;
DROP POLICY IF EXISTS "Public can read active AI features" ON public.ai_feature_catalog;
DROP POLICY IF EXISTS "Public can read active boosts (anonymized)" ON public.public_profile_boosts;

REVOKE SELECT (hashed_pin) ON public.shelter_employees FROM authenticated;
REVOKE SELECT (hashed_pin) ON public.shelter_employees FROM anon;