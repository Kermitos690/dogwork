
-- Billing sync alerts table for admin monitoring of webhook desync
CREATE TABLE IF NOT EXISTS public.billing_sync_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  period_hours INTEGER NOT NULL DEFAULT 24,
  event_count INTEGER NOT NULL DEFAULT 0,
  severity TEXT NOT NULL DEFAULT 'warning',
  message TEXT NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.billing_sync_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access billing_sync_alerts"
ON public.billing_sync_alerts
FOR ALL TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

CREATE INDEX IF NOT EXISTS idx_billing_sync_alerts_triggered ON public.billing_sync_alerts(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_sync_alerts_unresolved ON public.billing_sync_alerts(resolved_at) WHERE resolved_at IS NULL;

-- Function checking billing_events freshness and raising alert if 0 events in window
CREATE OR REPLACE FUNCTION public.check_billing_events_sync(_period_hours INTEGER DEFAULT 24)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_last_event TIMESTAMPTZ;
  v_alert_id UUID;
  v_existing UUID;
BEGIN
  SELECT COUNT(*), MAX(created_at)
    INTO v_count, v_last_event
  FROM public.billing_events
  WHERE created_at >= now() - make_interval(hours => _period_hours);

  IF v_count = 0 THEN
    -- Don't duplicate unresolved alert from last 24h
    SELECT id INTO v_existing
    FROM public.billing_sync_alerts
    WHERE resolved_at IS NULL
      AND triggered_at >= now() - interval '24 hours'
    LIMIT 1;

    IF v_existing IS NULL THEN
      INSERT INTO public.billing_sync_alerts(period_hours, event_count, severity, message, metadata)
      VALUES (
        _period_hours,
        0,
        CASE WHEN _period_hours >= 48 THEN 'critical' ELSE 'warning' END,
        format('Aucun billing_event reçu depuis %s heures. Vérifier le webhook Stripe.', _period_hours),
        jsonb_build_object('last_event_at', v_last_event)
      )
      RETURNING id INTO v_alert_id;
    ELSE
      v_alert_id := v_existing;
    END IF;
  ELSE
    -- Auto-resolve open alerts when events resume
    UPDATE public.billing_sync_alerts
       SET resolved_at = now()
     WHERE resolved_at IS NULL;
  END IF;

  RETURN jsonb_build_object(
    'period_hours', _period_hours,
    'event_count', v_count,
    'last_event_at', v_last_event,
    'alert_id', v_alert_id,
    'checked_at', now()
  );
END;
$$;

-- Schedule daily check at 08:00 UTC via pg_cron (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('billing-events-sync-check') WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'billing-events-sync-check'
    );
    PERFORM cron.schedule(
      'billing-events-sync-check',
      '0 8 * * *',
      $cron$ SELECT public.check_billing_events_sync(24); $cron$
    );
  END IF;
END $$;
