
-- Create a safe view that hides stripe_coupon_id from educators
CREATE OR REPLACE VIEW public.educator_commercial_rules_public
WITH (security_invoker = true)
AS
SELECT
  id,
  management_fee_percent,
  annual_fee_chf,
  refuge_referral_discount_percent,
  is_active,
  created_at,
  updated_at
FROM public.educator_commercial_rules;

-- Drop the old policy that exposes all columns including stripe_coupon_id
DROP POLICY IF EXISTS "Admins and educators can read active rules" ON public.educator_commercial_rules;

-- Re-create: only admins can read the raw table directly
CREATE POLICY "Admins can read all rules"
ON public.educator_commercial_rules
FOR SELECT
TO authenticated
USING (is_admin());

-- Grant educators SELECT on the safe view only
GRANT SELECT ON public.educator_commercial_rules_public TO authenticated;
