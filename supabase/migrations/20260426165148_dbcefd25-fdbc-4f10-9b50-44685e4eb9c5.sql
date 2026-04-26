CREATE OR REPLACE FUNCTION public.provision_modules_for_tier(_user_id uuid, _tier text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _plan_id uuid; _module_id uuid; _included_credits int; _resolved_tier text;
BEGIN
  IF _user_id IS NULL OR _tier IS NULL THEN RETURN; END IF;

  -- Map legacy Stripe tiers → new plan slugs
  _resolved_tier := CASE lower(_tier)
    WHEN 'starter' THEN 'owner_starter'
    WHEN 'pro'     THEN 'owner_pro'
    WHEN 'expert'  THEN 'owner_expert'
    ELSE lower(_tier)
  END;

  SELECT id, included_credits INTO _plan_id, _included_credits
  FROM public.plans WHERE lower(slug) = _resolved_tier AND is_active = true LIMIT 1;
  IF _plan_id IS NULL THEN RETURN; END IF;

  FOR _module_id IN
    SELECT pm.module_id FROM public.plan_modules pm WHERE pm.plan_id = _plan_id
  LOOP
    INSERT INTO public.user_modules (user_id, module_id, active, activated_at, source)
    VALUES (_user_id, _module_id, true, now(), 'subscription:' || _resolved_tier)
    ON CONFLICT (user_id, module_id) DO UPDATE
    SET active = true, activated_at = now(), source = 'subscription:' || _resolved_tier;
  END LOOP;

  IF _included_credits > 0 THEN
    INSERT INTO public.ai_credit_ledger (user_id, delta, reason, metadata)
    SELECT _user_id, _included_credits, 'plan_grant',
           jsonb_build_object('tier', _resolved_tier, 'period_key', to_char(now(), 'YYYY-MM'))
    WHERE NOT EXISTS (
      SELECT 1 FROM public.ai_credit_ledger
      WHERE user_id = _user_id AND reason = 'plan_grant'
        AND metadata @> jsonb_build_object('period_key', to_char(now(), 'YYYY-MM'), 'tier', _resolved_tier)
    );
  END IF;
END; $$;