
-- 1. Remove hardcoded admin email from is_admin()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
$$;

-- 2. Fix usage_tracking: remove user INSERT/UPDATE policies, keep SELECT only
DROP POLICY IF EXISTS "Users can upsert own usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Users can update own usage" ON public.usage_tracking;

-- Create server-side RPC for incrementing usage
CREATE OR REPLACE FUNCTION public.increment_usage(p_feature_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usage_tracking (user_id, feature_key, usage_count, last_used_at)
  VALUES (auth.uid(), p_feature_key, 1, now())
  ON CONFLICT (user_id, feature_key)
  DO UPDATE SET usage_count = usage_tracking.usage_count + 1, last_used_at = now();
END;
$$;

-- 3. Fix shelter-photos storage policies with ownership check
DROP POLICY IF EXISTS "Shelter users can upload animal photos" ON storage.objects;
DROP POLICY IF EXISTS "Shelter users can update their photos" ON storage.objects;
DROP POLICY IF EXISTS "Shelter users can delete their photos" ON storage.objects;

CREATE POLICY "Shelter users can upload animal photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'shelter-photos'
    AND (SELECT is_shelter())
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Shelter users can update their photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'shelter-photos'
    AND (SELECT is_shelter())
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Shelter users can delete their photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'shelter-photos'
    AND (SELECT is_shelter())
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. Create public views for AI tables hiding sensitive columns
CREATE OR REPLACE VIEW public.ai_credit_packs_public
WITH (security_invoker = on)
AS
SELECT id, slug, label, description, credits, price_chf, is_active, sort_order, stripe_price_id, stripe_product_id
FROM ai_credit_packs;

CREATE OR REPLACE VIEW public.ai_feature_catalog_public
WITH (security_invoker = on)
AS
SELECT id, code, label, description, credits_cost, is_active, model
FROM ai_feature_catalog;

-- 5. Restrict ai_pricing_config to admin-only SELECT
DROP POLICY IF EXISTS "Anyone reads pricing config" ON public.ai_pricing_config;

-- 6. Restrict ai_credit_packs to admin-only SELECT, public uses the view
DROP POLICY IF EXISTS "Anyone can read packs" ON public.ai_credit_packs;
CREATE POLICY "Admin can read all packs" ON public.ai_credit_packs
  FOR SELECT TO authenticated USING (is_admin());

-- 7. Restrict ai_feature_catalog to admin-only SELECT, public uses the view
DROP POLICY IF EXISTS "Anyone can read features" ON public.ai_feature_catalog;
CREATE POLICY "Admin can read all features" ON public.ai_feature_catalog
  FOR SELECT TO authenticated USING (is_admin());

-- 8. Grant public views access to authenticated users
GRANT SELECT ON public.ai_credit_packs_public TO authenticated;
GRANT SELECT ON public.ai_feature_catalog_public TO authenticated;
