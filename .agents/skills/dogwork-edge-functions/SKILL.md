---
name: dogwork-edge-functions
description: Standards edge functions DogWork — auth via getUser(jwt), CRON_SECRET pour cron, CORS, validation Zod, traçabilité billing_events. À déclencher à toute création/modif d'edge function Supabase.
---

# DogWork — Standards Edge Functions

## Auth utilisateur
**Toujours** `supabase.auth.getUser(jwt)` — jamais `getSession()` côté serveur (memory `edge-functions-final-standard`).

```ts
const authHeader = req.headers.get("Authorization");
if (!authHeader) return new Response("Unauthorized", { status: 401 });
const jwt = authHeader.replace("Bearer ", "");
const { data: { user }, error } = await supabaseAdmin.auth.getUser(jwt);
if (error || !user) return new Response("Unauthorized", { status: 401 });
```

## Tâches automatisées
Requièrent `CRON_SECRET` (header `x-cron-secret`) ou JWT admin. Jamais public.

## CORS
```ts
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
```
Inclure `corsHeaders` dans **toutes** les réponses (succès + erreur).

## Validation input
Zod systématique. Retour 400 avec `error.flatten().fieldErrors`.

## Secrets utilisés
- `LOVABLE_API_KEY` — Lovable AI Gateway (pas de clé externe nécessaire)
- `SUPABASE_SERVICE_ROLE_KEY` — admin DB
- `STRIPE_SECRET_KEY` (Live) / `STRIPE_TEST_SECRET_KEY`
- `CRON_SECRET` — protection cron
- `RESEND_API_KEY` — emails
- `SUPABASE_MANAGEMENT_PAT` — admin-apply-live-sql uniquement

## Traçabilité
Toute opération sensible (refund, admin SQL, push send) → insert dans `billing_events` avec `event_id` UNIQUE.

## Cross-env proxy
`admin-live-proxy` (à déployer si besoin) permet à preview admin d'écrire sur Live DB via service_role Live.

## Visibilité prod
Edge functions de diagnostic/admin → 403 si pas en development (memory `production-visibility-guard`).

## Redirections
Si redirection requise: cible `www.dogwork-at-home.com` SEULEMENT si host pure prod détecté, sinon retour Lovable preview (memory `environment-aware-redirects`).

## config.toml
- 1 seul fichier `supabase/config.toml`
- Pas modifier `project_id`
- `verify_jwt = false` par défaut (validation in-code obligatoire)
- Ajouter bloc par function seulement si override spécifique
