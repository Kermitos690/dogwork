CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  display_name text,
  created_at timestamp with time zone,
  roles text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    u.id AS user_id,
    u.email::text,
    COALESCE(
      NULLIF(p.display_name, ''),
      NULLIF(u.raw_user_meta_data ->> 'display_name', ''),
      split_part(u.email, '@', 1)
    )::text AS display_name,
    u.created_at,
    COALESCE(
      array_agg(DISTINCT ur.role::text) FILTER (WHERE ur.role IS NOT NULL),
      ARRAY[]::text[]
    ) AS roles
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  WHERE public.is_admin()
  GROUP BY u.id, u.email, u.created_at, p.display_name, u.raw_user_meta_data
  ORDER BY u.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;