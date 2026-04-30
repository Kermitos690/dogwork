-- =====================================================
-- WEB PUSH NOTIFICATIONS — Infra DB
-- =====================================================

-- 1) Abonnements push (1 user peut avoir plusieurs devices)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  platform TEXT, -- 'ios' | 'android' | 'desktop' | 'unknown'
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

CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all push subscriptions"
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2) Préférences notifications (par catégorie)
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

CREATE POLICY "Users manage own notification prefs"
  ON public.notification_preferences FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all notification prefs"
  ON public.notification_preferences FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3) Journal d'envois (audit + debug + dédup)
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL, -- 'exercises' | 'messages' | 'shelter' | 'billing' | 'system'
  title TEXT NOT NULL,
  body TEXT,
  url TEXT,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'sent' | 'partial' | 'failed' | 'skipped'
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

CREATE POLICY "Users read own notification logs"
  ON public.notification_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins read all notification logs"
  ON public.notification_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- (Pas de policy INSERT/UPDATE → seul service_role écrit, depuis edge function send-push)

-- 4) Triggers updated_at
CREATE TRIGGER trg_push_subs_updated
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_notif_prefs_updated
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
