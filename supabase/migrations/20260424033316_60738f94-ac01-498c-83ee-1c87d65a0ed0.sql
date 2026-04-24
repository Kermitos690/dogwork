INSERT INTO public.ai_plan_quotas (plan_slug, monthly_credits, discount_percent)
VALUES
  ('starter',  1,  0),
  ('pro',      5,  10),
  ('expert',   20, 20),
  ('premium',  50, 30),
  ('shelter',  20, 20),
  ('educator', 30, 25)
ON CONFLICT (plan_slug) DO UPDATE SET
  monthly_credits  = EXCLUDED.monthly_credits,
  discount_percent = EXCLUDED.discount_percent,
  updated_at       = now();