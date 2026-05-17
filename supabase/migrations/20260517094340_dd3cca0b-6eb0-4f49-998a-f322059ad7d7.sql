CREATE OR REPLACE FUNCTION public.trg_notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net'
AS $function$
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
      'Authorization', 'Bearer ' || v_secret,
      'apikey', v_secret,
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
$function$;