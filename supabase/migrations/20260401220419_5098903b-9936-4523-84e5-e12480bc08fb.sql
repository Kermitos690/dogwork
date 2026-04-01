
-- Drop the old overload (6 params, without _metadata)
DROP FUNCTION IF EXISTS public.credit_ai_wallet(uuid, integer, ai_ledger_type, text, text, numeric);
