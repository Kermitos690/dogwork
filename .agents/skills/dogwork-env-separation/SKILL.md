---
name: dogwork-env-separation
description: Règles de séparation stricte Test (Lovable preview, ref dcwbqsfeouvghcnvhrpj) vs Live (Prod, ref hdmmqwpypvhwohhhaqnf) sur DogWork. À déclencher dès qu'on parle de migration, SQL, edge function, Stripe, secret, webhook ou différence Preview/Production.
---

# DogWork — Séparation Test / Live

## Deux instances Supabase distinctes
- **Test (Preview Lovable)**: `dcwbqsfeouvghcnvhrpj` — utilisé par l'agent par défaut.
- **Live (Production www.dogwork-at-home.com)**: `hdmmqwpypvhwohhhaqnf` — totalement isolé.

## Ce que l'agent peut faire automatiquement
| Action | Test | Live |
|---|---|---|
| `supabase--migration` (DDL) | ✅ | ❌ |
| `supabase--insert` (DML) | ✅ | ❌ |
| `supabase--read_query` | ✅ (défaut) | ✅ (`environment: "production"`) |
| `supabase--edge_function_logs` | ✅ | ✅ (`environment: "production"`) |
| Déploiement edge functions | ✅ auto | ✅ via publish |

## Écriture sur LIVE — 2 options
1. **Manuel** (préféré, 0 attack surface): user colle SQL dans Cloud View → Database → Run SQL → switch Live.
2. **Edge function `admin-apply-live-sql`**: utilise Supabase Management API (`POST /v1/projects/{ref}/database/query`) avec `SUPABASE_MANAGEMENT_PAT`. Admin-only + audit `billing_events`.

## Domaine = environnement
- `isProduction = !isDevelopment` dans `src/lib/env.ts`. Tout outil interne (audit, diagnostic) doit être caché en prod via `isDevelopment`.
- Edge functions de redirection: si host = `www.dogwork-at-home.com` → Live, sinon Lovable preview.

## Sync post-publish
- Pipeline `post-publish-sync` heal le catalogue d'exercices (480+) sur prod après deploy Vite.
- Ne JAMAIS regénérer les exercices via AI sur Live (cf. memory `data-quality-enriched-only`).

## Secrets Stripe / VAPID / Resend
- Test secrets ≠ Live secrets. Toujours préfixer mentalement `LIVE_` vs `TEST_` quand pertinent.
- Webhook Stripe: toujours vérifier `'Listen to events on Connected accounts'` côté Stripe Dashboard pour Connect.

## Règle d'or
Avant toute action sensible: poser explicitement "Test ou Live ?" si non précisé.
