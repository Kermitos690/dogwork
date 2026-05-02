-- ===== 1. Étendre les catégories de notifications =====
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS plans_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS appointments_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS support_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS admin_alerts_enabled boolean NOT NULL DEFAULT true;

-- ===== 2. Helper SQL générique : appelle dispatch-push via pg_net =====
-- Lit l'URL Supabase et le service role depuis app_internal_settings (déjà rempli par setup-push-internals).
CREATE OR REPLACE FUNCTION public.notify_users_push(
  p_user_id uuid,
  p_broadcast_role text,
  p_category text,
  p_title text,
  p_body text,
  p_url text DEFAULT '/',
  p_tag text DEFAULT NULL,
  p_dedup_key text DEFAULT NULL,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_secret text;
  v_payload jsonb;
BEGIN
  SELECT value INTO v_url FROM public.app_internal_settings WHERE key = 'supabase_url';
  SELECT value INTO v_secret FROM public.app_internal_settings WHERE key = 'service_role_key';

  IF v_url IS NULL OR v_secret IS NULL THEN
    RETURN; -- silencieux : la 1re visite admin déclenche setup-push-internals
  END IF;

  v_payload := jsonb_build_object(
    'category', p_category,
    'title', p_title,
    'body', p_body,
    'url', p_url,
    'tag', p_tag,
    'dedup_key', p_dedup_key,
    'data', p_data
  );

  IF p_user_id IS NOT NULL THEN
    v_payload := v_payload || jsonb_build_object('user_id', p_user_id);
  ELSIF p_broadcast_role IS NOT NULL THEN
    v_payload := v_payload || jsonb_build_object('broadcast_role', p_broadcast_role);
  ELSE
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url || '/functions/v1/dispatch-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', v_secret
    ),
    body := v_payload
  );
EXCEPTION WHEN OTHERS THEN
  -- Ne JAMAIS bloquer la transaction métier sur un échec push
  RAISE WARNING 'notify_users_push failed: %', SQLERRM;
END;
$$;

-- ===== 3. Triggers utilisateur : training_plans (nouveau plan) =====
CREATE OR REPLACE FUNCTION public.notify_push_on_new_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_template = true OR NEW.user_id IS NULL THEN RETURN NEW; END IF;
  PERFORM public.notify_users_push(
    NEW.user_id, NULL, 'plans',
    'Nouveau plan disponible',
    COALESCE(NEW.title, 'Un plan d''entraînement vient d''être généré pour votre chien.'),
    '/plan',
    'plan-' || NEW.id::text,
    'plan-new-' || NEW.id::text,
    jsonb_build_object('plan_id', NEW.id)
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_push_new_plan ON public.training_plans;
CREATE TRIGGER trg_notify_push_new_plan
  AFTER INSERT ON public.training_plans
  FOR EACH ROW EXECUTE FUNCTION public.notify_push_on_new_plan();

-- ===== 4. Trigger : coach_calendar_events (rdv) =====
CREATE OR REPLACE FUNCTION public.notify_push_on_appointment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_when text;
BEGIN
  IF NEW.is_available_slot = true OR NEW.client_user_id IS NULL THEN RETURN NEW; END IF;
  v_when := to_char(NEW.start_at AT TIME ZONE 'Europe/Zurich', 'DD/MM à HH24:MI');
  PERFORM public.notify_users_push(
    NEW.client_user_id, NULL, 'appointments',
    'Nouveau rendez-vous coach',
    COALESCE(NEW.title, 'Rendez-vous') || ' — ' || v_when,
    '/messages',
    'appt-' || NEW.id::text,
    'appt-new-' || NEW.id::text,
    jsonb_build_object('event_id', NEW.id)
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_push_appointment ON public.coach_calendar_events;
CREATE TRIGGER trg_notify_push_appointment
  AFTER INSERT ON public.coach_calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.notify_push_on_appointment();

-- ===== 5. Trigger : adoption_plans (plan adoption généré pour adoptant) =====
CREATE OR REPLACE FUNCTION public.notify_push_on_adoption_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_adopter uuid;
BEGIN
  -- Le plan vise l'adoptant. Récupérer via shelter_animals -> adopter_links
  SELECT al.adopter_user_id INTO v_adopter
  FROM public.shelter_animals sa
  JOIN public.adopter_links al ON al.animal_id = sa.id
  WHERE sa.id = NEW.animal_id
  LIMIT 1;
  IF v_adopter IS NULL THEN RETURN NEW; END IF;
  PERFORM public.notify_users_push(
    v_adopter, NULL, 'adoption',
    'Nouveau plan post-adoption',
    'Votre refuge vous a partagé un plan personnalisé pour les premières semaines.',
    '/adoption-followup',
    'adoption-plan-' || NEW.id::text,
    'adoption-plan-' || NEW.id::text,
    jsonb_build_object('plan_id', NEW.id, 'animal_id', NEW.animal_id)
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_push_adoption_plan ON public.adoption_plans;
CREATE TRIGGER trg_notify_push_adoption_plan
  AFTER INSERT ON public.adoption_plans
  FOR EACH ROW EXECUTE FUNCTION public.notify_push_on_adoption_plan();

-- ===== 6. Trigger : billing_events (paiement / abonnement) =====
CREATE OR REPLACE FUNCTION public.notify_push_on_billing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title text; v_body text; v_url text;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  v_url := '/subscription';
  CASE
    WHEN NEW.event_type LIKE 'invoice.payment_succeeded%' OR NEW.event_type LIKE 'checkout.session.completed%' THEN
      v_title := 'Paiement confirmé';
      v_body := 'Votre paiement a été pris en compte. Merci !';
    WHEN NEW.event_type LIKE 'invoice.payment_failed%' THEN
      v_title := 'Échec de paiement';
      v_body := 'Votre dernier paiement a échoué. Mettez à jour votre moyen de paiement.';
    WHEN NEW.event_type LIKE 'customer.subscription.deleted%' THEN
      v_title := 'Abonnement annulé';
      v_body := 'Votre abonnement vient d''être annulé.';
    WHEN NEW.event_type LIKE 'customer.subscription.updated%' THEN
      v_title := 'Abonnement mis à jour';
      v_body := 'Votre abonnement a été mis à jour.';
    ELSE
      RETURN NEW; -- on ignore les autres
  END CASE;

  PERFORM public.notify_users_push(
    NEW.user_id, NULL, 'billing', v_title, v_body, v_url,
    'billing-' || NEW.id::text,
    'billing-' || NEW.stripe_event_id,
    jsonb_build_object('event_id', NEW.id, 'event_type', NEW.event_type)
  );

  -- broadcast admin sur événements critiques
  IF NEW.event_type LIKE 'invoice.payment_failed%'
     OR NEW.event_type LIKE 'charge.dispute%' THEN
    PERFORM public.notify_users_push(
      NULL, 'admin', 'admin_alerts',
      'Stripe : ' || NEW.event_type,
      'Événement Stripe nécessitant attention.',
      '/admin/stripe',
      'admin-billing-' || NEW.id::text,
      'admin-billing-' || NEW.stripe_event_id,
      jsonb_build_object('event_id', NEW.id, 'event_type', NEW.event_type)
    );
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_push_billing ON public.billing_events;
CREATE TRIGGER trg_notify_push_billing
  AFTER INSERT ON public.billing_events
  FOR EACH ROW EXECUTE FUNCTION public.notify_push_on_billing();

-- ===== 7. Trigger : support_tickets (broadcast admin sur création + push user sur réponse) =====
CREATE OR REPLACE FUNCTION public.notify_push_on_ticket_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_users_push(
    NULL, 'admin', 'admin_alerts',
    'Nouveau ticket support',
    COALESCE(NEW.subject, 'Un utilisateur a ouvert un ticket'),
    '/admin/tickets',
    'ticket-' || NEW.id::text,
    'ticket-new-' || NEW.id::text,
    jsonb_build_object('ticket_id', NEW.id)
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_push_ticket_created ON public.support_tickets;
CREATE TRIGGER trg_notify_push_ticket_created
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_push_on_ticket_created();

CREATE OR REPLACE FUNCTION public.notify_push_on_ticket_replied()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Détection : l'admin a répondu (status devient 'replied' ou admin_response change)
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'replied' AND NEW.user_id IS NOT NULL THEN
    PERFORM public.notify_users_push(
      NEW.user_id, NULL, 'support',
      'Réponse à votre ticket',
      COALESCE(NEW.subject, 'Le support a répondu à votre demande'),
      '/support',
      'ticket-' || NEW.id::text,
      'ticket-reply-' || NEW.id::text || '-' || extract(epoch from now())::text,
      jsonb_build_object('ticket_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_push_ticket_replied ON public.support_tickets;
CREATE TRIGGER trg_notify_push_ticket_replied
  AFTER UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_push_on_ticket_replied();

-- ===== 8. Trigger : profiles (broadcast admin sur nouvelle inscription) =====
CREATE OR REPLACE FUNCTION public.notify_push_on_new_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_users_push(
    NULL, 'admin', 'admin_alerts',
    'Nouvelle inscription',
    COALESCE(NEW.display_name, 'Un nouvel utilisateur') || ' vient de s''inscrire.',
    '/admin',
    'signup-' || NEW.user_id::text,
    'signup-' || NEW.user_id::text,
    jsonb_build_object('user_id', NEW.user_id)
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_push_new_signup ON public.profiles;
CREATE TRIGGER trg_notify_push_new_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_push_on_new_signup();

-- ===== 9. Trigger : courses (broadcast admin quand un coach soumet un cours à validation) =====
CREATE OR REPLACE FUNCTION public.notify_push_on_course_submitted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.approval_status = 'pending' THEN
    PERFORM public.notify_users_push(
      NULL, 'admin', 'admin_alerts',
      'Cours à valider',
      COALESCE(NEW.title, 'Un coach a soumis un nouveau cours.'),
      '/admin?tab=courses',
      'course-' || NEW.id::text,
      'course-pending-' || NEW.id::text,
      jsonb_build_object('course_id', NEW.id)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.approval_status IS DISTINCT FROM NEW.approval_status
        AND NEW.approval_status = 'approved' AND NEW.educator_user_id IS NOT NULL THEN
    -- Notifier le coach que son cours est validé
    PERFORM public.notify_users_push(
      NEW.educator_user_id, NULL, 'admin_alerts',
      'Cours validé',
      'Votre cours « ' || COALESCE(NEW.title, '') || ' » a été approuvé.',
      '/coach/courses',
      'course-' || NEW.id::text,
      'course-approved-' || NEW.id::text,
      jsonb_build_object('course_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_push_course_submitted ON public.courses;
CREATE TRIGGER trg_notify_push_course_submitted
  AFTER INSERT OR UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.notify_push_on_course_submitted();

-- ===== 10. Trigger : course_bookings (notif coach quand un user réserve) =====
CREATE OR REPLACE FUNCTION public.notify_push_on_course_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_coach uuid; v_title text;
BEGIN
  SELECT educator_user_id, title INTO v_coach, v_title FROM public.courses WHERE id = NEW.course_id;
  IF v_coach IS NULL THEN RETURN NEW; END IF;
  PERFORM public.notify_users_push(
    v_coach, NULL, 'appointments',
    'Nouvelle réservation',
    'Une réservation pour « ' || COALESCE(v_title, 'votre cours') || ' » vient d''arriver.',
    '/coach/courses',
    'booking-' || NEW.id::text,
    'booking-' || NEW.id::text,
    jsonb_build_object('booking_id', NEW.id, 'course_id', NEW.course_id)
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_push_course_booking ON public.course_bookings;
CREATE TRIGGER trg_notify_push_course_booking
  AFTER INSERT ON public.course_bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_push_on_course_booking();