-- Public read on ai_credit_packs (active rows only) — already shown on public landing page
CREATE POLICY "Public can read active credit packs"
ON public.ai_credit_packs
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Public read on ai_feature_catalog (active rows only) — already shown on public landing page
CREATE POLICY "Public can read active AI features"
ON public.ai_feature_catalog
FOR SELECT
TO anon, authenticated
USING (is_active = true);