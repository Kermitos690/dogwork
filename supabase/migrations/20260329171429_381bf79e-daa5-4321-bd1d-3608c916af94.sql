
-- Backfill missing profiles from auth.users
INSERT INTO public.profiles (user_id, display_name)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1))
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id);

-- Backfill missing owner roles
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'owner'::app_role
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id);

-- Ensure admin role for teba.gaetan@gmail.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE lower(email) = 'teba.gaetan@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
