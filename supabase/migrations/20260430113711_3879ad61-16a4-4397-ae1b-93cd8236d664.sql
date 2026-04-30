-- Remove the policy that exposed cost_estimate_usd and margin_estimate to all authenticated users.
-- Frontend (Pricing) already reads via the masked view ai_credit_packs_public.
DROP POLICY IF EXISTS "Authenticated users can read active packs" ON public.ai_credit_packs;