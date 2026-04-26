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

  INSERT INTO public.adopter_links (adopter_user_id, shelter_user_id, animal_id, animal_name)
  SELECT NEW.id, sa.user_id, sa.id, sa.name
  FROM public.shelter_animals sa
  WHERE sa.status = 'adopté'
    AND COALESCE(sa.adopter_email, '') <> ''
    AND lower(sa.adopter_email) = lower(NEW.email)
  ON CONFLICT (adopter_user_id, animal_id) DO NOTHING;

  RETURN NEW;
END;
$function$;