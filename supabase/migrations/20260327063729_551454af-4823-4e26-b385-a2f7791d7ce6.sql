-- Create dedicated table for sensitive Stripe Connect data
CREATE TABLE public.coach_stripe_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  stripe_account_id text,
  stripe_onboarding_complete boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Migrate existing data
INSERT INTO public.coach_stripe_data (user_id, stripe_account_id, stripe_onboarding_complete)
SELECT user_id, stripe_account_id, stripe_onboarding_complete
FROM public.coach_profiles
WHERE stripe_account_id IS NOT NULL OR stripe_onboarding_complete = true;

-- Enable RLS with strict access (only coach + admin)
ALTER TABLE public.coach_stripe_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view own stripe data"
ON public.coach_stripe_data FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Coaches can update own stripe data"
ON public.coach_stripe_data FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND is_educator());

CREATE POLICY "Coaches can insert own stripe data"
ON public.coach_stripe_data FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND is_educator());

CREATE POLICY "Admin full access select"
ON public.coach_stripe_data FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Admin full access update"
ON public.coach_stripe_data FOR UPDATE
TO authenticated
USING (is_admin());

CREATE POLICY "Admin full access delete"
ON public.coach_stripe_data FOR DELETE
TO authenticated
USING (is_admin());

-- Add timestamp trigger
CREATE TRIGGER update_coach_stripe_data_updated_at
BEFORE UPDATE ON public.coach_stripe_data
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Remove sensitive columns from coach_profiles
ALTER TABLE public.coach_profiles DROP COLUMN stripe_account_id;
ALTER TABLE public.coach_profiles DROP COLUMN stripe_onboarding_complete;