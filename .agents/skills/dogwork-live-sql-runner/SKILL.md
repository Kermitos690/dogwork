---
name: dogwork-live-sql-runner
description: Procédure pour exécuter du SQL DDL/DML sur la base LIVE DogWork (ref hdmmqwpypvhwohhhaqnf). À déclencher dès que l'utilisateur demande une migration, fix, cron, RLS ou seed sur Live/Prod.
---

# DogWork — Exécution SQL sur LIVE

L'agent **ne peut pas** écrire sur Live via `supabase--migration` / `supabase--insert`. Deux chemins.

## Option 1 — Manuel (préféré)
1. Préparer le script dans `.lovable/<nom>.sql` (UTF-8, idempotent, transactionnel si possible).
2. Demander à l'utilisateur de:
   - Ouvrir Cloud View → Database → Run SQL
   - Toggle environnement **Live**
   - Coller et exécuter
3. Vérifier ensuite via `supabase--read_query` avec `environment: "production"`.

## Option 2 — Edge function `admin-apply-live-sql`
Prérequis: secret `SUPABASE_MANAGEMENT_PAT` (Personal Access Token Supabase, scope project full).

Architecture:
- Function: `supabase/functions/admin-apply-live-sql/index.ts`
- Auth: `supabase.auth.getUser(jwt)` + check `user_roles.role = 'admin'`
- Body: `{ sql: string, dryRun?: boolean }`
- Appel: `POST https://api.supabase.com/v1/projects/hdmmqwpypvhwohhhaqnf/database/query` avec `Bearer ${MGMT_PAT}` et body `{ query: sql }`
- Audit: insert dans `billing_events` (event_type='admin.live_sql', metadata: hash sql + user_id + result)
- Rate limit: max 10/h par admin
- UI: `/admin/sql-live-runner` (textarea + boutons Dry-run / Exécuter)

## Préparation des scripts SQL Live
- Toujours `BEGIN; ... COMMIT;` sauf si DDL non-transactionnel (CREATE INDEX CONCURRENTLY, ALTER TYPE ADD VALUE).
- Toujours `IF NOT EXISTS` sur CREATE, `IF EXISTS` sur DROP.
- Ne JAMAIS toucher schémas réservés: `auth`, `storage`, `realtime`, `supabase_functions`, `vault`.
- Pour CHECK temporels (`expire_at > now()`) → trigger de validation, pas CHECK constraint (cf. memory).

## Vérification post-exécution
```ts
// Toujours en mode production
supabase--read_query({ query: "SELECT ...", environment: "production" })
```

## Cas types
- **Realtime publication**: `ALTER PUBLICATION supabase_realtime ADD TABLE public.X;`
- **Cron**: passer par `cron.schedule(...)` + fonctions wrapper SECURITY DEFINER.
- **Settings internes**: upsert dans `app_internal_settings` (jamais en clair côté client).
