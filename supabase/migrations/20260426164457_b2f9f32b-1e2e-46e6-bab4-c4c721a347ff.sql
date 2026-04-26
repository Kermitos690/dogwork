CREATE TABLE IF NOT EXISTS public.referral_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id uuid NOT NULL REFERENCES public.educator_referral_codes(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL,
  educator_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_ref_attr_educator ON public.referral_attributions(educator_user_id);
CREATE INDEX IF NOT EXISTS idx_ref_attr_referred ON public.referral_attributions(referred_user_id);

ALTER TABLE public.referral_attributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own attribution" ON public.referral_attributions;
CREATE POLICY "Users see own attribution" ON public.referral_attributions
  FOR SELECT TO authenticated
  USING (referred_user_id = auth.uid() OR educator_user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Users insert own attribution" ON public.referral_attributions;
CREATE POLICY "Users insert own attribution" ON public.referral_attributions
  FOR INSERT TO authenticated
  WITH CHECK (referred_user_id = auth.uid());

DROP POLICY IF EXISTS "Admin manages attributions" ON public.referral_attributions;
CREATE POLICY "Admin manages attributions" ON public.referral_attributions
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());