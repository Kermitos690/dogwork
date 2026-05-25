---
name: dogwork-ai-credits
description: Système de crédits IA DogWork — ledger canonique, déduction universelle, cooldown 30s, pricing par feature, packs rechargeables. À déclencher pour tout sujet chatbot, génération IA, crédit, quota, AI economy.
---

# DogWork — AI Credits

## Architecture canonique
- **Single source of truth**: table `ai_credit_ledger`
- ❌ Table `credit_purchase_orders` **n'existe pas** (memory `ai-credit-infrastructure-canonical`)
- Modification crédits = RPC SECURITY DEFINER uniquement (RLS bloque tout le reste)

## Déduction universelle
**Tous les rôles consomment des crédits**, y compris Admin et Educator (bypass supprimé, memory `ai-credit-universal-deduction`).

## Pricing par feature
| Feature | Coût |
|---|---|
| Chat message | 1 |
| Analysis | 3 |
| Plan generation | 5 |

Features génériques **désactivées**. Voir memory `ai-economy-feature-pricing`.

## Quotas mensuels & Packs (v5)
- Grants mensuels automatiques via cron `monthly-ai-credit-grant`
- 3 packs rechargeables autorisés: 80 / 150 / 500 crédits
- Coûts/marges stockés en DB, **cachés** côté user public (memory `ai-economy-financial-transparency`)

## Anti-spam
- **Cooldown UI 30s** + 429 API si abus
- AbortController obligatoire dans hooks chat (cf. `useChatCapture`)

## Architecture 3 couches
1. **Provider** (Lovable AI Gateway — model agnostic)
2. **Adapter** (normalize input/output)
3. **Business logic** (deduction, validation, scoring)

## Sortie JSON structurée
**Obligatoire** pour toute feature scoring/insertion DB (memory `structured-json-outputs`).

## Gating
AI tools gated **uniquement par balance crédits**, jamais par tier plan (memory `ai-access-gating-logic`).

## UI
- `/shop` — packs achetables (Stripe Customer Portal, polling)
- `RoleCreditsHub` — vue user par rôle
- `/admin/ai-economy` — dashboard KPI admin

## Edge function centrale
`ai-deduct-credits` (ou équivalent) — valide balance, deduct, log dans ledger, retourne 402 si insuffisant.
