# Audit Phase 4 — Stripe Subscriptions + Connect (LIVE)

**Cible**: `hdmmqwpypvhwohhhaqnf` (LIVE) — lecture seule
**Date**: 2026-05-25
**Périmètre**: Plans, prix, abonnements, webhooks, Connect Express, payouts, cohérence DB ↔ Stripe

---

## 1. Catalogue plans (`subscription_plans`)

| code | name | max_dogs | base_exercise_limit | 28_day | active |
|---|---|---:|---:|:---:|:---:|
| starter | Freemium | 1 | 15 | ❌ | ✅ |
| pro | Pro | 3 | 150 | ✅ | ✅ |
| expert | Expert | ∞ | ∞ | ✅ | ✅ |
| educator | Éducateur | ∞ | ∞ | ✅ | ✅ |
| shelter | Refuge | ∞ | ∞ | ✅ | ✅ |

⚠️ **Écart mémoire vs DB** : `commercial-tier-structure-v4` indique **Pro = 1 chien**. La DB LIVE indique **Pro = 3 chiens**. À arbitrer (cf. P1 ci-dessous).

## 2. Prix Stripe (`subscription_plan_prices`)

| plan | période | CHF | stripe_price_id | stripe_product_id | public |
|---|---|---:|---|---|:---:|
| starter | monthly | 0.00 | — | — | ✅ |
| pro | monthly | 9.90 | `price_1TKpFyPshPrEibTgOW98FPOq` | `prod_U83i1wbeLdd3EI` | ✅ |
| expert | monthly | 19.90 | `price_1TKpNpPshPrEibTgDiRVEAmV` | `prod_U83inCbv8JMMgf` | ✅ |
| educator | yearly | 200.00 | `price_1T9wXlPshPrEibTgEM0BNrSm` | `prod_U8CxlV7PMpHAgA` | ✅ |
| shelter | custom | 0.00 | `price_1TEtxAPshPrEibTgsDFHr8Nw` | `prod_UDKcjmnJnM7pBo` | ❌ |

✅ Cohérent avec mémoire `active-price-ids-production` et `production-product-ids`.
✅ Landing affiche 9.90 / 19.90 / 200 — cohérent.
ℹ️ Validation directe via API Stripe LIVE non possible depuis le MCP (contexte Stripe différent du compte LIVE DogWork). À valider manuellement dans le dashboard Stripe LIVE.

## 3. Abonnements actifs (`stripe_customers`)

- 1 ligne : `subscription_status='none'`, `current_tier='starter'`
- ⚠️ **Aucun abonnement payant actif tracé** dans `stripe_customers` sur LIVE

Cela signifie soit :
- LIVE n'a encore jamais eu de checkout payant réussi (cohérent avec lifetime_purchased=0 sur tous les wallets — Phase 3)
- Soit le sync webhook n'a pas écrit dans `stripe_customers`

## 4. Overrides admin (`admin_subscriptions`)

| tier | actif | count |
|---|:---:|---:|
| expert | ✅ | 3 |
| shelter | ✅ | 1 |
| educator | ❌ | 2 |
| pro | ❌ | 1 |
| shelter | ❌ | 1 |

✅ 4 overrides actifs — explique pourquoi des comptes ont accès Expert/Shelter sans Stripe paid.
ℹ️ Source: `subscription-overrides-system` — comportement attendu.

## 5. Webhooks (`billing_events`)

✅ **0 ligne** sur LIVE.

Conclusion : aucun webhook Stripe LIVE n'a encore été reçu/persisté. Cohérent avec absence d'abonnements payants. **Le webhook n'a donc jamais été testé en conditions réelles sur LIVE.**

⚠️ **P1** : impossible de garantir la robustesse de `stripe-webhook` tant qu'un vrai paiement LIVE n'a pas circulé.

## 6. Alertes sync (`billing_sync_alerts`)

✅ 0 alerte non résolue.

## 7. Connect Express (`coach_stripe_data`)

| total | has_account | onboarded |
|---:|---:|---:|
| 1 | 1 | 1 |

✅ 1 coach connecté et onboardé. ⚠️ Aucune transaction réelle pour valider :
- Destination charges + application_fee 15.8%
- Webhook `Connect events` activé (cf. mémoire `connect-operational-config`)
- Refunds split 92/8

## 8. Edge functions Stripe déployées

| Fonction | Rôle |
|---|---|
| `create-checkout` | Subscription owner (pro/expert) |
| `create-educator-checkout` | Subscription éducateur |
| `create-course-checkout` | Achat formation (Connect destination charge) |
| `create-credits-checkout` | Achat pack crédits IA |
| `check-subscription` | Reconciliation Stripe ↔ DB |
| `customer-portal` | Portail self-service Stripe |
| `stripe-webhook` | Webhook plateforme (subscriptions + credits) |
| `stripe-course-webhook` | Webhook Connect (formations) |
| `connect-onboard` | Onboarding Express |
| `connect-status` | Statut compte connecté |
| `connect-dashboard` | Lien dashboard Express |
| `admin-stripe` | Hub admin (refunds, transfers) |
| `admin-verify-stripe-catalog` | Vérif catalogue Stripe vs DB |
| `reconcile-credits-checkout` | Reconciliation polling crédits |
| `simulate-webhook-provision` | Test webhook (dev) |
| `verify-stripe-key` | Healthcheck clé API |

✅ Couverture complète. Toutes les fonctions critiques existent côté code.

## 9. RPCs côté DB

- `get_user_tier()`, `tier_meets_minimum()`, `enforce_*_tier()` — gating backend ✅
- `provision_modules_for_tier()` + trigger `trg_provision_modules_on_tier_change` ✅

✅ Architecture de gating tier serveur en place (cf. `backend-enforcement-tiering-v2`).

---

## Synthèse Phase 4

### ✅ Sain
- Catalogue plans et prix complets, cohérents UI ↔ DB
- Edge functions Stripe complètes (16 fonctions)
- Gating tier serveur via triggers + RPC
- Aucune alerte sync ouverte
- Overrides admin opérationnels

### ⚠️ Points d'attention

| ID | Sévérité | Sujet | Détail |
|---|:---:|---|---|
| P1-4A | 🟡 P1 | Pro max_dogs | DB=3, mémoire=1. Aligner mémoire ou DB. |
| P1-4B | 🟡 P1 | Webhook LIVE jamais testé | 0 event en base, 0 abonnement payant. Premier vrai paiement = test à risque. |
| P1-4C | 🟡 P1 | Connect LIVE jamais testé | 1 coach onboardé, 0 transaction. Split fee 92/8 non éprouvé. |
| P2-4D | 🟢 P2 | Pas de validation MCP des price IDs LIVE | Validation manuelle requise dans dashboard Stripe LIVE. |
| P2-4E | 🟢 P2 | `stripe_customers` quasi vide | À surveiller après premier checkout réel. |

### 🚦 Verdict

🟡 **GO TECHNIQUEMENT, mais "DRY-RUN OBLIGATOIRE" avant ouverture publique** :
1. Faire **1 vrai paiement Pro mensuel** (un compte interne) → vérifier `stripe_customers` + `billing_events` + tier appliqué
2. Faire **1 vrai achat formation via Connect** → vérifier split 92/8 + payout coach
3. Faire **1 vrai refund** via `admin-stripe` → vérifier RPC et trace `billing_events`
4. Confirmer dans dashboard Stripe LIVE : webhook plateforme + webhook Connect activés sur les bons endpoints

Sans ces 3 dry-runs, on n'a aucune garantie réelle que la chaîne fonctionne en LIVE.

---

## Questions à arbitrer

1. **Pro = 1 ou 3 chiens ?** Trancher pour aligner DB ↔ mémoire ↔ landing.
2. **Veux-tu organiser les 3 dry-runs LIVE maintenant** (je peux préparer une checklist détaillée avec comptes internes à utiliser) ?
3. **Passage Phase 5** (realtime, PWA, edge logs, observabilité) ou on traite d'abord les P1 ci-dessus ?
