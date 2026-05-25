---
name: dogwork-roles-rls
description: Architecture rôles DogWork (owner/educator/shelter/shelter_employee/admin), RLS permissive, vues safe pour PII, has_role(). À déclencher pour tout sujet permission, policy, RLS, accès, sécurité table.
---

# DogWork — Rôles & RLS

## Rôles (enum `app_role`)
- `owner` (propriétaire chien)
- `educator` (coach pro)
- `shelter` (refuge)
- `shelter_employee` (employé refuge, vue limitée)
- `admin`

Stockés dans `public.user_roles` (jamais dans profiles). Vérification via `has_role(_user_id, _role)` SECURITY DEFINER.

## RLS permissive (architecture)
Policies utilisent `permissive` (pas `restrictive`) pour éviter les blocages cross-rôles (memory `rls-architecture-permissive`).

## Vues safe pour PII
- `shelter_animals_safe` — masque nom/email adoptant pour employés (memory `pii-protection-safe-views`)
- Toujours `WITH (security_invoker = on)` sur views publiques (memory `security-invoker-views`)
- Employés ne doivent **jamais** accéder aux tables brutes si une vue safe existe

## Hardening admin
- Login admin: route `/gate-k9x` (cachée, string normalization, memory `page-connexion-admin-cachee-hardened`)
- Tier enforcement: triggers DB + RPC, jamais client-side (memory `backend-enforcement-tiering-v2`)

## Cache session
React Query cache **fully cleared** on user change/logout (memory `session-cache-invalidation`).

## Pattern policy admin
```sql
create policy "Admins full access" on public.X
for all to authenticated
using (public.has_role(auth.uid(), 'admin'));
```

## Couches commerciales vs permissions
**Séparées**: les permissions rôle ≠ limites commerciales tier (memory `access-control-model`). Pro/Expert sont des tiers, pas des rôles.

## PIN employés refuge
- Hashed PIN vérifié **server-side uniquement**
- Vue masque `hashed_pin` (memory `shelter-employee-pin-hardening`)

## Création shelter
Auto-bundle des rôles `owner` + `shelter` pour autonomie (memory `shelter-creation-logic`).

## Suppression user
`delete-user` edge function cascade sur 40+ tables + auth.users (memory `gestion-donnees-absolute-crud`).
