-- 1. Module add-ons (paid) — pricing alignment
UPDATE public.modules SET monthly_price_chf=3.90, yearly_price_chf=39.00, pricing_type='addon', is_addon=true WHERE slug='behavior_stats';
UPDATE public.modules SET monthly_price_chf=4.90, yearly_price_chf=49.00, pricing_type='addon', is_addon=true WHERE slug='branding';
UPDATE public.modules SET monthly_price_chf=5.90, yearly_price_chf=59.00, pricing_type='addon', is_addon=true WHERE slug='adoption_followup';
UPDATE public.modules SET monthly_price_chf=6.90, yearly_price_chf=69.00, pricing_type='addon', is_addon=true WHERE slug='planning';
UPDATE public.modules SET monthly_price_chf=7.90, yearly_price_chf=79.00, pricing_type='addon', is_addon=true WHERE slug='team_permissions';

-- 2. Included modules — locked to free + included tier
UPDATE public.modules
SET monthly_price_chf=0, yearly_price_chf=0, pricing_type='included', is_addon=false
WHERE slug IN (
  'ai_chatbot','ai_plans','animal_management','exercise_library',
  'messaging','pdf_exports','progress_journal','shelter_management',
  'educator_crm','payments_marketplace'
);

-- 3. AI feature catalog — credits cost & activation
UPDATE public.ai_feature_catalog SET credits_cost=5,  is_active=true WHERE code='plan_generator';
UPDATE public.ai_feature_catalog SET credits_cost=8,  is_active=true WHERE code='education_plan';
UPDATE public.ai_feature_catalog SET credits_cost=13, is_active=true WHERE code='behavior_analysis';
UPDATE public.ai_feature_catalog SET credits_cost=13, is_active=true WHERE code='dog_profile_analysis';
UPDATE public.ai_feature_catalog SET credits_cost=15, is_active=true WHERE code='adoption_plan';
UPDATE public.ai_feature_catalog SET credits_cost=5,  is_active=true WHERE code='behavior_summary';
UPDATE public.ai_feature_catalog SET credits_cost=1,  is_active=true WHERE code='chat';
UPDATE public.ai_feature_catalog SET credits_cost=1,  is_active=true WHERE code='chat_general';