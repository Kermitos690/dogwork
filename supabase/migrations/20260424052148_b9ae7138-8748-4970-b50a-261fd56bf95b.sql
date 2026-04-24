
-- Trigger: envoi email welcome après confirmation email
-- On crée une table de notification pour découpler l'envoi (appel HTTP via pg_net depuis un edge cron serait l'idéal,
-- mais ici on utilise une approche simple : un trigger qui appelle l'edge function via pg_net si dispo, sinon
-- on enregistre une "notification queue" lue côté client/serveur. Simpler: utiliser pg_net.

-- Créer une fonction qui appelle l'edge send-transactional-email via pg_net
CREATE OR REPLACE FUNCTION public.send_welcome_email_on_confirm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_key text;
  v_display_name text;
BEGIN
  -- Only trigger when email_confirmed_at goes from NULL to a value
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL AND NEW.email IS NOT NULL THEN
    v_display_name := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));
    v_url := current_setting('app.settings.supabase_url', true);
    v_key := current_setting('app.settings.service_role_key', true);

    -- Fallback: read from vault if extension is set up; otherwise rely on stored configs.
    -- If pg_net is not available or settings are missing, we silently skip (edge function path will handle resends).
    BEGIN
      PERFORM net.http_post(
        url := COALESCE(v_url, 'https://dcwbqsfeouvghcnvhrpj.supabase.co') || '/functions/v1/send-transactional-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(v_key, current_setting('app.settings.anon_key', true))
        ),
        body := jsonb_build_object(
          'templateName', 'welcome',
          'recipientEmail', NEW.email,
          'idempotencyKey', 'welcome-' || NEW.id::text,
          'templateData', jsonb_build_object('name', v_display_name)
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- Don't block confirmation; log and continue
      RAISE NOTICE 'send_welcome_email_on_confirm: net.http_post failed: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing if exists
DROP TRIGGER IF EXISTS trg_send_welcome_email ON auth.users;

CREATE TRIGGER trg_send_welcome_email
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.send_welcome_email_on_confirm();
