CREATE OR REPLACE FUNCTION public.admin_push_diagnostics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  v_trigger_attached boolean;
  v_function_exists boolean;
  v_pg_net boolean;
  v_url_set boolean;
  v_secret_set boolean;
  v_subs_count int;
  v_recent jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_only';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_notify_new_message'
      AND tgrelid = 'public.messages'::regclass
      AND NOT tgisinternal
  ) INTO v_trigger_attached;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'trg_notify_new_message'
  ) INTO v_function_exists;

  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') INTO v_pg_net;

  SELECT EXISTS (SELECT 1 FROM public.app_internal_settings WHERE key = 'supabase_url' AND length(value) > 0) INTO v_url_set;
  SELECT EXISTS (SELECT 1 FROM public.app_internal_settings WHERE key = 'service_role_key' AND length(value) > 0) INTO v_secret_set;

  SELECT count(*) INTO v_subs_count FROM public.push_subscriptions;

  BEGIN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id,
      'created', created,
      'status_code', status_code,
      'snippet', LEFT(content::text, 160)
    ) ORDER BY created DESC), '[]'::jsonb)
      INTO v_recent
    FROM (
      SELECT id, created, status_code, content
      FROM net._http_response
      ORDER BY created DESC
      LIMIT 5
    ) r;
  EXCEPTION WHEN OTHERS THEN
    v_recent := '[]'::jsonb;
  END;

  RETURN jsonb_build_object(
    'trigger_function_exists', v_function_exists,
    'trigger_attached', v_trigger_attached,
    'pg_net_enabled', v_pg_net,
    'app_url_configured', v_url_set,
    'service_role_configured', v_secret_set,
    'push_subscriptions_count', v_subs_count,
    'recent_http_responses', v_recent,
    'checked_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_push_diagnostics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_push_diagnostics() TO authenticated;