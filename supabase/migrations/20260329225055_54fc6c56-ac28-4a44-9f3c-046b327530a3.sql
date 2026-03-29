
-- Backfill missing profiles for all auth.users
INSERT INTO public.profiles (user_id, display_name)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1))
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;

-- Backfill missing 'owner' role for all auth.users
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'owner'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id AND ur.role = 'owner')
ON CONFLICT (user_id, role) DO NOTHING;

-- Ensure admin role for teba.gaetan@gmail.com
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'
FROM auth.users u
WHERE lower(u.email) = 'teba.gaetan@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Ensure educator role for teba.gaetan@gmail.com
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'educator'
FROM auth.users u
WHERE lower(u.email) = 'teba.gaetan@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Ensure coach_profile for teba.gaetan@gmail.com
INSERT INTO public.coach_profiles (user_id, display_name)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'display_name', 'Gaetan')
FROM auth.users u
WHERE lower(u.email) = 'teba.gaetan@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM public.coach_profiles cp WHERE cp.user_id = u.id)
ON CONFLICT DO NOTHING;
