CREATE TABLE IF NOT EXISTS public.coach_charter_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  charter_version text NOT NULL DEFAULT '2026-04-26',
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);

ALTER TABLE public.coach_charter_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coach sees own acceptance" ON public.coach_charter_acceptances;
CREATE POLICY "Coach sees own acceptance" ON public.coach_charter_acceptances
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Coach signs own acceptance" ON public.coach_charter_acceptances;
CREATE POLICY "Coach signs own acceptance" ON public.coach_charter_acceptances
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admin manages acceptances" ON public.coach_charter_acceptances;
CREATE POLICY "Admin manages acceptances" ON public.coach_charter_acceptances
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE OR REPLACE FUNCTION public.provision_modules_for_tier(_user_id uuid, _tier text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _plan_id uuid; _module_id uuid; _included_credits int;
BEGIN
  IF _user_id IS NULL OR _tier IS NULL THEN RETURN; END IF;
  SELECT id, included_credits INTO _plan_id, _included_credits
  FROM public.plans WHERE lower(code) = lower(_tier) AND active = true LIMIT 1;
  IF _plan_id IS NULL THEN RETURN; END IF;

  FOR _module_id IN
    SELECT pm.module_id FROM public.plan_modules pm WHERE pm.plan_id = _plan_id
  LOOP
    INSERT INTO public.user_modules (user_id, module_id, active, activated_at, source)
    VALUES (_user_id, _module_id, true, now(), 'subscription:' || _tier)
    ON CONFLICT (user_id, module_id) DO UPDATE
    SET active = true, activated_at = now(), source = 'subscription:' || _tier;
  END LOOP;

  IF _included_credits > 0 THEN
    INSERT INTO public.ai_credit_ledger (user_id, delta, reason, metadata)
    SELECT _user_id, _included_credits, 'plan_grant',
           jsonb_build_object('tier', _tier, 'period_key', to_char(now(), 'YYYY-MM'))
    WHERE NOT EXISTS (
      SELECT 1 FROM public.ai_credit_ledger
      WHERE user_id = _user_id AND reason = 'plan_grant'
        AND metadata @> jsonb_build_object('period_key', to_char(now(), 'YYYY-MM'), 'tier', _tier)
    );
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_provision_modules_on_tier_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND NEW.current_tier IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.current_tier IS DISTINCT FROM OLD.current_tier) THEN
    PERFORM public.provision_modules_for_tier(NEW.user_id, NEW.current_tier);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS provision_modules_on_tier_change ON public.stripe_customers;
CREATE TRIGGER provision_modules_on_tier_change
  AFTER INSERT OR UPDATE OF current_tier ON public.stripe_customers
  FOR EACH ROW EXECUTE FUNCTION public.trg_provision_modules_on_tier_change();