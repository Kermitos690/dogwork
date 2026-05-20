-- Phase 2+2B additive fix: ensure every new auth user gets an AI credit wallet
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

  -- NEW: provision AI credit wallet + welcome bonus (non-blocking)
  BEGIN
    PERFORM public.ensure_ai_wallet(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] ensure_ai_wallet failed for %: %', NEW.id, SQLERRM;
  END;

  -- Attach adopter_links from adopted shelter animals matching email
  INSERT INTO public.adopter_links (adopter_user_id, shelter_user_id, animal_id, animal_name)
  SELECT NEW.id, sa.user_id, sa.id, sa.name
  FROM public.shelter_animals sa
  WHERE sa.status = 'adopté'
    AND COALESCE(sa.adopter_email, '') <> ''
    AND lower(sa.adopter_email) = lower(NEW.email)
  ON CONFLICT (adopter_user_id, animal_id) DO NOTHING;

  -- Attach pre-created adoption_plans matching this email
  UPDATE public.adoption_plans
     SET adopter_user_id = NEW.id,
         updated_at = now()
   WHERE adopter_user_id IS NULL
     AND adopter_email IS NOT NULL
     AND lower(trim(adopter_email)) = lower(NEW.email);

  RETURN NEW;
END;
$function$;

-- Idempotent backfill: any auth user without a wallet gets one
DO $$
DECLARE
  u record;
BEGIN
  FOR u IN
    SELECT au.id
    FROM auth.users au
    LEFT JOIN public.ai_credit_wallets w ON w.user_id = au.id
    WHERE w.id IS NULL
  LOOP
    BEGIN
      PERFORM public.ensure_ai_wallet(u.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[backfill ai_credit_wallets] failed for %: %', u.id, SQLERRM;
    END;
  END LOOP;
END $$;