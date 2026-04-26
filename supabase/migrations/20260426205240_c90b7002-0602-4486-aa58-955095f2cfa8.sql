-- Admin: full access ecosystem
-- 1. Table to allow admin to toggle individual modules ON/OFF on their own account (for QA)
CREATE TABLE IF NOT EXISTS public.admin_module_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  module_slug text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (admin_user_id, module_slug)
);

ALTER TABLE public.admin_module_overrides ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write their own overrides
CREATE POLICY "admin can view own overrides"
  ON public.admin_module_overrides FOR SELECT
  USING (public.is_admin() AND admin_user_id = auth.uid());

CREATE POLICY "admin can insert own overrides"
  ON public.admin_module_overrides FOR INSERT
  WITH CHECK (public.is_admin() AND admin_user_id = auth.uid());

CREATE POLICY "admin can update own overrides"
  ON public.admin_module_overrides FOR UPDATE
  USING (public.is_admin() AND admin_user_id = auth.uid())
  WITH CHECK (public.is_admin() AND admin_user_id = auth.uid());

CREATE POLICY "admin can delete own overrides"
  ON public.admin_module_overrides FOR DELETE
  USING (public.is_admin() AND admin_user_id = auth.uid());

CREATE TRIGGER trg_admin_module_overrides_updated_at
  BEFORE UPDATE ON public.admin_module_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. RPC: returns active modules for current user.
-- Admin: ALL modules unless explicitly disabled via overrides table.
-- Other users: their actual user_modules entries.
CREATE OR REPLACE FUNCTION public.get_my_active_modules()
RETURNS TABLE(module_slug text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RETURN;
  END IF;

  IF public.is_admin() THEN
    RETURN QUERY
      SELECT m.slug AS module_slug
      FROM public.modules m
      WHERE m.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM public.admin_module_overrides o
          WHERE o.admin_user_id = _uid
            AND o.module_slug = m.slug
            AND o.enabled = false
        );
    RETURN;
  END IF;

  RETURN QUERY
    SELECT um.module_slug::text
    FROM public.user_modules um
    WHERE um.user_id = _uid
      AND um.status IN ('active','trial')
      AND (um.expires_at IS NULL OR um.expires_at > now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_active_modules() TO authenticated;