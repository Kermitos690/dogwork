-- Table interne (zéro accès utilisateur)
CREATE TABLE IF NOT EXISTS public.app_internal_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_internal_settings ENABLE ROW LEVEL SECURITY;
-- Aucune policy → seul service_role / postgres y accèdent

REVOKE ALL ON public.app_internal_settings FROM anon, authenticated;

-- Recrée le trigger en lisant la table interne (SECURITY DEFINER bypass RLS)
CREATE OR REPLACE FUNCTION public.trg_notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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

  PERFORM extensions.http_post(
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