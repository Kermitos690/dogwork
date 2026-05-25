CREATE OR REPLACE FUNCTION public.admin_send_test_notification(
  _target_user_id uuid,
  _title text DEFAULT 'Notification de test DogWork',
  _body text DEFAULT 'Si vous voyez ceci, le canal in-app fonctionne. Vérifiez aussi la notification Web Push.'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _notif_id uuid;
  _dedup text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_only';
  END IF;

  IF _target_user_id IS NULL THEN
    RAISE EXCEPTION 'target_user_id required';
  END IF;

  _dedup := 'admin-test-' || extract(epoch from now())::bigint::text;

  INSERT INTO public.notifications (
    recipient_user_id, actor_user_id, type, title, body, url, priority, metadata
  ) VALUES (
    _target_user_id, auth.uid(), 'admin_alerts', _title, _body, '/',
    'high', jsonb_build_object('test', true, 'sent_by', auth.uid(), 'dedup', _dedup)
  )
  RETURNING id INTO _notif_id;

  BEGIN
    PERFORM public.notify_users_push(
      _target_user_id, NULL, 'admin_alerts',
      _title, _body, '/',
      _dedup, _dedup,
      jsonb_build_object('test', true, 'notification_id', _notif_id)
    );
  EXCEPTION WHEN OTHERS THEN
    -- non bloquant : l'in-app sera quand même créé
    NULL;
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'notification_id', _notif_id,
    'recipient_user_id', _target_user_id,
    'dedup_key', _dedup
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_send_test_notification(uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_send_test_notification(uuid, text, text) TO authenticated;