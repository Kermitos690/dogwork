-- =========================================
-- PHASE 1: COMMISSIONS DUALES 15% / 8%
-- =========================================

-- 1. Table educator_invitations
CREATE TABLE IF NOT EXISTS public.educator_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  educator_user_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  notes text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  uses_count integer NOT NULL DEFAULT 0,
  max_uses integer,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS educator_invitations_educator_idx 
  ON public.educator_invitations(educator_user_id);
CREATE INDEX IF NOT EXISTS educator_invitations_code_active_idx 
  ON public.educator_invitations(lower(code)) WHERE is_active = true;

ALTER TABLE public.educator_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Educators manage own invitations"
  ON public.educator_invitations FOR ALL TO authenticated
  USING ((auth.uid() = educator_user_id) AND public.is_educator())
  WITH CHECK ((auth.uid() = educator_user_id) AND public.is_educator());

CREATE POLICY "Admin full access invitations"
  ON public.educator_invitations FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Trigger updated_at
CREATE TRIGGER trg_educator_invitations_updated_at
  BEFORE UPDATE ON public.educator_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Champs sur course_bookings
ALTER TABLE public.course_bookings
  ADD COLUMN IF NOT EXISTS acquisition_source text NOT NULL DEFAULT 'platform',
  ADD COLUMN IF NOT EXISTS invitation_id uuid REFERENCES public.educator_invitations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS applied_commission_rate numeric;

CREATE INDEX IF NOT EXISTS course_bookings_invitation_idx 
  ON public.course_bookings(invitation_id) WHERE invitation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS course_bookings_acquisition_idx 
  ON public.course_bookings(acquisition_source);

-- 3. Profils utilisateurs : sauvegarde du code d'invitation à l'inscription
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referring_invitation_id uuid REFERENCES public.educator_invitations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referring_educator_user_id uuid;

CREATE INDEX IF NOT EXISTS profiles_referring_invitation_idx 
  ON public.profiles(referring_invitation_id) WHERE referring_invitation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS profiles_referring_educator_idx 
  ON public.profiles(referring_educator_user_id) WHERE referring_educator_user_id IS NOT NULL;

-- 4. Fonction RPC : valider un code d'invitation (publique, lecture)
CREATE OR REPLACE FUNCTION public.validate_invitation_code(_code text)
RETURNS TABLE (
  invitation_id uuid,
  educator_user_id uuid,
  educator_display_name text,
  label text,
  is_valid boolean,
  reason text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  inv record;
BEGIN
  SELECT i.*, COALESCE(cp.display_name, p.display_name, split_part(u.email, '@', 1)) AS edu_name
  INTO inv
  FROM public.educator_invitations i
  LEFT JOIN public.profiles p ON p.user_id = i.educator_user_id
  LEFT JOIN public.coach_profiles cp ON cp.user_id = i.educator_user_id
  LEFT JOIN auth.users u ON u.id = i.educator_user_id
  WHERE lower(i.code) = lower(trim(_code))
  LIMIT 1;

  IF inv.id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::text, NULL::text, false, 'invalid'::text;
    RETURN;
  END IF;

  IF NOT inv.is_active THEN
    RETURN QUERY SELECT inv.id, inv.educator_user_id, inv.edu_name, inv.label, false, 'inactive'::text;
    RETURN;
  END IF;

  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
    RETURN QUERY SELECT inv.id, inv.educator_user_id, inv.edu_name, inv.label, false, 'expired'::text;
    RETURN;
  END IF;

  IF inv.max_uses IS NOT NULL AND inv.uses_count >= inv.max_uses THEN
    RETURN QUERY SELECT inv.id, inv.educator_user_id, inv.edu_name, inv.label, false, 'exhausted'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT inv.id, inv.educator_user_id, inv.edu_name, inv.label, true, 'ok'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_invitation_code(text) TO anon, authenticated;

-- 5. Fonction RPC : déterminer le bon taux pour une réservation
CREATE OR REPLACE FUNCTION public.compute_booking_commission(
  _user_id uuid,
  _course_id uuid,
  _explicit_invitation_id uuid DEFAULT NULL
)
RETURNS TABLE (
  commission_rate numeric,
  acquisition_source text,
  invitation_id uuid
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  course_educator uuid;
  inv_id uuid;
  inv_educator uuid;
  profile_inv_id uuid;
  profile_inv_educator uuid;
BEGIN
  SELECT educator_user_id INTO course_educator
  FROM public.courses WHERE id = _course_id LIMIT 1;

  -- Priority 1: explicit invitation passed at checkout time
  IF _explicit_invitation_id IS NOT NULL THEN
    SELECT id, educator_user_id INTO inv_id, inv_educator
    FROM public.educator_invitations
    WHERE id = _explicit_invitation_id AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
      AND (max_uses IS NULL OR uses_count < max_uses)
    LIMIT 1;

    IF inv_id IS NOT NULL AND inv_educator = course_educator THEN
      RETURN QUERY SELECT 0.08::numeric, 'educator_invite'::text, inv_id;
      RETURN;
    END IF;
  END IF;

  -- Priority 2: profile.referring_invitation_id linked at signup
  SELECT referring_invitation_id, referring_educator_user_id 
  INTO profile_inv_id, profile_inv_educator
  FROM public.profiles WHERE user_id = _user_id LIMIT 1;

  IF profile_inv_id IS NOT NULL AND profile_inv_educator = course_educator THEN
    RETURN QUERY SELECT 0.08::numeric, 'educator_invite'::text, profile_inv_id;
    RETURN;
  END IF;

  -- Default: platform-acquired client
  RETURN QUERY SELECT 0.15::numeric, 'platform'::text, NULL::uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_booking_commission(uuid, uuid, uuid) TO authenticated;

-- 6. Fonction RPC : générer un code d'invitation court & unique
CREATE OR REPLACE FUNCTION public.generate_unique_invitation_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_code text;
  attempts int := 0;
BEGIN
  LOOP
    -- 8-character alphanumeric code (uppercase, no ambiguous chars)
    new_code := upper(substring(translate(encode(gen_random_bytes(8), 'base64'), '+/=OoIl01', '23456789'), 1, 8));
    
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.educator_invitations WHERE code = new_code);
    
    attempts := attempts + 1;
    IF attempts > 10 THEN
      RAISE EXCEPTION 'Could not generate unique code after 10 attempts';
    END IF;
  END LOOP;

  RETURN new_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_unique_invitation_code() TO authenticated;

-- 7. Trigger : auto-incrémenter uses_count quand une réservation utilise une invitation
CREATE OR REPLACE FUNCTION public.increment_invitation_uses()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.invitation_id IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.invitation_id IS DISTINCT FROM NEW.invitation_id) THEN
    UPDATE public.educator_invitations
    SET uses_count = uses_count + 1, updated_at = now()
    WHERE id = NEW.invitation_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_invitation_uses ON public.course_bookings;
CREATE TRIGGER trg_increment_invitation_uses
  AFTER INSERT OR UPDATE OF invitation_id ON public.course_bookings
  FOR EACH ROW EXECUTE FUNCTION public.increment_invitation_uses();

-- 8. Mettre à jour handle_new_user pour capturer referring_invitation depuis raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inv_code text;
  inv_record record;
BEGIN
  -- Profile creation with potential invitation linking
  inv_code := NULLIF(NEW.raw_user_meta_data->>'invitation_code', '');
  
  IF inv_code IS NOT NULL THEN
    SELECT id, educator_user_id INTO inv_record
    FROM public.educator_invitations
    WHERE lower(code) = lower(trim(inv_code))
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
      AND (max_uses IS NULL OR uses_count < max_uses)
    LIMIT 1;
  END IF;

  INSERT INTO public.profiles (user_id, display_name, referring_invitation_id, referring_educator_user_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    inv_record.id,
    inv_record.educator_user_id
  );

  -- Auto-link client to coach if invitation valid
  IF inv_record.id IS NOT NULL AND inv_record.educator_user_id IS NOT NULL THEN
    INSERT INTO public.client_links (coach_user_id, client_user_id, status)
    VALUES (inv_record.educator_user_id, NEW.id, 'active')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Only assign 'owner' role if user doesn't already have a role
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'owner');
  END IF;

  -- Auto-create adopter links for already adopted animals matching this email
  INSERT INTO public.adopter_links (adopter_user_id, shelter_user_id, animal_id, animal_name)
  SELECT NEW.id, sa.user_id, sa.id, sa.name
  FROM public.shelter_animals sa
  WHERE sa.status = 'adopté'
    AND COALESCE(sa.adopter_email, '') <> ''
    AND lower(sa.adopter_email) = lower(NEW.email)
  ON CONFLICT (adopter_user_id, animal_id) DO NOTHING;

  RETURN NEW;
END;
$$;