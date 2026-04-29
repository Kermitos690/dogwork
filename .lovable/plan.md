
# Refonte cohérente de la logique métier DogWork

## Constat (audit Live)

L'app souffre de **3 systèmes parallèles non alignés** :

1. **`subscription_plans`** — Starter / Pro / Expert / Educator / Shelter (✅ existe, prix corrects côté Stripe)
2. **`modules`** — 15 add-ons mais **tous en `pricing_type='included'` à 0 CHF** en prod (mes derniers updates n'ont pas persisté car les colonnes `is_addon`/prix ont été remises à 0 par un trigger ou par re-publication)
3. **`ai_feature_catalog`** — 13 features, prix DB corrects (1 à 15 crédits), mais l'UI affiche **"0 crédit" partout** car les codes UI (`ai_plan_generation`, `agent_*`) ne sont pas mappés correctement à la vue publique

**Symptômes visibles utilisateur** (captures Outils IA) :
- Tous les générateurs affichent "0 crédit"
- Tous les agents IA affichent "0 crédit"
- Les modules add-ons sont gratuits
- Aucune cohérence offre / délivrance

## Doctrine cible (modèle unifié)

```text
                ┌──────────────────────────────────────┐
                │  ABONNEMENT (subscription_plans)     │
                │  → définit max_dogs + crédits/mois   │
                │  → ouvre l'accès aux MODULES inclus  │
                └──────────────────────────────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
      ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐
      │   MODULES    │   │   CRÉDITS    │   │  PACKS CRÉDITS   │
      │  (features   │   │  IA mensuels │   │   (recharge      │
      │   produit)   │   │  (inclus)    │   │    Stripe)       │
      └──────────────┘   └──────────────┘   └──────────────────┘
              │                   │
              ▼                   ▼
      ┌──────────────┐   ┌──────────────────────────────┐
      │   ADD-ONS    │   │  AI_FEATURE_CATALOG          │
      │ (modules     │   │  → coût en crédits par usage │
      │  payants     │   │  → débité à chaque appel     │
      │  optionnels) │   └──────────────────────────────┘
      └──────────────┘
```

**Règles claires** :
- 1 abonnement = X chiens autorisés + Y crédits IA/mois + N modules inclus
- Modules **inclus** = activés automatiquement selon le plan, prix 0
- Modules **add-ons** = optionnels, prix mensuel/annuel CHF, ajoutés via `subscribe-modules`
- Features IA = consomment des crédits du wallet, jamais "gratuites"
- Recharge crédits = packs Stripe one-shot

## Plan d'exécution

### 1. Nettoyer & figer le mapping AI features ↔ UI

**Problème** : les alias UI (`ai_plan_generation`, `agent_behavior_analysis`, etc.) ne reçoivent pas leur coût car `expandAIFeaturesWithAliases` est appliqué, mais les codes canoniques sont parfois absents de la vue publique.

- Vérifier que **tous** les codes canoniques utilisés par UI/agents (`plan_generator`, `behavior_analysis`, `dog_profile_analysis`, `adoption_plan`, `behavior_summary`, `chat`) sont `is_active=true` dans `ai_feature_catalog` avec un coût > 0
- Réactiver `plan_generator` (actuellement `is_active=false`) avec coût 5 crédits
- S'assurer que la vue `ai_feature_catalog_public` expose bien ces lignes
- Forcer côté frontend un fallback : si `getCost(code) === 0`, utiliser une table de coûts par défaut hardcodée (sécurité produit)

### 2. Réinitialiser proprement les modules (migration définitive)

Migration SQL qui :
- Force le tarif des **5 add-ons payants** : `behavior_stats` 3.90, `branding` 4.90, `adoption_followup` 5.90, `planning` 6.90, `team_permissions` 7.90 + `pricing_type='addon'` + `is_addon=true`
- Garantit que les **10 modules core** restent `pricing_type='included'`, `is_addon=false`, prix 0
- Supprime tout trigger/process qui re-remettait les prix à 0 (audit `pg_trigger` sur `modules`)

### 3. Aligner abonnements ↔ modules inclus

Créer une vraie table de mapping `plan_included_modules (plan_code, module_slug)` au lieu d'une logique éparpillée :
- starter → ai_chatbot, animal_management, exercise_library, progress_journal
- pro → + ai_plans, messaging, pdf_exports
- expert → tous les modules owner
- educator → + educator_crm, payments_marketplace, branding
- shelter → + shelter_management, adoption_followup

Mettre à jour `useFeatureGate` / `useModules` pour lire ce mapping.

### 4. Refondre l'UI Outils IA (lisibilité métier)

- Afficher le coût réel (jamais 0) sur chaque carte
- Si `wallet.balance < cost` → bouton "Recharger" plutôt que "Lancer maintenant" grisé
- Section "Agents autonomes" : libellés humains au lieu de `agent_behavior_analysis` brut → "Agent · Analyse comportementale"
- Badge "Inclus dans ton plan" / "Add-on actif" / "Add-on disponible" sur chaque module

### 5. Refondre l'UI Modules

- Trier : Inclus (ton plan) → Add-ons actifs → Add-ons disponibles
- Afficher le prix CHF/mois et CHF/an
- CTA clair : "Activer 4.90 CHF/mois" via `subscribe-modules`

### 6. Audit refuge SVPA (gtbi1)

- Vérifier que le compte admin du refuge a bien les rôles `owner` + `shelter` + `shelter_admin`
- Vérifier l'accès aux pages Employés / Coachs / Bénévoles
- Corriger toute RLS qui bloque le admin shelter sur ses propres ressources

### 7. Publication production

- Tous les fixes appliqués via migration + redéploiement
- Vérification post-deploy via `read_query` que :
  - `modules` add-ons ont leur prix
  - `ai_feature_catalog_public` retourne tous les codes attendus avec coût > 0
  - L'UI Outils affiche les bons coûts

## Détails techniques

**Fichiers à modifier** :
- `supabase/migrations/<new>.sql` — figer prix modules, réactiver `plan_generator`, créer `plan_included_modules`, audit triggers
- `src/lib/aiFeatureCatalog.ts` — ajouter table de coûts par défaut (sécurité)
- `src/hooks/useAICredits.tsx` — fusionner public view + table fallback en une seule query robuste
- `src/pages/Outils.tsx` — utiliser coût garanti, libellés humains agents, CTA recharge
- `src/pages/Modules.tsx` — tri + affichage prix
- `src/hooks/useModules.tsx` / `useFeatureGate.tsx` — lecture mapping plan↔modules
- `src/pages/ShelterDashboard.tsx` + RLS — accès admin refuge à employés/coachs

**Aucune table existante n'est supprimée** — seulement nettoyage des données et ajout d'une table de mapping.

**Cohérence Stripe** : les Price IDs add-ons existent déjà (mémoire `modules-addon-system`), pas de nouvelle création Stripe nécessaire.

## Résultat attendu

Après exécution, un utilisateur voit :
- Outils IA avec **coûts réels** (1, 5, 8, 13, 15 crédits)
- Modules avec **prix réels** et statut clair (inclus/actif/disponible)
- Refuge SVPA avec **accès complet** à la gestion d'équipe
- Une logique unique, lisible et cohérente entre UI, DB et Stripe
