
Diagnostic revu à partir du code et de vos captures

- Le problème des 480 exercices est crédible et prioritaire.
- Les deux fonctions de synchro (`sync-enriched-exercises` et `post-publish-sync`) dépendent toutes les deux du même fichier live :
  `exercise-images/data/exercise-catalog.json`
- Votre capture montre `Catalogue introuvable (400)`. Donc aujourd’hui, tant que ce fichier n’est pas présent/correctement accessible en live, aucun des 480 exercices ne peut arriver, même si la logique d’upsert est correcte.
- Le catalogue crédits IA n’est pas garanti non plus :
  - le front lit `ai_credit_packs_public` et `ai_feature_catalog_public`
  - mais `post-publish-sync` ne seed pas réellement ces catalogues s’ils sont absents ; il met seulement à jour certains coûts/quotas et fait des `update` sur des slugs existants
- Il y a aussi une incohérence de codes d’abonnement à corriger :
  - migration : `freemium`, `refuge_custom`
  - sync live / UI : `starter`, `shelter`
  - tant que ce mapping n’est pas unifié, le shop live peut paraître aligné alors qu’il ne l’est pas vraiment

Plan d’exécution corrigé jusqu’au vrai vert live

1. Audit live exhaustif d’abord
- Vérifier en production les comptes exacts pour :
  - `exercises`
  - `exercise_categories`
  - `subscription_plans`
  - `subscription_plan_prices`
  - `ai_feature_catalog`
  - `ai_credit_packs`
  - `ai_pricing_config`
  - `ai_plan_quotas`
  - `ai_credit_wallets`
  - `ai_credit_ledger`
  - `billing_events`
  - `stripe_customers`
- Vérifier aussi les vues publiques :
  - `ai_credit_packs_public`
  - `ai_feature_catalog_public`
- Lire les logs live de :
  - `sync-enriched-exercises`
  - `post-publish-sync`
  - `create-credits-checkout`
  - `stripe-webhook`
  - `ai-with-credits`

2. Réparer la vraie source des 480 exercices
- Corriger la dépendance critique au fichier live `exercise-images/data/exercise-catalog.json`
- Confirmer qu’il contient bien 480 exercices enrichis complets
- Si le fichier live manque ou est invalide :
  - remettre la source canonique en production
  - sécuriser le pipeline pour qu’il échoue explicitement avec diagnostic précis
- Ajouter un mode de secours pour éviter qu’un simple objet storage manquant bloque toute la prod

3. Rendre la synchro auto-réparatrice
- Renforcer `sync-enriched-exercises` pour vérifier strictement :
  - 480 exercices
  - 25 catégories
  - champs enrichis obligatoires remplis
  - `tutorial_steps >= 4`
- Renforcer `post-publish-sync` pour réparer non seulement une base vide, mais aussi :
  - base partielle
  - base désalignée
  - catalogue crédits IA incomplet
  - catalogue abonnements incomplet

4. Réparer le catalogue crédits IA live
- Seed/upsert réel de :
  - `ai_feature_catalog`
  - `ai_credit_packs`
  - `ai_pricing_config`
  - `ai_plan_quotas`
- Vérifier que les vues publiques exposent bien les packs/fonctionnalités au front
- Vérifier que l’achat de crédits repose sur des packs réellement présents en base live, pas sur une hypothèse

5. Réconcilier complètement le shop
- Choisir un jeu canonique de codes plans et l’appliquer partout
- Aligner :
  - `src/lib/plans.ts`
  - `useSubscription`
  - `Subscription.tsx`
  - `create-checkout`
  - `check-subscription`
  - `stripe-webhook`
  - `subscription_plans`
  - `subscription_plan_prices`
- Éliminer la divergence `freemium/refuge_custom` vs `starter/shelter`

6. Rendre l’admin fiable
- Mettre à jour `AdminDashboard` pour afficher la vérité live :
  - état du fichier catalogue source
  - nombre exact d’exercices
  - état du catalogue crédits IA
  - état du catalogue abonnements
- Ne plus afficher “production prête” si un seul bloc critique est rouge
- Même logique pour `AdminAIEconomy`

7. Gate final obligatoire avant retour
Je ne considérerai la production prête que lorsque ces points seront vrais en live :
- `exercises = 480`
- `exercise_categories = 25`
- 480 exercices avec contenus enrichis complets
- `subscription_plans` rempli et cohérent
- `subscription_plan_prices` rempli et cohérent
- `ai_feature_catalog` rempli
- `ai_credit_packs` rempli
- `ai_pricing_config` rempli
- `ai_plan_quotas` rempli
- les vues publiques IA renvoient bien les données attendues
- au moins 1 achat de crédits IA enregistré correctement
- au moins 1 débit IA réel non privilégié
- `billing_events` alimenté
- aucune fausse alerte “production prête” dans l’admin

Zones à traiter en implémentation
- `supabase/functions/sync-enriched-exercises/index.ts`
- `supabase/functions/post-publish-sync/index.ts`
- `src/pages/AdminDashboard.tsx`
- `src/pages/AdminAIEconomy.tsx`
- `src/lib/plans.ts`
- `src/hooks/useSubscription.tsx`
- `src/pages/Subscription.tsx`
- éventuellement les fonctions Stripe / crédits IA si l’audit live confirme un désalignement

Point clé
- Tant que le fichier catalogue live renvoie 400, les 480 exercices ne peuvent pas arriver.
- Tant que les packs/features IA ne sont pas seedés explicitement en live, le catalogue crédits IA n’est pas fiable.
- Tant que les codes d’abonnement restent incohérents entre code et base, le shop n’est pas réellement prêt.
