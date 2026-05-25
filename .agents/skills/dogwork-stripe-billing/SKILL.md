---
name: dogwork-stripe-billing
description: Architecture Stripe DogWork — abonnements Pro/Expert, Stripe Connect Express éducateurs (15.8%), modules add-on, packs crédits IA, refunds. À déclencher pour tout sujet billing, checkout, webhook, subscription, Connect, refund.
---

# DogWork — Stripe & Billing

## Source de vérité
**Stripe = source absolue.** Toutes les features sont gated par des subscriptions actives via triggers DB + webhook async (5x retry).

## Produits & Prix (LIVE)
Voir memory `tech/stripe/active-price-ids-production` et `production-product-ids`.
- **Pro** (1 chien)
- **Expert** (illimité)
- **Educator**: 200 CHF/an, 15.8% commission, -30% si sponsorisé refuge
- **Packs crédits IA**: 80 / 150 / 500 crédits (3 tiers seuls autorisés)
- **Refuges**: pricing custom, onboarding manuel offline

## Stripe Connect Express (éducateurs)
- Destination Charges, commission 15.8%
- Webhook Connect **doit avoir** `'Listen to events on Connected accounts'` activé
- IDs Stripe coachs isolés dans table dédiée (cf. memory `coach-stripe-data-isolation`)

## Refund Policy
**92% remboursé, 8% conservé** (frais plateforme). Implémenté dans `admin-stripe-operations`.

## Modules add-on
Synced comme items sur la subscription principale via `subscribe-modules` edge function.

## Webhook Stripe — règles critiques
- Sync async dans `billing_events` (event_id UNIQUE, audit complet)
- Frontend retry 5x après checkout return
- Résolution user: paginer `auth.admin.listUsers()` pour matcher email (cf. memory `stripe-webhook-user-resolution`)
- Idempotence: vérifier `event.id` avant insert

## Permissions API key Stripe
Restricted API key doit avoir scopes write: subscriptions, customers, refunds, products, prices, checkout_sessions, connect (cf. memory `api-key-permissions`).

## Transparence landing
Prix + 15.8% commission **doivent être visibles** sur la landing page (cf. memory `transparence-tarifaire-landing`).

## Admin Stripe Hub
Page `/admin/stripe` — dashboard payments / refunds / Connect transfers. Refunds idempotents via Stripe API check (memory `admin-operations-robustness`).

## Overrides manuels
Table `subscription_overrides` permet d'attribuer un tier manuellement (ignore Stripe). Usage admin uniquement.
