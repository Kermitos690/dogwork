REVOKE ALL ON FUNCTION public.search_linkable_users(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_linkable_users(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_linkable_users(text) TO anon;
GRANT EXECUTE ON FUNCTION public.search_linkable_users(text) TO service_role;