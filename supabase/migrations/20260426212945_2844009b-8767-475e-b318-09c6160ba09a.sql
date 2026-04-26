INSERT INTO public.modules (slug, name, description, category, available_for_roles, is_active, sort_order) VALUES
('animal_management','Gestion chiens / animaux','Gérer les fiches chiens : profil, race, suivi, photos.','éducation',ARRAY['owner','adopter','educator','shelter'],true,10),
('exercise_library','Bibliothèque d''exercices','Accès aux 480+ exercices enrichis et tutoriels.','éducation',ARRAY['owner','educator','shelter'],true,20),
('ai_plans','Plans IA','Générer des plans d''entraînement personnalisés par IA.','ia',ARRAY['owner','educator','shelter'],true,30),
('ai_chatbot','Chat IA','Assistant conversationnel pour conseils et analyses.','ia',ARRAY['owner','educator','shelter','adopter'],true,40),
('progress_journal','Journal de progression','Suivre les sessions, l''humeur et la progression du chien.','suivi',ARRAY['owner','educator','shelter'],true,50),
('behavior_stats','Statistiques comportementales','Tableaux de bord et analyses comportementales.','suivi',ARRAY['owner','educator','shelter'],true,60),
('educator_crm','CRM éducateur','Gestion des clients, fiches et historique pour éducateurs.','professionnel',ARRAY['educator'],true,70),
('planning','Planning & rendez-vous','Calendrier, créneaux et gestion des rendez-vous.','professionnel',ARRAY['educator','shelter'],true,80),
('payments_marketplace','Paiements & marketplace','Encaissement Stripe, commissions et marketplace de cours.','commerce',ARRAY['educator'],true,90),
('shelter_management','Gestion refuge','Gestion complète des animaux, espaces et opérations refuge.','refuge',ARRAY['shelter'],true,100),
('adoption_followup','Adoption & post-adoption','Plans d''adoption, suivi post-adoption et check-ins.','adoption',ARRAY['shelter','adopter'],true,110),
('team_permissions','Équipe & permissions','Gestion des employés, rôles et permissions internes.','organisation',ARRAY['educator','shelter'],true,120),
('pdf_exports','Exports PDF','Génération de documents et bilans PDF.','documents',ARRAY['owner','educator','shelter'],true,130),
('branding','Branding / page publique','Personnalisation de la page publique professionnelle.','image',ARRAY['educator','shelter'],true,140),
('messaging','Messagerie','Messagerie interne entre owners, coachs, refuges et adoptants.','communication',ARRAY['owner','educator','shelter','adopter'],true,150)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  available_for_roles = EXCLUDED.available_for_roles,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();