
-- Add stripe_account_id to coach_profiles for Stripe Connect
ALTER TABLE public.coach_profiles ADD COLUMN stripe_account_id text DEFAULT NULL;

-- Add stripe_onboarding_complete flag
ALTER TABLE public.coach_profiles ADD COLUMN stripe_onboarding_complete boolean DEFAULT false;

-- Update default commission_rate on courses to 15.8%
ALTER TABLE public.courses ALTER COLUMN commission_rate SET DEFAULT 0.158;
