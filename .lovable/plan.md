
Objectif: débloquer la publication Live, fiabiliser définitivement le système de crédits IA, finaliser le cron mensuel, puis corriger les pages les plus exposées aux bugs autour de la monétisation et des redirections.

1. Corriger le vrai bloqueur de publication Live
- Le blocage actuel vient de la migration `20260423000836_c32ffad8-2469-4330-8dd2-d1a05f53b4d1.sql`.
- Cette migration exécute un `DELETE FROM public.ai_credit_wallets WHERE user_id NOT IN (SELECT id FROM auth.users);` avant d’ajouter la FK `ai_credit_wallets_user_fk`.
- En Live, il existe encore 2 wallets orphelins et 19 lignes de ledger liées, ce qui casse l’application de la contrainte et fait échouer le publish.
- Travail prévu:
  - remplacer cette stratégie fragile par une migration de nettoyage robuste, ordonnée et idempotente:
    - suppression d’abord des lignes `public.ai_credit_ledger` liées aux wallets orphelins
    - suppression ensuite des lignes `public.ai_credit_wallets` orphelines
    - ajout enfin de la FK `ai_credit_wallets_user_fk ON DELETE CASCADE`
  - sécuriser la migration pour qu’elle passe même si des données orphelines existent déjà en Live
  - conserver le reste des FK de la migration après nettoyage correct

2. Durcir l’infrastructure SQL du wallet IA
Rôle des objets concernés:
- `public.ensure_ai_wallet(_user_id)`: crée ou retrouve le wallet d’un utilisateur
- `public.credit_ai_wallet(...)`: crédite le wallet et écrit le ledger
- `public.debit_ai_credits(...)`: débite le wallet et écrit le ledger
- `public.get_my_credit_balance()`: lecture sécurisée du solde courant
- `public.ai_credit_wallets`: solde courant
- `public.ai_credit_ledger`: historique comptable

Travail prévu:
- ajouter une migration de durcissement qui garantit l’intégrité dans le bon ordre:
  - nettoyage des lignes ledger pointant vers un wallet inexistant
  - nettoyage des wallets dont le `user_id` n’existe plus
  - création/recréation explicite des FK manquantes si nécessaire
  - index utiles pour la lecture du ledger mensuel et l’idempotence du cron
- vérifier que `ensure_ai_wallet`, `credit_ai_wallet` et `debit_ai_credits` restent compatibles avec la FK vers `auth.users`
- éviter toute logique qui recrée implicitement un wallet pour un utilisateur supprimé

3. Finaliser le cron mensuel de crédits
Éléments déjà présents:
- la fonction backend `monthly-credit-grant` existe
- la table `public.cron_run_logs` existe en Test via la migration `20260423152111_42f1e186-6a79-49a3-bea5-7440fe5804b8.sql`
- en Live, `public.cron_run_logs` est absente
- `pg_cron` et `pg_net` sont déjà actifs en Live
- aucun job `monthly-credit-grant-daily` n’existe en Live

Travail prévu:
- vérifier et, si nécessaire, compléter la migration `cron_run_logs`
- durcir la fonction `monthly-credit-grant` pour qu’elle reste tolérante si l’écriture du log d’exécution échoue
- préparer l’appel cron idempotent quotidien
- après déblocage de la publication, déployer la fonction et tester:
  - appel manuel via JWT admin
  - idempotence par `metadata.period_key`
  - écriture correcte dans `cron_run_logs`

4. Corriger les pages front liées aux crédits et aux redirections
Zones identifiées à sécuriser:
- `src/hooks/useAICredits.tsx`
  - rôle: source canonique côté front pour le solde, le ledger, les packs, les features et les achats
  - travail: renforcer les fallbacks, les erreurs explicites et la cohérence des invalidations React Query
- `src/hooks/useCreditConfirmation.tsx`
  - rôle: orchestration de la confirmation avant déduction
  - travail: éviter tout état incohérent si les features ne sont pas encore chargées ou si le coût vaut 0 par erreur
- `src/components/CreditConfirmDialog.tsx`
  - rôle: modal de confirmation avant dépense
  - travail: sécuriser l’affichage des soldes, les cas insuffisants et les transitions vers `/shop`
- `src/pages/Shop.tsx`
  - rôle: hub commercial des crédits
  - travail: fiabiliser la réconciliation post-checkout, les états de chargement, et les cas sans session
- `src/pages/Subscription.tsx`
  - rôle: gestion des plans et portail client
  - travail: sécuriser les retours Stripe, la gestion du portail et les états d’erreur
- `src/pages/Outils.tsx`
  - rôle: exécution des agents IA payants
  - travail: garantir que le coût affiché, la confirmation et l’exécution restent cohérents même si le catalogue de features tarde à charger
- `src/pages/ShelterAdoptionPlans.tsx`
  - rôle: génération IA de plans post-adoption
  - travail: vérifier le flux confirmation -> génération -> sauvegarde pour éviter les états bloqués
- `src/components/AIChatBot.tsx`
  - rôle: consommation IA conversationnelle
  - travail: fiabiliser les cas “crédits insuffisants”, cooldown et navigation vers le Shop

5. Vérifier le routage et les pages de destination
- contrôler que les routes utilisées par les CTA existent bien et répondent correctement:
  - `/shop`
  - `/subscription`
  - `/outils`
  - `/documents`
  - `/shelter/adoption-plans`
- ajouter, si nécessaire, des garde-fous pour éviter les redirections vers une page protégée sans session valide
- vérifier que les layouts rôle-specific n’envoient pas l’utilisateur vers une route incompatible avec son rôle

6. Validation complète après implémentation
Backend:
- rejouer les migrations en Test
- vérifier la création de `cron_run_logs`
- déployer et tester `monthly-credit-grant`
- confirmer qu’aucun wallet orphelin ne bloque plus la chaîne de publication
Frontend:
- test de navigation vers Shop / Subscription / Outils
- test d’ouverture des modales de confirmation
- test du parcours crédits insuffisants
- test du retour après achat
- test du flux agent IA et chatbot
- correction des erreurs console éventuelles si elles apparaissent

7. Étapes manuelles réellement impossibles à automatiser
- le nettoyage des données déjà présentes en Live reste manuel tant que l’environnement courant ne permet pas l’écriture directe sur Live
- la création effective du job `monthly-credit-grant-daily` sur Live reste manuelle tant que l’écriture Live n’est pas disponible
- une fois les corrections de code et migrations prêtes côté projet, les seules actions manuelles restantes seront:
  - exécuter le SQL de nettoyage Live
  - republier
  - exécuter le SQL de planification cron Live

Détails techniques
```text
Cause racine confirmée
- Live:
  - 2 wallets orphelins
  - 118 crédits orphelins
  - 19 lignes ledger associées
  - pas de table public.cron_run_logs
  - pas de job cron monthly-credit-grant-daily
- Test:
  - mêmes orphelins détectés côté données
  - migration cron_run_logs déjà présente dans le code
```

```text
Fichiers à modifier en priorité
- supabase/migrations/20260423000836_c32ffad8-2469-4330-8dd2-d1a05f53b4d1.sql
- supabase/migrations/20260423152111_42f1e186-6a79-49a3-bea5-7440fe5804b8.sql
- supabase/functions/monthly-credit-grant/index.ts
- src/hooks/useAICredits.tsx
- src/hooks/useCreditConfirmation.tsx
- src/components/CreditConfirmDialog.tsx
- src/pages/Shop.tsx
- src/pages/Subscription.tsx
- src/pages/Outils.tsx
- src/pages/ShelterAdoptionPlans.tsx
- src/components/AIChatBot.tsx
```
