-- Admin-only RPC to fetch global shelter spaces statistics.
-- The existing view v_shelter_spaces_stats filters by auth.uid() so it is
-- intentionally scoped per-shelter. This RPC complements it for admin diagnostics
-- without weakening the view used by regular users.

CREATE OR REPLACE FUNCTION public.admin_get_shelter_spaces_stats()
RETURNS TABLE (
  total_spaces bigint,
  occupied_spaces bigint,
  free_spaces bigint,
  occupancy_pct numeric,
  total_capacity bigint,
  space_types bigint,
  active_shelters bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*)::bigint                                                       AS total_spaces,
    COUNT(current_animal_id)::bigint                                       AS occupied_spaces,
    (COUNT(*) - COUNT(current_animal_id))::bigint                          AS free_spaces,
    ROUND(COUNT(current_animal_id)::numeric
          / GREATEST(COUNT(*), 1)::numeric * 100)                          AS occupancy_pct,
    COALESCE(SUM(capacity), 0)::bigint                                     AS total_capacity,
    COUNT(DISTINCT space_type)::bigint                                     AS space_types,
    COUNT(DISTINCT shelter_user_id)::bigint                                AS active_shelters
  FROM public.shelter_spaces
  WHERE public.has_role(auth.uid(), 'admin'::public.app_role);
$$;

REVOKE ALL ON FUNCTION public.admin_get_shelter_spaces_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_shelter_spaces_stats() TO authenticated;

COMMENT ON FUNCTION public.admin_get_shelter_spaces_stats() IS
  'Admin-only global shelter spaces stats. Returns zero rows for non-admins (WHERE has_role gate). SECURITY DEFINER + search_path=public. Complements v_shelter_spaces_stats which is per-user.';
