-- Secure server-side lookup for linking clients/adopters without exposing full user directory
CREATE OR REPLACE FUNCTION public.search_linkable_users(_query text)
RETURNS TABLE(user_id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT p.user_id,
         COALESCE(NULLIF(p.display_name, ''), split_part(u.email, '@', 1)) AS display_name
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'owner'
  WHERE (public.is_admin() OR public.is_educator() OR public.is_shelter())
    AND (
      lower(u.email) = lower(trim(_query))
      OR p.display_name ILIKE '%' || trim(_query) || '%'
    )
  ORDER BY CASE WHEN lower(u.email) = lower(trim(_query)) THEN 0 ELSE 1 END,
           p.created_at DESC
  LIMIT 20;
$$;

REVOKE ALL ON FUNCTION public.search_linkable_users(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_linkable_users(text) TO authenticated;

-- Auto-link adopter when a new account is created with an email already present on an adopted animal
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  -- Only assign 'owner' role if user doesn't already have a role (e.g. shelter_employee created via edge function)
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
$function$;

-- Backfill existing adopted animals to existing owner accounts by email
INSERT INTO public.adopter_links (adopter_user_id, shelter_user_id, animal_id, animal_name)
SELECT p.user_id, sa.user_id, sa.id, sa.name
FROM public.shelter_animals sa
JOIN auth.users u ON lower(u.email) = lower(sa.adopter_email)
JOIN public.profiles p ON p.user_id = u.id
JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'owner'
WHERE sa.status = 'adopté'
  AND COALESCE(sa.adopter_email, '') <> ''
ON CONFLICT (adopter_user_id, animal_id) DO NOTHING;