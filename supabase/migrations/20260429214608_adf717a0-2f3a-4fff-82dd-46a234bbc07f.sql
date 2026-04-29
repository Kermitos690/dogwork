-- 1) Make adopter_user_id nullable and add adopter_email
ALTER TABLE public.adoption_plans
  ALTER COLUMN adopter_user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS adopter_email text;

-- 2) Coherence: at least email OR user_id must be present
ALTER TABLE public.adoption_plans
  DROP CONSTRAINT IF EXISTS adoption_plans_adopter_target_chk;
ALTER TABLE public.adoption_plans
  ADD CONSTRAINT adoption_plans_adopter_target_chk
  CHECK (adopter_user_id IS NOT NULL OR (adopter_email IS NOT NULL AND length(trim(adopter_email)) > 0));

-- Index for fast email lookup at signup
CREATE INDEX IF NOT EXISTS adoption_plans_adopter_email_idx
  ON public.adoption_plans (lower(adopter_email))
  WHERE adopter_user_id IS NULL;

-- 3) Extend handle_new_user to also attach pending adoption_plans by email
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inv_code text;
  inv_id uuid := NULL;
  inv_educator uuid := NULL;
BEGIN
  inv_code := NULLIF(NEW.raw_user_meta_data->>'invitation_code', '');

  IF inv_code IS NOT NULL THEN
    SELECT id, educator_user_id INTO inv_id, inv_educator
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
    inv_id,
    inv_educator
  );

  IF inv_id IS NOT NULL AND inv_educator IS NOT NULL THEN
    INSERT INTO public.client_links (coach_user_id, client_user_id, status)
    VALUES (inv_educator, NEW.id, 'active')
    ON CONFLICT DO NOTHING;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'owner');
  END IF;

  -- Attach adopter_links from adopted shelter animals matching email
  INSERT INTO public.adopter_links (adopter_user_id, shelter_user_id, animal_id, animal_name)
  SELECT NEW.id, sa.user_id, sa.id, sa.name
  FROM public.shelter_animals sa
  WHERE sa.status = 'adopté'
    AND COALESCE(sa.adopter_email, '') <> ''
    AND lower(sa.adopter_email) = lower(NEW.email)
  ON CONFLICT (adopter_user_id, animal_id) DO NOTHING;

  -- NEW: Attach pre-created adoption_plans matching this email
  UPDATE public.adoption_plans
     SET adopter_user_id = NEW.id,
         updated_at = now()
   WHERE adopter_user_id IS NULL
     AND adopter_email IS NOT NULL
     AND lower(trim(adopter_email)) = lower(NEW.email);

  RETURN NEW;
END;
$function$;

-- 4) Allow newly-signed-up adopter to see plans matching their email even
--    if attachment hasn't fired yet (defensive — read-only).
DROP POLICY IF EXISTS "Adopters can view plans by email" ON public.adoption_plans;
CREATE POLICY "Adopters can view plans by email"
ON public.adoption_plans
FOR SELECT
TO authenticated
USING (
  adopter_user_id IS NULL
  AND adopter_email IS NOT NULL
  AND lower(trim(adopter_email)) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
);