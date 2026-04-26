-- ============================================================
-- DOGWORK GO-LIVE PROVISIONING (idempotent)
-- ============================================================

-- 1) Modules de base : upsert (rejouable, non destructif)
INSERT INTO public.modules
  (slug, name, description, category, available_for_roles, pricing_type, monthly_price_chf, yearly_price_chf, credit_cost, sort_order, is_active)
VALUES
  ('animal_management',   'Gestion chiens / animaux',           'Fiches, profils, suivi des animaux',                    'éducation',     ARRAY['owner','adopter','educator','shelter']::text[], 'included', 0, 0, 0, 1,  true),
  ('exercise_library',    'Bibliothèque d''exercices',          'Catalogue des 480+ exercices enrichis',                 'éducation',     ARRAY['owner','educator','shelter']::text[],            'included', 0, 0, 0, 2,  true),
  ('ai_plans',            'Plans IA',                            'Génération de plans d''entraînement assistée par IA',   'ia',            ARRAY['owner','educator','shelter']::text[],            'included', 0, 0, 0, 3,  true),
  ('ai_chatbot',          'Chat IA',                             'Assistant conversationnel canin',                       'ia',            ARRAY['owner','educator','shelter','adopter']::text[],  'included', 0, 0, 0, 4,  true),
  ('progress_journal',    'Journal de progression',              'Notes et journal d''entraînement',                      'suivi',         ARRAY['owner','educator','shelter']::text[],            'included', 0, 0, 0, 5,  true),
  ('behavior_stats',      'Statistiques comportementales',       'Tableaux de bord comportementaux',                      'suivi',         ARRAY['owner','educator','shelter']::text[],            'included', 0, 0, 0, 6,  true),
  ('educator_crm',        'CRM éducateur',                       'Gestion clients, animaux, notes',                       'professionnel', ARRAY['educator']::text[],                              'included', 0, 0, 0, 7,  true),
  ('planning',            'Planning & rendez-vous',              'Calendrier, créneaux, RDV',                             'professionnel', ARRAY['educator','shelter']::text[],                    'included', 0, 0, 0, 8,  true),
  ('payments_marketplace','Paiements & marketplace',             'Cours, réservations, payouts Stripe Connect',           'commerce',      ARRAY['educator']::text[],                              'included', 0, 0, 0, 9,  true),
  ('shelter_management',  'Gestion refuge',                      'Espaces, employés, opérations refuge',                  'refuge',        ARRAY['shelter']::text[],                               'included', 0, 0, 0, 10, true),
  ('adoption_followup',   'Adoption & post-adoption',            'Plans d''adoption, suivi adoptant',                     'adoption',      ARRAY['shelter','adopter']::text[],                     'included', 0, 0, 0, 11, true),
  ('team_permissions',    'Équipe & permissions',                'Membres, rôles, droits',                                'organisation',  ARRAY['educator','shelter']::text[],                    'included', 0, 0, 0, 12, true),
  ('pdf_exports',         'Exports PDF',                         'Rapports et exports documents',                         'documents',     ARRAY['owner','educator','shelter']::text[],            'included', 0, 0, 0, 13, true),
  ('branding',            'Branding / page publique',            'Identité visuelle et page publique',                    'image',         ARRAY['educator','shelter']::text[],                    'included', 0, 0, 0, 14, true),
  ('messaging',           'Messagerie',                          'Messagerie inter-rôles',                                'communication', ARRAY['owner','educator','shelter','adopter']::text[],  'included', 0, 0, 0, 15, true)
ON CONFLICT (slug) DO UPDATE SET
  name                 = EXCLUDED.name,
  description          = EXCLUDED.description,
  category             = EXCLUDED.category,
  available_for_roles  = EXCLUDED.available_for_roles,
  pricing_type         = EXCLUDED.pricing_type,
  sort_order           = EXCLUDED.sort_order,
  is_active            = true,
  updated_at           = now();

-- 2) Dépublier les cours placeholder (sans suppression)
--    Heuristique safe : titre ≤ 12 caractères, sans espace, et pas dans une liste de titres connus.
UPDATE public.courses
SET is_active = false,
    is_public = false,
    updated_at = now()
WHERE is_active = true
  AND title IS NOT NULL
  AND length(btrim(title)) <= 14
  AND title NOT LIKE '% %'
  AND title !~ '^[A-ZÉÈÀÂÊÎÔÛÇ][a-zéèàâêîôûç''-]{2,}$';
