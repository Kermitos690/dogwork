-- ============================================================
-- 1) RPC interne pour écrire les credentials de dispatch dans Vault
-- ============================================================
CREATE OR REPLACE FUNCTION public.upsert_email_dispatch_secrets(
  _project_url text,
  _service_role_key text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_existing_url_id uuid;
  v_existing_key_id uuid;
BEGIN
  -- Validation basique
  IF _project_url IS NULL OR _project_url = '' THEN
    RAISE EXCEPTION 'project_url required';
  END IF;
  IF _service_role_key IS NULL OR _service_role_key = '' THEN
    RAISE EXCEPTION 'service_role_key required';
  END IF;

  -- project_url
  SELECT id INTO v_existing_url_id FROM vault.secrets WHERE name = 'project_url';
  IF v_existing_url_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing_url_id, _project_url, 'project_url', 'Project URL for SQL→Edge Function dispatch (set by post-publish-sync)');
  ELSE
    PERFORM vault.create_secret(_project_url, 'project_url', 'Project URL for SQL→Edge Function dispatch (set by post-publish-sync)');
  END IF;

  -- email_dispatch_service_role_key (séparé d'email_queue_service_role_key pour découplage)
  SELECT id INTO v_existing_key_id FROM vault.secrets WHERE name = 'email_dispatch_service_role_key';
  IF v_existing_key_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing_key_id, _service_role_key, 'email_dispatch_service_role_key', 'Service-role key for SQL→Edge Function email dispatch (set by post-publish-sync)');
  ELSE
    PERFORM vault.create_secret(_service_role_key, 'email_dispatch_service_role_key', 'Service-role key for SQL→Edge Function email dispatch (set by post-publish-sync)');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_email_dispatch_secrets(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_email_dispatch_secrets(text, text) TO service_role;

-- ============================================================
-- 2) Refactor de _send_transactional_email : Vault d'abord, fallback app.settings.*
-- ============================================================
CREATE OR REPLACE FUNCTION public._send_transactional_email(
  _template_name text,
  _recipient_email text,
  _idempotency_key text,
  _template_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_url text;
  v_key text;
  v_source text;
BEGIN
  IF _recipient_email IS NULL OR _recipient_email = '' THEN
    RETURN;
  END IF;

  -- Tier 1: Vault (mécanisme officiel, durable, env-aware)
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1;
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'email_dispatch_service_role_key' LIMIT 1;
  v_source := 'vault';

  -- Tier 2: fallback sur app.settings.* (rétrocompat Test si jamais configuré)
  IF v_url IS NULL OR v_url = '' THEN
    v_url := current_setting('app.settings.supabase_url', true);
    v_source := 'app.settings';
  END IF;
  IF v_key IS NULL OR v_key = '' THEN
    v_key := current_setting('app.settings.service_role_key', true);
  END IF;

  -- Si toujours rien, log explicite et abandon (PAS d'exception → ne casse pas la transaction métier)
  IF v_url IS NULL OR v_url = '' OR v_key IS NULL OR v_key = '' THEN
    RAISE WARNING '[_send_transactional_email] No dispatch credentials available (vault empty AND app.settings empty). Email skipped: template=%, recipient=%. Run post-publish-sync to seed Vault.', _template_name, _recipient_email;
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url || '/functions/v1/send-transactional-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object(
      'templateName', _template_name,
      'recipientEmail', _recipient_email,
      'idempotencyKey', _idempotency_key,
      'templateData', COALESCE(_template_data, '{}'::jsonb)
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[_send_transactional_email] Failed (source=%): % (template=%, recipient=%)', v_source, SQLERRM, _template_name, _recipient_email;
END;
$$;