# Audit Phase 3 — AI · Crédits · Boosts (LIVE, lecture seule)

Environnement: LIVE `hdmmqwpypvhwohhhaqnf` — Date: 2026-05-20

## 1. Catalogue IA (`ai_feature_catalog`)

### ✅ Features actives (cohérentes avec frontend)
| Code | Coût LIVE | Fallback front (`AI_FEATURE_FALLBACK_COSTS`) | État |
|---|---|---|---|
| chat / chat_general | 1 | 1 | ✅ |
| behavior_summary | 5 | 5 | ✅ |
| education_plan | 8 | 8 | ✅ |
| behavior_analysis | 13 | 13 | ✅ |
| dog_profile_analysis | 13 | 13 | ✅ |
| adoption_plan | 15 | 15 | ✅ |

### 🔴 P0 — Incohérence critique: `plan_generator`
- LIVE: `credits_cost=2`, `is_active=false`
- Frontend fallback: `5`
- Conséquence: la génération de plans IA est **désactivée côté DB**. `consume_my_credits('plan_generator')` lèvera `Fonctionnalité IA inconnue ou inactive`. Tous les appels passent uniquement parce que `debit_ai_credits` accepte `_credits` explicite — mais aucune protection catalogue.
- **Action**: `UPDATE ai_feature_catalog SET credits_cost=5, is_active=true WHERE code='plan_generator';`

### 🟡 P2 — Features inactives orphelines (front fallback existe)
`connection_guide(2)`, `content_rewrite(1)`, `exercise_enrich(2)`, `marketing_content(2)`, `record_enrichment(2)`. Aucune route active dans l'app actuelle — OK de les laisser `is_active=false`, mais alignement front recommandé.

## 2. Pricing config (`ai_pricing_config`)

| Clé | Valeur LIVE |
|---|---|
| credit_value_chf | 0.05 |
| chf_per_credit | 0.05 (doublon redondant — harmless) |
| welcome_bonus_credits | 100 |
| margin_standard / aggressive / prudent | 50 / 100 / 40 |
| usd_to_chf | 0.88 |
| safety_buffer | 30 |

🟡 P3 — Doublon `credit_value_chf` vs `chf_per_credit` (la fonction `debit_ai_credits` gère les 2). Optionnel: nettoyer `chf_per_credit`.

## 3. Wallets (`ai_credit_wallets`)

- 9 wallets, **1 utilisateur sans wallet** (`pablo.haenggi@gmail.com`, id `6e614dc4-…`)
- Balance totale: **2 003 279 crédits** — anomalie d'apparence due aux ajustements admin de test:
  - `dc9435b3-…` : +1 000 000 ("Crédits offerts")
  - `46478b2b-…` : +1 000 000 + 250 + 25 - 870 - 100
- Lifetime purchased = 0 sur tous les wallets → **aucun achat Stripe réel encore intervenu**

### 🟡 P1 — Hygiène données LIVE
2 wallets gonflés à 1M+ par ajustements admin de test/cadeau. Acceptable si comptes internes; à **nettoyer avant ouverture publique** (`UPDATE … SET balance = 1000` ou refund négatif tracé).

### 🔴 P0 — Wallet manquant à backfiller (déjà identifié Phase 2)
```sql
SELECT public.ensure_ai_wallet('6e614dc4-6469-4ef9-9cf5-92cc413ba6b3');
```

## 4. Ledger (`ai_credit_ledger`)

- 355 entries, dernière consommation: 2026-05-18
- Répartition: 280 consumption · 54 refund · 12 admin_adjustment · 9 bonus
- 353 success / 2 failed_insufficient (0 sur 30 derniers jours)
- ✅ Système de débit et refund fonctionne en pratique

## 5. Boosts profils publics (`public_profile_boosts`)

- 0 boost vendu, 0 actif → fonctionnalité câblée mais **jamais utilisée en production**
- RPC `purchase_public_boost` opérationnelle (délègue à `debit_dogwork_credits`)
- ✅ Aucun bug observable, mais **non testée en condition réelle** → recommander un smoke-test interne

## 6. Packs Stripe (`ai_credit_packs`)

| Slug | Crédits | Prix CHF | Stripe Price ID |
|---|---|---|---|
| decouverte | 80 | 4.90 | price_1TL0fHPshPrEibTg37iPRFlP |
| standard | 150 | 6.90 | price_1TL0fZPshPrEibTgkFKNzfEh |
| premium | 500 | 19.90 | price_1TL0fuPshPrEibTgpWNjNblG |

⚠️ Mémoire `ai-credits-price-ids-production` annonce packs **50/150/500** → ici c'est **80/150/500**. Vérifier alignement avec landing/Pricing.

### 🟡 P1 — Mémoire vs DB
Soit la mémoire est obsolète (pack 50 → 80), soit la DB a dérivé. À trancher avec l'utilisateur.

## 7. Orders / Purchases

- ❌ Table `credit_purchase_orders` **n'existe pas** sur LIVE (la mémoire `ai-credit-infrastructure-canonical` indique pourtant qu'elle est la source de vérité business)
- Seules les vues `v_credit_orders_admin`, `v_credit_orders_daily`, `v_my_credit_orders` existent → elles s'appuient probablement sur `ai_credit_ledger` (operation_type='purchase')
- **Lifetime purchased = 0 partout** → aucun achat Stripe n'a jamais été déclenché en LIVE

### 🟡 P1 — Documentation mémoire à corriger ou table à créer
À clarifier:
- Si la mémoire est obsolète → mettre à jour `mem://tech/database/ai-credit-infrastructure-canonical`
- Sinon → créer la table + migration de réconciliation depuis le ledger

## 8. Verdict Phase 3

🟡 **GO CONDITIONNEL**

### P0 (bloquants avant ouverture publique)
1. Réactiver `plan_generator` dans `ai_feature_catalog` (is_active=true, cost=5)
2. Backfill wallet pour `pablo.haenggi@gmail.com`

### P1 (à traiter avant marketing)
3. Aligner packs landing/Pricing avec DB (80 ou 50 crédits ?)
4. Clarifier `credit_purchase_orders` (mémoire vs réalité DB)
5. Reset hygiène wallets test (2 wallets à 1M+ crédits)

### P2/P3 (cosmétique)
6. Nettoyer doublon pricing config `chf_per_credit`
7. Smoke-test du flow boost (jamais exécuté en LIVE)

### ✅ Points forts
- Débit/refund/bonus fonctionnent en pratique (353/355 success)
- Stripe packs configurés avec product+price IDs valides
- Welcome bonus 100 crédits actif et appliqué via `ensure_ai_wallet`
- Aucun échec `failed_insufficient` sur 30j → UX correcte
