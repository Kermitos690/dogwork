
-- Helper function: appel HTTP vers send-transactional-email via pg_net
CREATE OR REPLACE FUNCTION public._send_transactional_email(
  _template_name text,
  _recipient_email text,
  _idempotency_key text,
  _template_data jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjd2Jxc2Zlb3V2Z2hjbnZocnBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzkxMDcsImV4cCI6MjA4ODgxNTEwN30.wF0VlmMKVqeJOo2q3GlWVzl1-EyYMd3-i2YDhYBKfog';
BEGIN
  IF _recipient_email IS NULL OR _recipient_email = '' THEN
    RETURN;
  END IF;
  BEGIN
    PERFORM net.http_post(
      url := 'https://dcwbqsfeouvghcnvhrpj.supabase.co/functions/v1/send-transactional-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_anon_key
      ),
      body := jsonb_build_object(
        'templateName', _template_name,
        'recipientEmail', _recipient_email,
        'idempotencyKey', _idempotency_key,
        'templateData', _template_data
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '_send_transactional_email failed (%): %', _template_name, SQLERRM;
  END;
END;
$$;

-- ─── Trigger: nouveau message ───
CREATE OR REPLACE FUNCTION public.notify_email_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_recipient_email text;
  v_recipient_name text;
  v_sender_name text;
BEGIN
  SELECT u.email, COALESCE(p.display_name, split_part(u.email,'@',1))
    INTO v_recipient_email, v_recipient_name
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE u.id = NEW.recipient_id;

  SELECT COALESCE(p.display_name, split_part(u.email,'@',1))
    INTO v_sender_name
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE u.id = NEW.sender_id;

  PERFORM public._send_transactional_email(
    'new-message',
    v_recipient_email,
    'msg-' || NEW.id::text,
    jsonb_build_object(
      'recipientName', v_recipient_name,
      'senderName', COALESCE(v_sender_name, 'Un utilisateur'),
      'preview', LEFT(NEW.content, 200)
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_new_message ON public.messages;
CREATE TRIGGER trg_email_new_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_email_on_new_message();

-- ─── Trigger: ticket support créé ───
CREATE OR REPLACE FUNCTION public.notify_email_on_ticket_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email text;
  v_name text;
BEGIN
  SELECT u.email, COALESCE(p.display_name, split_part(u.email,'@',1))
    INTO v_email, v_name
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE u.id = NEW.user_id;

  PERFORM public._send_transactional_email(
    'support-ticket-created',
    v_email,
    'ticket-created-' || NEW.id::text,
    jsonb_build_object(
      'name', v_name,
      'ticketTitle', NEW.title,
      'ticketCategory', COALESCE(NEW.category, 'other'),
      'ticketId', NEW.id::text
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_ticket_created ON public.support_tickets;
CREATE TRIGGER trg_email_ticket_created
AFTER INSERT ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.notify_email_on_ticket_created();

-- ─── Trigger: réponse admin sur ticket ───
CREATE OR REPLACE FUNCTION public.notify_email_on_ticket_replied()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email text;
  v_name text;
BEGIN
  -- Only fire when admin_response transitions from NULL/empty to a value, OR changes
  IF (COALESCE(OLD.admin_response, '') = '' AND COALESCE(NEW.admin_response, '') <> '')
     OR (COALESCE(OLD.admin_response, '') <> COALESCE(NEW.admin_response, '') AND COALESCE(NEW.admin_response, '') <> '') THEN
    SELECT u.email, COALESCE(p.display_name, split_part(u.email,'@',1))
      INTO v_email, v_name
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    WHERE u.id = NEW.user_id;

    PERFORM public._send_transactional_email(
      'support-ticket-replied',
      v_email,
      'ticket-reply-' || NEW.id::text || '-' || extract(epoch from now())::bigint::text,
      jsonb_build_object(
        'name', v_name,
        'ticketTitle', NEW.title,
        'response', NEW.admin_response,
        'status', NEW.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_ticket_replied ON public.support_tickets;
CREATE TRIGGER trg_email_ticket_replied
AFTER UPDATE OF admin_response ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.notify_email_on_ticket_replied();

-- ─── Trigger: check-in adoption créé ───
CREATE OR REPLACE FUNCTION public.notify_email_on_adoption_checkin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email text;
  v_name text;
  v_animal_name text;
BEGIN
  SELECT u.email, COALESCE(p.display_name, split_part(u.email,'@',1))
    INTO v_email, v_name
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE u.id = NEW.adopter_user_id;

  SELECT name INTO v_animal_name
  FROM public.shelter_animals
  WHERE id = NEW.animal_id;

  PERFORM public._send_transactional_email(
    'adoption-checkin-due',
    v_email,
    'checkin-' || NEW.id::text,
    jsonb_build_object(
      'name', v_name,
      'animalName', COALESCE(v_animal_name, 'votre animal'),
      'weekNumber', NEW.checkin_week,
      'dueDate', NEW.due_date::text
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_adoption_checkin ON public.adoption_checkins;
CREATE TRIGGER trg_email_adoption_checkin
AFTER INSERT ON public.adoption_checkins
FOR EACH ROW EXECUTE FUNCTION public.notify_email_on_adoption_checkin();
