-- ════════════════════════════════════════════════════════════════
-- DogWork Module — Correctifs P0 (idempotents, non destructifs) v2
-- ════════════════════════════════════════════════════════════════

-- 1. course_bookings : colonnes manquantes
ALTER TABLE public.course_bookings ADD COLUMN IF NOT EXISTS stripe_session_id        text;
ALTER TABLE public.course_bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
ALTER TABLE public.course_bookings ADD COLUMN IF NOT EXISTS educator_payout_cents    integer;
ALTER TABLE public.course_bookings ADD COLUMN IF NOT EXISTS refunded_at              timestamptz;
ALTER TABLE public.course_bookings ADD COLUMN IF NOT EXISTS refund_reason            text;
ALTER TABLE public.course_bookings ADD COLUMN IF NOT EXISTS paid_at                  timestamptz;
ALTER TABLE public.course_bookings ADD COLUMN IF NOT EXISTS confirmed_at             timestamptz;
ALTER TABLE public.course_bookings ADD COLUMN IF NOT EXISTS source_checked_at        timestamptz;
ALTER TABLE public.course_bookings ADD COLUMN IF NOT EXISTS compliance_status        text DEFAULT 'pending';
ALTER TABLE public.course_bookings ADD COLUMN IF NOT EXISTS referral_code_id         uuid;
ALTER TABLE public.course_bookings ADD COLUMN IF NOT EXISTS origin                   text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_bookings_referral_code_id_fkey') THEN
    ALTER TABLE public.course_bookings
      ADD CONSTRAINT course_bookings_referral_code_id_fkey
      FOREIGN KEY (referral_code_id) REFERENCES public.educator_referral_codes(id) ON DELETE SET NULL;
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS course_bookings_stripe_session_uidx
  ON public.course_bookings (stripe_session_id) WHERE stripe_session_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS course_bookings_stripe_pi_uidx
  ON public.course_bookings (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS course_bookings_user_idx           ON public.course_bookings (user_id);
CREATE INDEX IF NOT EXISTS course_bookings_payment_status_idx ON public.course_bookings (payment_status);
CREATE INDEX IF NOT EXISTS course_bookings_origin_idx         ON public.course_bookings (origin);
CREATE INDEX IF NOT EXISTS course_bookings_referral_code_idx
  ON public.course_bookings (referral_code_id) WHERE referral_code_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_bookings_payment_status_chk') THEN
    ALTER TABLE public.course_bookings
      ADD CONSTRAINT course_bookings_payment_status_chk
      CHECK (payment_status IS NULL OR payment_status IN ('pending','unpaid','paid','failed','refunded','cancelled')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_bookings_status_chk') THEN
    ALTER TABLE public.course_bookings
      ADD CONSTRAINT course_bookings_status_chk
      CHECK (status IS NULL OR status IN ('pending','confirmed','cancelled','refunded','rejected')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_bookings_origin_chk') THEN
    ALTER TABLE public.course_bookings
      ADD CONSTRAINT course_bookings_origin_chk
      CHECK (origin IS NULL OR origin IN ('dogwork_marketplace','educator_referral','educator_import','platform','educator_invite')) NOT VALID;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_participants_booking_uniq') THEN
    ALTER TABLE public.course_participants
      ADD CONSTRAINT course_participants_booking_uniq UNIQUE (course_id, booking_id);
  END IF;
END$$;

-- 2. courses : colonnes
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS start_at                   timestamptz;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS end_at                     timestamptz;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS requires_dogwork_payment   boolean DEFAULT true NOT NULL;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS compliance_required        boolean DEFAULT true NOT NULL;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS charter_required           boolean DEFAULT true NOT NULL;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS module_required            text    DEFAULT 'payments_marketplace';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS publication_blocked_reason text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS suspended_at               timestamptz;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_public                  boolean DEFAULT false NOT NULL;

-- 3. detect_external_payment_terms
CREATE OR REPLACE FUNCTION public.detect_external_payment_terms(input_text text)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  t text; p text;
  patterns text[] := ARRAY[
    'paiement hors plateforme','hors plateforme','paiement externe',
    'paiement direct','paiement en direct','paiement manuel',
    'payer sur place','paiement sur place','payer en cash','en cash',
    'en especes','en espèces','cash uniquement','cash only',
    'twint direct','twint perso','twint au',
    'virement direct','virement bancaire','iban',
    'whatsapp pour payer','whatsapp moi','contactez-moi pour payer',
    'contactez moi pour payer','contacte moi pour payer',
    'revolut direct','revolut moi','paypal direct','paypal moi',
    'paypal.me','wise direct','venmo'
  ];
BEGIN
  IF input_text IS NULL OR length(trim(input_text)) = 0 THEN RETURN false; END IF;
  t := lower(input_text);
  FOREACH p IN ARRAY patterns LOOP
    IF position(p IN t) > 0 THEN RETURN true; END IF;
  END LOOP;
  RETURN false;
END;
$$;

-- 4. Restrictions actives
CREATE OR REPLACE FUNCTION public.has_active_marketplace_restriction(p_educator_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.marketplace_restrictions r
    WHERE r.educator_id = p_educator_id
      AND r.status = 'active'
      AND r.restriction_type IN ('account_suspended','module_suspended','marketplace_limited','permanent_ban','payouts_hold')
      AND r.starts_at <= now()
      AND (r.ends_at IS NULL OR r.ends_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.get_active_marketplace_restrictions(p_educator_id uuid)
RETURNS TABLE(restriction_type text, severity text, reason text, starts_at timestamptz, ends_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT r.restriction_type, r.severity, r.reason, r.starts_at, r.ends_at
  FROM public.marketplace_restrictions r
  WHERE r.educator_id = p_educator_id
    AND r.status = 'active'
    AND r.starts_at <= now()
    AND (r.ends_at IS NULL OR r.ends_at > now());
$$;

-- 5. has_module aligné sur le schéma RÉEL (status='active', pas is_active)
CREATE OR REPLACE FUNCTION public.has_module(_user_id uuid, _organization_id uuid, _module_slug text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_modules um
      WHERE um.user_id = _user_id AND um.module_slug = _module_slug
        AND um.status = 'active'
        AND (um.expires_at IS NULL OR um.expires_at > now())
    )
    OR (
      _organization_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.organization_modules om
        WHERE om.organization_id = _organization_id AND om.module_slug = _module_slug
          AND om.status = 'active'
          AND (om.expires_at IS NULL OR om.expires_at > now())
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.admin_subscriptions s
      JOIN public.plan_modules pm ON pm.plan_slug = s.tier
      WHERE s.user_id = _user_id AND s.is_active = true
        AND pm.module_slug = _module_slug
    );
$$;

-- 6. calculate_course_commission
CREATE OR REPLACE FUNCTION public.calculate_course_commission(
  p_course_id uuid,
  p_user_id   uuid,
  p_origin    text,
  p_referral_code text,
  p_amount_cents integer
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_course_educator uuid;
  v_rate numeric := 0.15;
  v_applied_origin text := 'dogwork_marketplace';
  v_referral_valid boolean := false;
  v_referral_id uuid := NULL;
  v_amt integer := COALESCE(p_amount_cents,0);
  v_commission_cents integer;
  v_payout_cents integer;
BEGIN
  IF v_amt <= 0 THEN RAISE EXCEPTION 'Montant de cours invalide'; END IF;

  SELECT educator_user_id INTO v_course_educator FROM public.courses WHERE id = p_course_id;
  IF v_course_educator IS NULL THEN RAISE EXCEPTION 'Cours introuvable'; END IF;

  IF p_origin IN ('educator_referral','educator_import','educator_invite')
     AND p_referral_code IS NOT NULL AND length(trim(p_referral_code)) > 0 THEN
    SELECT id INTO v_referral_id
    FROM public.educator_referral_codes
    WHERE lower(code) = lower(trim(p_referral_code))
      AND status = 'active'
      AND educator_id = v_course_educator
      AND (expires_at IS NULL OR expires_at > now())
    LIMIT 1;
    IF v_referral_id IS NOT NULL THEN
      v_referral_valid := true;
      v_rate := 0.08;
      v_applied_origin := 'educator_referral';
    END IF;
  END IF;

  IF v_rate < 0.08 THEN v_rate := 0.15; END IF;

  v_commission_cents := GREATEST(1, ROUND(v_amt * v_rate)::int);
  v_payout_cents := v_amt - v_commission_cents;

  RETURN jsonb_build_object(
    'commission_rate',       v_rate,
    'commission_cents',      v_commission_cents,
    'educator_payout_cents', v_payout_cents,
    'applied_origin',        v_applied_origin,
    'referral_code_valid',   v_referral_valid,
    'referral_code_id',      v_referral_id
  );
END;
$$;

-- 7. Trigger publication
CREATE OR REPLACE FUNCTION public.enforce_course_publication_rules()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_published boolean;
  v_charter_ok   boolean;
  v_module_ok    boolean;
  v_restricted   boolean;
  v_external     boolean;
BEGIN
  v_is_published := COALESCE(NEW.is_public, false)
                    OR COALESCE(NEW.approval_status, 'pending') = 'approved';

  IF v_is_published AND COALESCE(NEW.requires_dogwork_payment, true) = false THEN
    RAISE EXCEPTION 'Le paiement via DogWork est obligatoire pour toute offre publiée.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_is_published AND COALESCE(NEW.max_participants, 0) <= 0 THEN
    RAISE EXCEPTION 'Le nombre maximal de participants doit être supérieur à zéro.'
      USING ERRCODE = 'check_violation';
  END IF;

  v_external := public.detect_external_payment_terms(
    COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.description, '')
  );
  IF v_external THEN
    BEGIN
      INSERT INTO public.marketplace_policy_flags
        (educator_id, course_id, flag_type, severity, description, status)
      VALUES (NEW.educator_user_id, NEW.id, 'forbidden_terms', 'high',
              'Mention de paiement externe détectée à la création/édition du cours.', 'open');
    EXCEPTION WHEN OTHERS THEN NULL; END;
    RAISE EXCEPTION 'Les consignes de paiement externe sont interdites dans une offre DogWork.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_is_published THEN
    SELECT EXISTS (SELECT 1 FROM public.coach_charter_acceptances WHERE user_id = NEW.educator_user_id)
      INTO v_charter_ok;
    IF NOT v_charter_ok THEN
      RAISE EXCEPTION 'Charte coach requise avant publication d''un cours.' USING ERRCODE = 'check_violation';
    END IF;

    v_module_ok := public.has_module(NEW.educator_user_id, NULL, COALESCE(NEW.module_required,'payments_marketplace'));
    IF NOT v_module_ok THEN
      RAISE EXCEPTION 'Module Paiements & Marketplace requis pour publier un cours.' USING ERRCODE = 'check_violation';
    END IF;

    v_restricted := public.has_active_marketplace_restriction(NEW.educator_user_id);
    IF v_restricted THEN
      BEGIN
        INSERT INTO public.marketplace_policy_flags
          (educator_id, course_id, flag_type, severity, description, status)
        VALUES (NEW.educator_user_id, NEW.id, 'restriction_violation', 'critical',
                'Tentative de publication malgré une restriction active.', 'open');
      EXCEPTION WHEN OTHERS THEN NULL; END;
      RAISE EXCEPTION 'Compte marketplace limité ou suspendu.' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_course_publication ON public.courses;
CREATE TRIGGER trg_enforce_course_publication
  BEFORE INSERT OR UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_course_publication_rules();

-- 8. RLS course_bookings — durcissement
DROP POLICY IF EXISTS "Users can create bookings"               ON public.course_bookings;
DROP POLICY IF EXISTS "owner_insert_pending_booking"            ON public.course_bookings;
DROP POLICY IF EXISTS "Users can update their own bookings"     ON public.course_bookings;
DROP POLICY IF EXISTS "owner_cancel_own_unpaid_booking"         ON public.course_bookings;
DROP POLICY IF EXISTS "Educators can update bookings for their courses" ON public.course_bookings;
DROP POLICY IF EXISTS "Educators update notes only"             ON public.course_bookings;

CREATE POLICY "owner_insert_pending_booking"
ON public.course_bookings
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND COALESCE(status, 'pending') = 'pending'
  AND COALESCE(payment_status, 'unpaid') IN ('pending','unpaid')
  AND paid_at IS NULL
  AND confirmed_at IS NULL
  AND refunded_at IS NULL
);

CREATE POLICY "owner_cancel_own_unpaid_booking"
ON public.course_bookings
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND status IN ('pending','cancelled')
  AND payment_status IN ('pending','unpaid','cancelled')
);

CREATE POLICY "Educators update notes only"
ON public.course_bookings
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.courses c
          WHERE c.id = course_bookings.course_id AND c.educator_user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.courses c
          WHERE c.id = course_bookings.course_id AND c.educator_user_id = auth.uid())
);