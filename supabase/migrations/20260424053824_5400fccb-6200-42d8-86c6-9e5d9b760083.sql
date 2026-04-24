-- Drop existing functions first to allow renaming parameters
DROP FUNCTION IF EXISTS public._send_transactional_email(text, text, text, jsonb);

CREATE OR REPLACE FUNCTION public._send_transactional_email(
  _template_name text,
  _recipient_email text,
  _idempotency_key text,
  _template_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_key text;
BEGIN
  IF _recipient_email IS NULL OR _recipient_email = '' THEN
    RETURN;
  END IF;

  v_url := current_setting('app.settings.supabase_url', true);
  v_key := current_setting('app.settings.service_role_key', true);

  IF v_url IS NULL OR v_url = '' OR v_key IS NULL OR v_key = '' THEN
    RAISE WARNING '[_send_transactional_email] Missing app.settings.supabase_url or app.settings.service_role_key — skipping send for template=% recipient=%', _template_name, _recipient_email;
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url || '/functions/v1/send-transactional-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object(
      'templateName', _template_name,
      'recipientEmail', _recipient_email,
      'idempotencyKey', _idempotency_key,
      'templateData', COALESCE(_template_data, '{}'::jsonb)
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[_send_transactional_email] Failed: % (template=%, recipient=%)', SQLERRM, _template_name, _recipient_email;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_welcome_email_on_confirm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_key text;
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at)
     AND NEW.email IS NOT NULL THEN

    v_url := current_setting('app.settings.supabase_url', true);
    v_key := current_setting('app.settings.service_role_key', true);

    IF v_url IS NULL OR v_url = '' OR v_key IS NULL OR v_key = '' THEN
      RAISE WARNING '[send_welcome_email_on_confirm] Missing app.settings.supabase_url or app.settings.service_role_key — skipping welcome email for %', NEW.email;
      RETURN NEW;
    END IF;

    BEGIN
      PERFORM net.http_post(
        url := v_url || '/functions/v1/send-transactional-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body := jsonb_build_object(
          'templateName', 'welcome',
          'recipientEmail', NEW.email,
          'idempotencyKey', 'welcome-' || NEW.id::text,
          'templateData', jsonb_build_object(
            'displayName', COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', '')
          )
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[send_welcome_email_on_confirm] Failed: % (recipient=%)', SQLERRM, NEW.email;
    END;
  END IF;

  RETURN NEW;
END;
$$;