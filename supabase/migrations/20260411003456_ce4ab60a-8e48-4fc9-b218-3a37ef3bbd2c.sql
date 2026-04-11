-- subscription_plans: central plan definitions
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  code text PRIMARY KEY,
  name text NOT NULL,
  max_dogs integer NOT NULL DEFAULT 1,
  includes_28_day_plans boolean NOT NULL DEFAULT true,
  includes_base_exercises boolean NOT NULL DEFAULT false,
  base_exercise_limit integer,
  monthly_ai_credits integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active plans" ON public.subscription_plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admin manages plans" ON public.subscription_plans
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- subscription_plan_prices: commercial pricing per billing period
CREATE TABLE IF NOT EXISTS public.subscription_plan_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code text NOT NULL REFERENCES public.subscription_plans(code) ON DELETE CASCADE,
  billing_period text NOT NULL CHECK (billing_period IN ('monthly','yearly','custom')),
  price_chf numeric(10,2),
  is_public boolean NOT NULL DEFAULT true,
  stripe_price_id text,
  stripe_product_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_code, billing_period)
);

ALTER TABLE public.subscription_plan_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read public prices" ON public.subscription_plan_prices
  FOR SELECT USING (is_public = true);

CREATE POLICY "Admin manages prices" ON public.subscription_plan_prices
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- educator_commercial_rules: B2B commercial logic
CREATE TABLE IF NOT EXISTS public.educator_commercial_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  annual_fee_chf numeric(10,2) NOT NULL DEFAULT 200.00,
  management_fee_percent numeric(5,2) NOT NULL DEFAULT 15.80,
  refuge_referral_discount_percent numeric(5,2) NOT NULL DEFAULT 30.00,
  stripe_coupon_id text DEFAULT 'zdgD9pvh',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.educator_commercial_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active rules" ON public.educator_commercial_rules
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admin manages rules" ON public.educator_commercial_rules
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Seed the 5 subscription plans
INSERT INTO public.subscription_plans (code, name, max_dogs, includes_28_day_plans, includes_base_exercises, base_exercise_limit, monthly_ai_credits, is_active)
VALUES
  ('freemium', 'Freemium', 1, true, false, 15, 0, true),
  ('pro', 'Pro', 3, true, true, 150, 30, true),
  ('expert', 'Expert', 999999, true, true, 999999, 100, true),
  ('educator', 'Éducateur / Coach', 999, true, true, 999999, 200, true),
  ('refuge_custom', 'Refuge', 9999, true, true, 999999, 150, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  max_dogs = EXCLUDED.max_dogs,
  includes_28_day_plans = EXCLUDED.includes_28_day_plans,
  includes_base_exercises = EXCLUDED.includes_base_exercises,
  base_exercise_limit = EXCLUDED.base_exercise_limit,
  monthly_ai_credits = EXCLUDED.monthly_ai_credits,
  is_active = EXCLUDED.is_active;

-- Seed prices with Stripe IDs
INSERT INTO public.subscription_plan_prices (plan_code, billing_period, price_chf, is_public, stripe_price_id, stripe_product_id, notes)
VALUES
  ('freemium', 'monthly', 0.00, true, NULL, NULL, 'Offre gratuite'),
  ('pro', 'monthly', 9.90, true, 'price_1TKpFyPshPrEibTgOW98FPOq', 'prod_U83i1wbeLdd3EI', 'Abonnement mensuel Pro'),
  ('expert', 'monthly', 19.90, true, 'price_1TKpNpPshPrEibTgDiRVEAmV', 'prod_U83inCbv8JMMgf', 'Abonnement mensuel Expert'),
  ('educator', 'yearly', 200.00, true, 'price_1T9wXlPshPrEibTgEM0BNrSm', 'prod_U8CxlV7PMpHAgA', 'Cotisation annuelle éducateur/coach, hors frais de gestion'),
  ('refuge_custom', 'custom', NULL, true, NULL, NULL, 'Forfait sur mesure selon les besoins de la structure')
ON CONFLICT (plan_code, billing_period) DO UPDATE SET
  price_chf = EXCLUDED.price_chf,
  is_public = EXCLUDED.is_public,
  stripe_price_id = EXCLUDED.stripe_price_id,
  stripe_product_id = EXCLUDED.stripe_product_id,
  notes = EXCLUDED.notes;

-- Seed educator commercial rules
INSERT INTO public.educator_commercial_rules (annual_fee_chf, management_fee_percent, refuge_referral_discount_percent, stripe_coupon_id, is_active)
VALUES (200.00, 15.80, 30.00, 'zdgD9pvh', true);

-- Trigger for updated_at
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_educator_commercial_rules_updated_at
  BEFORE UPDATE ON public.educator_commercial_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();