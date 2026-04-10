-- 1. Add subscription detail columns to stripe_customers
ALTER TABLE public.stripe_customers
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS stripe_price_id text,
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false;

-- 2. Populate AI credit pack cost estimates (avg cost per credit: 0.003268 USD, USD_TO_CHF: 0.88)
UPDATE public.ai_credit_packs SET
  cost_estimate_usd = ROUND((credits * 0.003268)::numeric, 4),
  margin_estimate = ROUND(((price_chf - credits * 0.003268 * 0.88) / price_chf * 100)::numeric, 1)
WHERE is_active = true;

-- 3. Index on billing_events for admin queries
CREATE INDEX IF NOT EXISTS idx_billing_events_created_at ON public.billing_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_events_event_type ON public.billing_events (event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_id ON public.stripe_customers (stripe_customer_id);