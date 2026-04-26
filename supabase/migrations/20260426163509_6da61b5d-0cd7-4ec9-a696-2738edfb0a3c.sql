-- =========================================================================
-- DOGWORK MODULE – Migration consolidée (idempotente, non destructive)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'shelter',
  owner_user_id uuid NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_member_of_organization(_user_id uuid, _organization_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _organization_id AND status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = _organization_id AND owner_user_id = _user_id
  );
$$;

DROP POLICY IF EXISTS "Admin full org" ON public.organizations;
CREATE POLICY "Admin full org" ON public.organizations FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Owner manages org" ON public.organizations;
CREATE POLICY "Owner manages org" ON public.organizations FOR ALL TO authenticated USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
DROP POLICY IF EXISTS "Members read org" ON public.organizations;
CREATE POLICY "Members read org" ON public.organizations FOR SELECT TO authenticated USING (public.is_member_of_organization(auth.uid(), id));

DROP POLICY IF EXISTS "Admin full org members" ON public.organization_members;
CREATE POLICY "Admin full org members" ON public.organization_members FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Org owner manages members" ON public.organization_members;
CREATE POLICY "Org owner manages members" ON public.organization_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.owner_user_id = auth.uid()));
DROP POLICY IF EXISTS "Members read own membership" ON public.organization_members;
CREATE POLICY "Members read own membership" ON public.organization_members FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  available_for_roles text[] NOT NULL DEFAULT '{}'::text[],
  pricing_type text NOT NULL DEFAULT 'included',
  monthly_price_chf numeric DEFAULT 0,
  yearly_price_chf numeric DEFAULT 0,
  credit_cost integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads active modules" ON public.modules;
CREATE POLICY "Anyone reads active modules" ON public.modules FOR SELECT TO authenticated USING (is_active = true OR is_admin());
DROP POLICY IF EXISTS "Admin manages modules" ON public.modules;
CREATE POLICY "Admin manages modules" ON public.modules FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  target_role text NOT NULL,
  price_chf numeric NOT NULL DEFAULT 0,
  billing_interval text NOT NULL DEFAULT 'month',
  included_credits integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  description text,
  stripe_price_id text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads active plans" ON public.plans;
CREATE POLICY "Anyone reads active plans" ON public.plans FOR SELECT TO authenticated USING (is_active = true OR is_admin());
DROP POLICY IF EXISTS "Admin manages plans" ON public.plans;
CREATE POLICY "Admin manages plans" ON public.plans FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.plan_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_slug text NOT NULL REFERENCES public.plans(slug) ON DELETE CASCADE,
  module_slug text NOT NULL REFERENCES public.modules(slug) ON DELETE CASCADE,
  included boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_slug, module_slug)
);
ALTER TABLE public.plan_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads plan_modules" ON public.plan_modules;
CREATE POLICY "Anyone reads plan_modules" ON public.plan_modules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin manages plan_modules" ON public.plan_modules;
CREATE POLICY "Admin manages plan_modules" ON public.plan_modules FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.module_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_slug text NOT NULL,
  module_slug text NOT NULL,
  limit_key text NOT NULL,
  limit_value integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_slug, module_slug, limit_key)
);
ALTER TABLE public.module_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads module_limits" ON public.module_limits;
CREATE POLICY "Anyone reads module_limits" ON public.module_limits FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin manages module_limits" ON public.module_limits;
CREATE POLICY "Admin manages module_limits" ON public.module_limits FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.organization_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  module_slug text NOT NULL REFERENCES public.modules(slug) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  activated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  source text NOT NULL DEFAULT 'subscription',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, module_slug)
);
ALTER TABLE public.organization_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members read org modules" ON public.organization_modules;
CREATE POLICY "Members read org modules" ON public.organization_modules FOR SELECT TO authenticated
  USING (is_admin() OR public.is_member_of_organization(auth.uid(), organization_id));
DROP POLICY IF EXISTS "Admin manages org modules" ON public.organization_modules;
CREATE POLICY "Admin manages org modules" ON public.organization_modules FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.user_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_slug text NOT NULL REFERENCES public.modules(slug) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  activated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  source text NOT NULL DEFAULT 'subscription',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_slug)
);
ALTER TABLE public.user_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own modules" ON public.user_modules;
CREATE POLICY "Users read own modules" ON public.user_modules FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS "Admin manages user modules" ON public.user_modules;
CREATE POLICY "Admin manages user modules" ON public.user_modules FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.feature_credit_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text UNIQUE NOT NULL,
  label text NOT NULL,
  credit_cost numeric NOT NULL,
  module_slug text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.feature_credit_costs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads feature costs" ON public.feature_credit_costs;
CREATE POLICY "Anyone reads feature costs" ON public.feature_credit_costs FOR SELECT TO authenticated USING (is_active = true OR is_admin());
DROP POLICY IF EXISTS "Admin manages feature costs" ON public.feature_credit_costs;
CREATE POLICY "Admin manages feature costs" ON public.feature_credit_costs FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.feature_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid,
  module_slug text NOT NULL,
  feature_key text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  credit_cost numeric NOT NULL DEFAULT 0,
  used_at timestamptz NOT NULL DEFAULT now(),
  reference_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own usage" ON public.feature_usage;
CREATE POLICY "Users read own usage" ON public.feature_usage FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS "No direct insert usage" ON public.feature_usage;
CREATE POLICY "No direct insert usage" ON public.feature_usage FOR INSERT TO public WITH CHECK (false);

CREATE TABLE IF NOT EXISTS public.educator_referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_id uuid NOT NULL,
  code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active',
  commission_rate numeric NOT NULL DEFAULT 0.08,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);
ALTER TABLE public.educator_referral_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Educators manage own codes" ON public.educator_referral_codes;
CREATE POLICY "Educators manage own codes" ON public.educator_referral_codes FOR ALL TO authenticated
  USING (educator_id = auth.uid()) WITH CHECK (educator_id = auth.uid());
DROP POLICY IF EXISTS "Admin full referral codes" ON public.educator_referral_codes;
CREATE POLICY "Admin full referral codes" ON public.educator_referral_codes FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Anyone validates code" ON public.educator_referral_codes;
CREATE POLICY "Anyone validates code" ON public.educator_referral_codes FOR SELECT TO authenticated USING (status = 'active');

CREATE TABLE IF NOT EXISTS public.course_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  booking_id uuid,
  owner_id uuid NOT NULL,
  dog_id uuid,
  participant_name text,
  status text NOT NULL DEFAULT 'registered',
  checked_in boolean NOT NULL DEFAULT false,
  checked_in_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.course_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Educators manage own course participants" ON public.course_participants;
CREATE POLICY "Educators manage own course participants" ON public.course_participants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.educator_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.educator_user_id = auth.uid()));
DROP POLICY IF EXISTS "Owners read own participation" ON public.course_participants;
CREATE POLICY "Owners read own participation" ON public.course_participants FOR SELECT TO authenticated USING (owner_id = auth.uid());
DROP POLICY IF EXISTS "Admin full participants" ON public.course_participants;
CREATE POLICY "Admin full participants" ON public.course_participants FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.marketplace_compliance_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  checked_by uuid,
  check_type text NOT NULL DEFAULT 'planned',
  scheduled boolean NOT NULL DEFAULT false,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  declared_participants integer,
  actual_participants integer,
  registered_participants integer,
  paid_participants integer,
  mismatch_detected boolean NOT NULL DEFAULT false,
  notes text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_compliance_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full compliance" ON public.marketplace_compliance_checks;
CREATE POLICY "Admin full compliance" ON public.marketplace_compliance_checks FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Educators read own checks" ON public.marketplace_compliance_checks;
CREATE POLICY "Educators read own checks" ON public.marketplace_compliance_checks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.educator_user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.marketplace_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_id uuid,
  organization_id uuid,
  restriction_type text NOT NULL,
  reason text,
  severity text NOT NULL DEFAULT 'info',
  status text NOT NULL DEFAULT 'active',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_restrictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full restrictions" ON public.marketplace_restrictions;
CREATE POLICY "Admin full restrictions" ON public.marketplace_restrictions FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Educators read own restrictions" ON public.marketplace_restrictions;
CREATE POLICY "Educators read own restrictions" ON public.marketplace_restrictions FOR SELECT TO authenticated USING (educator_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.marketplace_policy_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  educator_id uuid,
  course_id uuid,
  booking_id uuid,
  flag_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  description text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.marketplace_policy_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full flags" ON public.marketplace_policy_flags;
CREATE POLICY "Admin full flags" ON public.marketplace_policy_flags FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Users create flags" ON public.marketplace_policy_flags;
CREATE POLICY "Users create flags" ON public.marketplace_policy_flags FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users read own flags" ON public.marketplace_policy_flags;
CREATE POLICY "Users read own flags" ON public.marketplace_policy_flags FOR SELECT TO authenticated USING (user_id = auth.uid() OR educator_id = auth.uid() OR is_admin());

-- Functions
CREATE OR REPLACE FUNCTION public.has_module(_user_id uuid, _organization_id uuid, _module_slug text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _ok boolean;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'admin'::app_role) THEN RETURN true; END IF;
  IF _organization_id IS NOT NULL THEN
    SELECT EXISTS (SELECT 1 FROM organization_modules om WHERE om.organization_id = _organization_id AND om.module_slug = _module_slug AND om.status IN ('active','trial') AND (om.expires_at IS NULL OR om.expires_at > now())) INTO _ok;
    IF _ok THEN RETURN true; END IF;
  END IF;
  SELECT EXISTS (SELECT 1 FROM user_modules um WHERE um.user_id = _user_id AND um.module_slug = _module_slug AND um.status IN ('active','trial') AND (um.expires_at IS NULL OR um.expires_at > now())) INTO _ok;
  RETURN COALESCE(_ok, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.can_use_feature(_user_id uuid, _organization_id uuid, _module_slug text, _feature_key text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'admin'::app_role) THEN RETURN true; END IF;
  IF NOT public.has_module(_user_id, _organization_id, _module_slug) THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM marketplace_restrictions r WHERE (r.educator_id = _user_id OR r.organization_id = _organization_id) AND r.status = 'active' AND r.restriction_type IN ('account_suspended','module_suspended','permanent_ban') AND (r.ends_at IS NULL OR r.ends_at > now())) THEN RETURN false; END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.debit_dogwork_credits(_user_id uuid, _organization_id uuid, _feature_key text, _module_slug text, _reference_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cost numeric; _wallet_id uuid; _balance integer; _new_balance integer;
BEGIN
  SELECT credit_cost INTO _cost FROM feature_credit_costs WHERE feature_key = _feature_key AND is_active = true;
  IF _cost IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'feature_not_found'); END IF;
  SELECT id, balance INTO _wallet_id, _balance FROM ai_credit_wallets WHERE user_id = _user_id LIMIT 1;
  IF _wallet_id IS NULL THEN
    INSERT INTO ai_credit_wallets (user_id, balance) VALUES (_user_id, 0) RETURNING id, balance INTO _wallet_id, _balance;
  END IF;
  IF _balance < _cost THEN RETURN jsonb_build_object('success', false, 'error', 'insufficient_credits', 'balance', _balance, 'required', _cost); END IF;
  _new_balance := _balance - _cost::integer;
  UPDATE ai_credit_wallets SET balance = _new_balance, lifetime_consumed = lifetime_consumed + _cost::integer, updated_at = now() WHERE id = _wallet_id;
  INSERT INTO ai_credit_ledger (wallet_id, user_id, credits_delta, operation_type, balance_after, feature_code, description, status)
    VALUES (_wallet_id, _user_id, -_cost::integer, 'debit', _new_balance, _feature_key, 'DogWork module debit', 'success');
  INSERT INTO feature_usage (user_id, organization_id, module_slug, feature_key, credit_cost, reference_id)
    VALUES (_user_id, _organization_id, COALESCE(_module_slug, 'unknown'), _feature_key, _cost, _reference_id);
  RETURN jsonb_build_object('success', true, 'balance', _new_balance, 'cost', _cost);
END;
$$;

-- Seed modules
INSERT INTO public.modules (slug, name, description, category, available_for_roles, sort_order) VALUES
  ('animal_management', 'Gestion chiens / animaux', 'Créer les fiches, suivre l''historique et centraliser les informations essentielles.', 'éducation', ARRAY['owner','adopter','educator','shelter'], 1),
  ('exercise_library', 'Bibliothèque d''exercices', 'Accéder à un catalogue structuré d''exercices selon l''objectif et le niveau.', 'éducation', ARRAY['owner','educator','shelter'], 2),
  ('ai_plans', 'Plans IA', 'Générer des plans personnalisés selon le profil et les objectifs du chien.', 'ia', ARRAY['owner','educator','shelter'], 3),
  ('ai_chatbot', 'Chat IA', 'Poser des questions et obtenir une aide contextualisée.', 'ia', ARRAY['owner','educator','shelter','adopter'], 4),
  ('progress_journal', 'Journal de progression', 'Documenter les séances et les observations.', 'suivi', ARRAY['owner','educator','shelter'], 5),
  ('behavior_stats', 'Statistiques comportementales', 'Visualiser l''évolution et repérer les tendances.', 'suivi', ARRAY['owner','educator','shelter'], 6),
  ('educator_crm', 'CRM éducateur', 'Gérer les clients et les chiens suivis.', 'professionnel', ARRAY['educator'], 7),
  ('planning', 'Planning & rendez-vous', 'Organiser les disponibilités et les séances.', 'professionnel', ARRAY['educator','shelter'], 8),
  ('payments_marketplace', 'Paiements & marketplace', 'Vendre des cours et encaisser via la plateforme.', 'commerce', ARRAY['educator'], 9),
  ('shelter_management', 'Gestion refuge', 'Centraliser les animaux, équipes et observations.', 'refuge', ARRAY['shelter'], 10),
  ('adoption_followup', 'Adoption & post-adoption', 'Accompagner la transition vers le nouveau foyer.', 'adoption', ARRAY['shelter','adopter'], 11),
  ('team_permissions', 'Équipe & permissions', 'Inviter des membres et attribuer des accès.', 'organisation', ARRAY['educator','shelter'], 12),
  ('pdf_exports', 'Exports PDF', 'Créer des bilans et fiches prêts à transmettre.', 'documents', ARRAY['owner','educator','shelter'], 13),
  ('branding', 'Branding / page publique', 'Valoriser son identité avec une présentation pro.', 'image', ARRAY['educator','shelter'], 14),
  ('messaging', 'Messagerie', 'Échanger autour d''un chien ou d''un suivi.', 'communication', ARRAY['owner','educator','shelter','adopter'], 15)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, category = EXCLUDED.category, available_for_roles = EXCLUDED.available_for_roles, updated_at = now();

-- Seed plans
INSERT INTO public.plans (slug, name, target_role, price_chf, billing_interval, included_credits, description, sort_order) VALUES
  ('owner_starter', 'Propriétaire Starter', 'owner', 0, 'month', 1, '1 chien, découverte, suivi de base.', 1),
  ('owner_pro', 'Propriétaire Pro', 'owner', 9.90, 'month', 10, 'Exercices avancés, journal, statistiques.', 2),
  ('owner_expert', 'Propriétaire Expert', 'owner', 19.90, 'month', 30, 'Bibliothèque complète, statistiques avancées.', 3),
  ('educator', 'Éducateur', 'educator', 200, 'year', 30, 'CRM, clients, suivi, planning simple.', 4),
  ('educator_pro', 'Éducateur Pro', 'educator', 39.90, 'month', 100, 'Espace professionnel complet.', 5),
  ('refuge_pilot', 'Refuge Pilot', 'shelter', 0, '90_days', 100, 'Accès pilote, découverte terrain.', 6),
  ('refuge_essential', 'Refuge Essential', 'shelter', 290, 'year', 50, 'Animaux, équipe, observations.', 7),
  ('refuge_pro', 'Refuge Pro', 'shelter', 590, 'year', 150, 'Adoption, rapports, statistiques.', 8)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, price_chf = EXCLUDED.price_chf, included_credits = EXCLUDED.included_credits, description = EXCLUDED.description, updated_at = now();

INSERT INTO public.plan_modules (plan_slug, module_slug) VALUES
  ('owner_starter','animal_management'),('owner_starter','exercise_library'),('owner_starter','progress_journal'),
  ('owner_pro','animal_management'),('owner_pro','exercise_library'),('owner_pro','progress_journal'),('owner_pro','behavior_stats'),('owner_pro','pdf_exports'),
  ('owner_expert','animal_management'),('owner_expert','exercise_library'),('owner_expert','ai_plans'),('owner_expert','ai_chatbot'),('owner_expert','progress_journal'),('owner_expert','behavior_stats'),('owner_expert','pdf_exports'),('owner_expert','messaging'),
  ('educator','educator_crm'),('educator','animal_management'),('educator','exercise_library'),('educator','progress_journal'),('educator','planning'),('educator','pdf_exports'),('educator','ai_plans'),('educator','payments_marketplace'),
  ('educator_pro','educator_crm'),('educator_pro','planning'),('educator_pro','payments_marketplace'),('educator_pro','branding'),('educator_pro','pdf_exports'),('educator_pro','messaging'),('educator_pro','ai_plans'),('educator_pro','ai_chatbot'),('educator_pro','behavior_stats'),('educator_pro','animal_management'),('educator_pro','exercise_library'),('educator_pro','progress_journal'),
  ('refuge_pilot','shelter_management'),('refuge_pilot','team_permissions'),('refuge_pilot','adoption_followup'),('refuge_pilot','pdf_exports'),('refuge_pilot','ai_plans'),('refuge_pilot','behavior_stats'),
  ('refuge_essential','shelter_management'),('refuge_essential','team_permissions'),('refuge_essential','progress_journal'),('refuge_essential','pdf_exports'),
  ('refuge_pro','shelter_management'),('refuge_pro','team_permissions'),('refuge_pro','adoption_followup'),('refuge_pro','behavior_stats'),('refuge_pro','pdf_exports'),('refuge_pro','messaging'),('refuge_pro','ai_plans'),('refuge_pro','educator_crm')
ON CONFLICT (plan_slug, module_slug) DO NOTHING;

INSERT INTO public.module_limits (plan_slug, module_slug, limit_key, limit_value) VALUES
  ('owner_starter','animal_management','max_animals',1),
  ('owner_starter','ai_plans','max_ai_plans_per_month',1),
  ('owner_starter','exercise_library','max_exercises_access',30),
  ('owner_pro','animal_management','max_animals',3),
  ('owner_pro','ai_plans','max_ai_plans_per_month',2),
  ('owner_pro','exercise_library','max_exercises_access',150),
  ('owner_expert','animal_management','max_animals',999),
  ('owner_expert','ai_plans','max_ai_plans_per_month',10),
  ('owner_expert','exercise_library','max_exercises_access',999),
  ('educator','educator_crm','max_clients',100),
  ('educator','payments_marketplace','max_active_courses',10),
  ('educator','team_permissions','max_team_members',1),
  ('educator_pro','educator_crm','max_clients',999),
  ('educator_pro','payments_marketplace','max_active_courses',999),
  ('educator_pro','team_permissions','max_team_members',5),
  ('refuge_pilot','shelter_management','max_animals',10),
  ('refuge_pilot','team_permissions','max_team_members',3),
  ('refuge_essential','shelter_management','max_animals',50),
  ('refuge_essential','team_permissions','max_team_members',5),
  ('refuge_pro','shelter_management','max_animals',999),
  ('refuge_pro','team_permissions','max_team_members',15)
ON CONFLICT (plan_slug, module_slug, limit_key) DO UPDATE SET limit_value = EXCLUDED.limit_value;

INSERT INTO public.feature_credit_costs (feature_key, label, credit_cost, module_slug) VALUES
  ('chat_short', 'Chat IA court', 0.5, 'ai_chatbot'),
  ('chat_long', 'Chat IA long', 1, 'ai_chatbot'),
  ('exercise_recommendation', 'Recommandation d''exercices', 1, 'exercise_library'),
  ('session_summary', 'Résumé d''une séance', 2, 'progress_journal'),
  ('plan_adapt', 'Adaptation d''un plan', 2, 'ai_plans'),
  ('ai_plan_7d', 'Plan IA 7 jours', 2, 'ai_plans'),
  ('ai_plan_14d', 'Plan IA 14 jours', 3, 'ai_plans'),
  ('ai_plan_28d', 'Plan IA 28 jours', 5, 'ai_plans'),
  ('pdf_simple', 'Rapport PDF simple', 1, 'pdf_exports'),
  ('pdf_ai_full', 'Rapport PDF IA complet', 3, 'pdf_exports'),
  ('behavior_assessment', 'Bilan comportemental IA', 5, 'behavior_stats'),
  ('adopter_sheet', 'Fiche adoptant IA', 3, 'adoption_followup'),
  ('post_adoption_plan', 'Plan post-adoption', 5, 'adoption_followup'),
  ('shelter_monthly_synthesis', 'Synthèse mensuelle refuge', 10, 'shelter_management'),
  ('multi_obs_analysis', 'Analyse avancée multi-observations', 10, 'behavior_stats'),
  ('animal_full_export', 'Export pack complet animal', 5, 'pdf_exports'),
  ('educator_full_report', 'Rapport éducateur complet', 5, 'educator_crm')
ON CONFLICT (feature_key) DO UPDATE SET label = EXCLUDED.label, credit_cost = EXCLUDED.credit_cost, module_slug = EXCLUDED.module_slug, updated_at = now();

CREATE INDEX IF NOT EXISTS idx_org_modules_org ON public.organization_modules(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_modules_user ON public.user_modules(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_user ON public.feature_usage(user_id, used_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_participants_course ON public.course_participants(course_id);
CREATE INDEX IF NOT EXISTS idx_referral_code ON public.educator_referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);