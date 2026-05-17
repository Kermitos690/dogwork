REVOKE EXECUTE ON FUNCTION public.check_billing_events_sync(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_billing_events_sync(INTEGER) TO authenticated, service_role;