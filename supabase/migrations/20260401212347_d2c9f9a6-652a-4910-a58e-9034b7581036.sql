
-- ============================================
-- AI CREDITS SYSTEM - CORE TABLES
-- ============================================

-- 1. AI Feature Catalog: all AI actions with pricing
CREATE TABLE public.ai_feature_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  label text NOT NULL,
  description text,
  model text NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  cost_estimate_min_usd numeric(10,6) NOT NULL DEFAULT 0.001,
  cost_estimate_avg_usd numeric(10,6) NOT NULL DEFAULT 0.005,
  cost_estimate_max_usd numeric(10,6) NOT NULL DEFAULT 0.02,
  credits_cost integer NOT NULL DEFAULT 1,
  margin_target numeric(5,2) NOT NULL DEFAULT 3.0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. AI Credit Wallets: one per user
CREATE TABLE public.ai_credit_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance integer NOT NULL DEFAULT 0,
  lifetime_purchased integer NOT NULL DEFAULT 0,
  lifetime_consumed integer NOT NULL DEFAULT 0,
  lifetime_refunded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT positive_balance CHECK (balance >= 0)
);

-- 3. AI Credit Ledger: full history of all credit movements
CREATE TYPE public.ai_ledger_type AS ENUM (
  'consumption', 'purchase', 'bonus', 'refund', 'admin_adjustment', 'monthly_grant'
);

CREATE TABLE public.ai_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wallet_id uuid NOT NULL REFERENCES public.ai_credit_wallets(id) ON DELETE CASCADE,
  operation_type public.ai_ledger_type NOT NULL,
  credits_delta integer NOT NULL,
  balance_after integer NOT NULL,
  feature_code text REFERENCES public.ai_feature_catalog(code),
  description text,
  provider_cost_usd numeric(10,6),
  public_price_chf numeric(10,4),
  stripe_payment_id text,
  status text NOT NULL DEFAULT 'success',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_ledger_user ON public.ai_credit_ledger(user_id, created_at DESC);
CREATE INDEX idx_ai_ledger_feature ON public.ai_credit_ledger(feature_code, created_at DESC);

-- 4. AI Credit Packs: purchasable bundles
CREATE TABLE public.ai_credit_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  label text NOT NULL,
  description text,
  credits integer NOT NULL,
  price_chf numeric(8,2) NOT NULL,
  stripe_price_id text,
  stripe_product_id text,
  cost_estimate_usd numeric(8,4),
  margin_estimate numeric(5,2),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. AI Pricing Config: global pricing parameters
CREATE TABLE public.ai_pricing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value numeric NOT NULL,
  label text,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. AI Plan Quotas: credits included per subscription plan
CREATE TABLE public.ai_plan_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_slug text UNIQUE NOT NULL,
  monthly_credits integer NOT NULL DEFAULT 0,
  discount_percent numeric(5,2) NOT NULL DEFAULT 0,
  daily_limit integer,
  per_action_limit integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default pricing config
INSERT INTO public.ai_pricing_config (key, value, label, description) VALUES
  ('usd_to_chf', 0.88, 'Taux USD → CHF', 'Taux de conversion dollar vers franc suisse'),
  ('margin_prudent', 2.5, 'Marge prudente', 'Coefficient multiplicateur prudent'),
  ('margin_standard', 3.5, 'Marge standard', 'Coefficient multiplicateur standard'),
  ('margin_aggressive', 5.0, 'Marge agressive', 'Coefficient multiplicateur agressif'),
  ('credit_value_chf', 0.05, 'Valeur 1 crédit (CHF)', 'Prix de vente public d''un crédit en CHF'),
  ('safety_buffer', 1.2, 'Buffer de sécurité', 'Majoration de sécurité sur le coût estimé'),
  ('min_credits_per_action', 1, 'Minimum par action', 'Nombre minimum de crédits par action IA'),
  ('welcome_bonus_credits', 10, 'Bonus bienvenue', 'Crédits offerts à l''inscription');

-- Insert default plan quotas
INSERT INTO public.ai_plan_quotas (plan_slug, monthly_credits, discount_percent) VALUES
  ('starter', 5, 0),
  ('pro', 30, 10),
  ('expert', 100, 20),
  ('educator', 200, 25),
  ('shelter', 150, 20);

-- Insert default AI features
INSERT INTO public.ai_feature_catalog (code, label, description, model, cost_estimate_min_usd, cost_estimate_avg_usd, cost_estimate_max_usd, credits_cost) VALUES
  ('chat_general', 'Chat IA général', 'Conversation libre avec l''assistant DogWork AI', 'google/gemini-3-flash-preview', 0.0005, 0.003, 0.015, 2),
  ('dog_profile_analysis', 'Analyse de profil chien', 'Analyse IA du profil comportemental d''un chien', 'google/gemini-3-flash-preview', 0.002, 0.008, 0.025, 5),
  ('education_plan', 'Plan éducatif IA', 'Génération d''un plan d''éducation personnalisé', 'google/gemini-2.5-flash', 0.005, 0.015, 0.04, 10),
  ('behavior_summary', 'Résumé comportemental', 'Synthèse IA d''un dossier comportemental', 'google/gemini-3-flash-preview', 0.002, 0.006, 0.02, 4),
  ('content_rewrite', 'Reformulation', 'Reformulation ou amélioration de texte', 'google/gemini-2.5-flash-lite', 0.0003, 0.001, 0.005, 1),
  ('behavior_analysis', 'Analyse comportementale', 'Analyse IA approfondie du comportement', 'google/gemini-2.5-flash', 0.003, 0.01, 0.03, 6),
  ('record_enrichment', 'Enrichissement de fiche', 'Enrichissement IA d''une fiche animal', 'google/gemini-3-flash-preview', 0.002, 0.007, 0.02, 4),
  ('marketing_content', 'Contenu marketing', 'Génération de contenu marketing / descriptions', 'google/gemini-3-flash-preview', 0.001, 0.004, 0.012, 3),
  ('adoption_plan', 'Plan d''adoption IA', 'Génération d''un plan d''accueil post-adoption', 'google/gemini-2.5-flash', 0.004, 0.012, 0.035, 8);

-- Insert default credit packs
INSERT INTO public.ai_credit_packs (slug, label, description, credits, price_chf, cost_estimate_usd, margin_estimate, sort_order) VALUES
  ('starter_pack', 'Pack Découverte', '50 crédits pour tester les fonctionnalités IA', 50, 2.90, 0.15, 17.3, 1),
  ('standard_pack', 'Pack Standard', '150 crédits pour un usage régulier', 150, 6.90, 0.45, 13.5, 2),
  ('premium_pack', 'Pack Premium', '500 crédits pour les utilisateurs intensifs', 500, 19.90, 1.50, 11.8, 3);

-- Updated_at triggers
CREATE TRIGGER update_ai_credit_wallets_updated_at BEFORE UPDATE ON public.ai_credit_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_feature_catalog_updated_at BEFORE UPDATE ON public.ai_feature_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_credit_packs_updated_at BEFORE UPDATE ON public.ai_credit_packs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_plan_quotas_updated_at BEFORE UPDATE ON public.ai_plan_quotas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.ai_credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feature_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_pricing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_plan_quotas ENABLE ROW LEVEL SECURITY;

-- Wallets: users see their own, admins see all
CREATE POLICY "Users read own wallet" ON public.ai_credit_wallets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Ledger: users see their own entries, admins see all
CREATE POLICY "Users read own ledger" ON public.ai_credit_ledger FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Feature catalog: everyone can read (to show costs), only admin can modify
CREATE POLICY "Anyone can read features" ON public.ai_feature_catalog FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Admin manages features" ON public.ai_feature_catalog FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Credit packs: everyone can read active packs
CREATE POLICY "Anyone can read packs" ON public.ai_credit_packs FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Admin manages packs" ON public.ai_credit_packs FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Pricing config: everyone reads, admin writes
CREATE POLICY "Anyone reads pricing config" ON public.ai_pricing_config FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Admin manages pricing config" ON public.ai_pricing_config FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Plan quotas: everyone reads, admin writes
CREATE POLICY "Anyone reads plan quotas" ON public.ai_plan_quotas FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Admin manages plan quotas" ON public.ai_plan_quotas FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================
-- CORE FUNCTIONS
-- ============================================

-- Function: ensure wallet exists for a user (creates if missing)
CREATE OR REPLACE FUNCTION public.ensure_ai_wallet(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  wallet_id uuid;
  bonus integer;
BEGIN
  SELECT id INTO wallet_id FROM public.ai_credit_wallets WHERE user_id = _user_id;
  IF wallet_id IS NOT NULL THEN
    RETURN wallet_id;
  END IF;

  -- Get welcome bonus
  SELECT COALESCE(value, 10)::integer INTO bonus FROM public.ai_pricing_config WHERE key = 'welcome_bonus_credits';

  INSERT INTO public.ai_credit_wallets (user_id, balance)
  VALUES (_user_id, bonus)
  RETURNING id INTO wallet_id;

  -- Log welcome bonus
  IF bonus > 0 THEN
    INSERT INTO public.ai_credit_ledger (user_id, wallet_id, operation_type, credits_delta, balance_after, description)
    VALUES (_user_id, wallet_id, 'bonus', bonus, bonus, 'Bonus de bienvenue');
  END IF;

  RETURN wallet_id;
END;
$$;

-- Function: debit credits (returns true if successful)
CREATE OR REPLACE FUNCTION public.debit_ai_credits(
  _user_id uuid,
  _feature_code text,
  _credits integer,
  _provider_cost_usd numeric DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  w_id uuid;
  current_balance integer;
  new_balance integer;
BEGIN
  -- Ensure wallet exists
  w_id := public.ensure_ai_wallet(_user_id);

  -- Lock the wallet row for update
  SELECT balance INTO current_balance
  FROM public.ai_credit_wallets
  WHERE id = w_id
  FOR UPDATE;

  IF current_balance < _credits THEN
    -- Log failed attempt
    INSERT INTO public.ai_credit_ledger (user_id, wallet_id, operation_type, credits_delta, balance_after, feature_code, status, metadata)
    VALUES (_user_id, w_id, 'consumption', -_credits, current_balance, _feature_code, 'failed_insufficient', _metadata);
    RETURN false;
  END IF;

  new_balance := current_balance - _credits;

  UPDATE public.ai_credit_wallets
  SET balance = new_balance, lifetime_consumed = lifetime_consumed + _credits
  WHERE id = w_id;

  INSERT INTO public.ai_credit_ledger (
    user_id, wallet_id, operation_type, credits_delta, balance_after,
    feature_code, provider_cost_usd, status, metadata
  )
  VALUES (
    _user_id, w_id, 'consumption', -_credits, new_balance,
    _feature_code, _provider_cost_usd, 'success', _metadata
  );

  RETURN true;
END;
$$;

-- Function: credit (add) credits to a wallet
CREATE OR REPLACE FUNCTION public.credit_ai_wallet(
  _user_id uuid,
  _credits integer,
  _operation_type public.ai_ledger_type,
  _description text DEFAULT NULL,
  _stripe_payment_id text DEFAULT NULL,
  _public_price_chf numeric DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  w_id uuid;
  new_balance integer;
BEGIN
  w_id := public.ensure_ai_wallet(_user_id);

  UPDATE public.ai_credit_wallets
  SET balance = balance + _credits,
      lifetime_purchased = CASE WHEN _operation_type = 'purchase' THEN lifetime_purchased + _credits ELSE lifetime_purchased END,
      lifetime_refunded = CASE WHEN _operation_type = 'refund' THEN lifetime_refunded + _credits ELSE lifetime_refunded END
  WHERE id = w_id
  RETURNING balance INTO new_balance;

  INSERT INTO public.ai_credit_ledger (
    user_id, wallet_id, operation_type, credits_delta, balance_after,
    description, stripe_payment_id, public_price_chf, status
  )
  VALUES (
    _user_id, w_id, _operation_type, _credits, new_balance,
    _description, _stripe_payment_id, _public_price_chf, 'success'
  );

  RETURN new_balance;
END;
$$;

-- Function: get wallet balance (ensures wallet exists)
CREATE OR REPLACE FUNCTION public.get_ai_balance(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  bal integer;
BEGIN
  SELECT balance INTO bal FROM public.ai_credit_wallets WHERE user_id = _user_id;
  IF bal IS NULL THEN
    PERFORM public.ensure_ai_wallet(_user_id);
    SELECT balance INTO bal FROM public.ai_credit_wallets WHERE user_id = _user_id;
  END IF;
  RETURN COALESCE(bal, 0);
END;
$$;

-- Admin view: AI economy summary
CREATE OR REPLACE FUNCTION public.admin_ai_economy_summary()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'total_calls', (SELECT COUNT(*) FROM ai_credit_ledger WHERE operation_type = 'consumption'),
    'total_credits_consumed', (SELECT COALESCE(SUM(ABS(credits_delta)), 0) FROM ai_credit_ledger WHERE operation_type = 'consumption' AND status = 'success'),
    'total_provider_cost_usd', (SELECT COALESCE(SUM(provider_cost_usd), 0) FROM ai_credit_ledger WHERE operation_type = 'consumption' AND status = 'success'),
    'total_revenue_chf', (SELECT COALESCE(SUM(public_price_chf), 0) FROM ai_credit_ledger WHERE operation_type = 'purchase'),
    'total_wallets', (SELECT COUNT(*) FROM ai_credit_wallets),
    'total_balance_outstanding', (SELECT COALESCE(SUM(balance), 0) FROM ai_credit_wallets),
    'failed_insufficient', (SELECT COUNT(*) FROM ai_credit_ledger WHERE status = 'failed_insufficient'),
    'top_features', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT feature_code, COUNT(*) as call_count, SUM(ABS(credits_delta)) as total_credits,
               COALESCE(SUM(provider_cost_usd), 0) as total_cost
        FROM ai_credit_ledger WHERE operation_type = 'consumption' AND status = 'success' AND feature_code IS NOT NULL
        GROUP BY feature_code ORDER BY total_credits DESC LIMIT 10
      ) t
    )
  )
  WHERE public.is_admin();
$$;
