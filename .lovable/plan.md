
Objectif de reprise
- Je repars de l’état réel de la production live, pas des hypothèses.
- Je ne considérerai pas l’application “prête” tant que tous les contrôles live ne sont pas au vert.

État réel constaté en production
- `public.exercises` : 0 ligne
- `public.exercise_categories` : 25 lignes
- `public.subscription_plans` : 0 ligne
- `public.subscription_plan_prices` : 0 ligne
- `public.ai_feature_catalog` : 13 lignes
- `public.ai_credit_packs` : 3 packs actifs
- `public.ai_pricing_config` : 10 lignes
- `public.ai_plan_quotas` : 5 lignes
- `public.ai_credit_wallets` : 1 wallet
- `public.ai_credit_ledger` : uniquement bonus / ajustements admin / appels privilégiés à 0 crédit
- `public.billing_events` : 0 ligne
- `public.stripe_customers` : 1 ligne, tier `starter`, statut `none`
- Donc : la production live n’est pas prête aujourd’hui.

Conclusion importante
- Le problème principal n’est pas seulement la visibilité : la table `exercises` est vide en live.
- Le diff RLS précédent (“public can view exercises”) ne règle donc pas le vrai blocage.
- Le shop propriétaire fonctionne encore côté UI avec des valeurs codées en dur, mais le catalogue d’abonnements en base live est vide, donc l’écosystème monétisation n’est pas aligné.
- Les métriques IA live ne prouvent pas encore un vrai fonctionnement commercial : il n’y a ni achat réel de crédits, ni événement webhook enregistré, ni débit réel sur un compte non privilégié.

Plan d’exécution jusqu’au vert complet
1. Réparer définitivement le pipeline live des 480 exercices
- Vérifier la source live `exercise-images/data/exercise-catalog.json` et confirmer qu’elle contient bien 480 exercices enrichis.
- Auditer les logs live des fonctions `sync-enriched-exercises` et `post-publish-sync`.
- Renforcer `sync-enriched-exercises` pour qu’elle échoue explicitement si :
  - le total final n’est pas 480,
  - ou si les champs enrichis obligatoires ne sont pas complets.
- Renforcer `post-publish-sync` pour qu’elle ne se limite plus au cas `count = 0`, mais qu’elle répare aussi :
  - un catalogue partiel,
  - un catalogue incomplet,
  - ou un catalogue désaligné.
- Exécuter la synchro live, puis recontrôler en base jusqu’à obtenir un état exhaustif.

2. Aligner réellement le shop live
- Peupler `subscription_plans` et `subscription_plan_prices` en production avec le catalogue canonique.
- Vérifier la cohérence entre :
  - `src/lib/plans.ts`,
  - les produits/prix Stripe utilisés par les fonctions,
  - et les tables live.
- Si nécessaire, faire évoluer l’UI/admin pour afficher la vérité backend au lieu d’un état partiellement codé en dur.
- Vérifier aussi que les packs IA live restent cohérents et persistants après première création des prix Stripe.

3. Valider la vraie économie IA en conditions réelles
- Utiliser un compte de vérification “owner only” non privilégié pour ne pas fausser les débits.
- Ne pas tester la monétisation avec le compte actuel tant qu’il garde ses rôles/overrides privilégiés, car il génère des consommations à 0 crédit.
- Vérifier en live :
  - abonnement propriétaire : checkout → retour → webhook → `stripe_customers` mis à jour,
  - achat de crédits IA : checkout → webhook → `credit_ai_wallet` → ligne `purchase` dans le ledger,
  - appel IA non privilégié : `debit_ai_credits` réel → baisse du wallet → ligne `consumption` négative.
- Vérifier que `billing_events` reçoit enfin les traces attendues.

4. Rendre l’admin fiable et non trompeur
- Mettre à jour `AdminDashboard` pour ne plus afficher un succès de sync si la vérification finale n’est pas strictement positive.
- Ajouter/renforcer un audit admin lisible sur les points bloquants live :
  - exercices < 480,
  - enrichissement incomplet,
  - catalogue abonnement vide,
  - absence de traces webhook,
  - absence de débit IA réel.
- Même principe pour `AdminAIEconomy` : afficher la réalité live, pas une impression de complétude.

5. Gate final “production prête”
Je ne m’arrêterai que lorsque tous ces points seront vrais en live :
- `exercises = 480`
- `exercise_categories = 25`
- 480 exercices avec :
  - `description`
  - `summary`
  - `short_instruction`
  - `objective`
  - `validation_protocol`
  - `tutorial_steps >= 4`
- `subscription_plans` rempli
- `subscription_plan_prices` rempli
- `ai_feature_catalog`, `ai_credit_packs`, `ai_pricing_config`, `ai_plan_quotas` cohérents
- au moins 1 abonnement live validé de bout en bout
- au moins 1 achat de crédits IA validé de bout en bout
- au moins 1 débit IA réel sur compte non privilégié
- `billing_events` alimenté correctement

Zones de code à traiter
- `supabase/functions/sync-enriched-exercises/index.ts`
- `supabase/functions/post-publish-sync/index.ts`
- `src/pages/AdminDashboard.tsx`
- `src/pages/AdminAIEconomy.tsx`
- `src/lib/plans.ts`
- éventuellement `src/pages/Subscription.tsx` si je dois brancher le shop sur le catalogue live au lieu du dur

Point technique clé à corriger
- Le pipeline actuel est trop fragile pour la prod : il faut un mode “self-healing” qui garantit la présence et la complétude du catalogue, pas juste un seed opportuniste.
- Tant que la production garde 0 exercice, 0 plan d’abonnement et 0 événement de facturation, je considère l’app comme non lançable.
