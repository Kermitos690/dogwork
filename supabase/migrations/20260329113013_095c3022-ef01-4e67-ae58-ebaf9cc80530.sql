
-- 1. Add min_tier to exercises for feature gating
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS min_tier text NOT NULL DEFAULT 'starter';

-- 2. Create stripe_customers cache table
CREATE TABLE IF NOT EXISTS public.stripe_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stripe customer" ON public.stripe_customers
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admin full access stripe_customers" ON public.stripe_customers
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- 3. Create billing_events table for webhook event logging
CREATE TABLE IF NOT EXISTS public.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  stripe_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access billing_events" ON public.billing_events
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- 4. Create usage_tracking table
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature_key text NOT NULL,
  usage_count integer NOT NULL DEFAULT 0,
  period_start date NOT NULL DEFAULT CURRENT_DATE,
  period_end date NOT NULL DEFAULT (CURRENT_DATE + interval '30 days')::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature_key, period_start)
);

ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON public.usage_tracking
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own usage" ON public.usage_tracking
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON public.usage_tracking
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admin full access usage_tracking" ON public.usage_tracking
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- 5. Harmonize commission to 15.8%
UPDATE public.courses SET commission_rate = 0.158 WHERE commission_rate != 0.158;
ALTER TABLE public.courses ALTER COLUMN commission_rate SET DEFAULT 0.158;
