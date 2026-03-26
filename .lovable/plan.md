

# Plan: Reset PIN employé + Audit complet

## 1. Reset PIN employé refuge

**Objectif**: Ajouter un bouton "Réinitialiser PIN" sur chaque carte employé dans `ShelterEmployees.tsx`.

**Implémentation**:

- **Edge function `create-shelter-employee/index.ts`**: Ajouter un mode `action: "reset-pin"` qui accepte `{ action: "reset-pin", employee_id, email }`. Le mode génère un nouveau PIN à 6 chiffres, met à jour le mot de passe Auth via `admin.updateUser`, met à jour `pin_code` dans `shelter_employees`, et renvoie le PIN par email.

- **Frontend `ShelterEmployees.tsx`**: Ajouter un bouton `KeyRound` (icone clé) sur chaque carte employé qui a un `auth_user_id`. Au clic, appel de la edge function avec `action: "reset-pin"`. Toast de confirmation avec le nouveau PIN.

**Fichiers modifiés**: 
- `supabase/functions/create-shelter-employee/index.ts`
- `src/pages/ShelterEmployees.tsx`

---

## 2. Audit complet — Constats et plan d'action

### A. Problèmes identifiés

| # | Problème | Sévérité | Statut actuel |
|---|----------|----------|---------------|
| 1 | **503 sandbox error** | Bloquant | Infrastructure transitoire, pas un bug code |
| 2 | **Plans Pro/Expert non branchés** | Majeur | 15 templates Free, 0 Pro, frontend non filtré par tier |
| 3 | **Messagerie inter-comptes cassée** | Majeur | Task `more_work_needed` |
| 4 | **Stripe Connect dashboard admin** | Moyen | Task `todo` |
| 5 | **Employees edge function: role dupliqué** | Mineur | Si employé re-créé, double insert `user_roles` possible (unique constraint) |
| 6 | **`listUsers()` sans pagination** | Perf | Charge TOUS les users pour trouver un email — ne scale pas |
| 7 | **`pin_code` stocké en clair** | Sécurité | PIN visible dans `shelter_employees` table |
| 8 | **Shelter employee ne peut pas UPDATE animals** | Fonctionnel | RLS manque UPDATE/DELETE pour employés sur `shelter_animals` |
| 9 | **Shelter employee observations INSERT author_id** | Fonctionnel | Policy exige `auth.uid() = author_id` mais `author_id` pourrait être le shelter_user_id |
| 10 | **coach_profiles expose encore `stripe_account_id`** | Sécurité | Policy SELECT corrigée mais la colonne reste accessible aux clients liés |

### B. Plan d'action par priorité

**Lot 1 — Immédiat (cette session)**
- Reset PIN employé (décrit ci-dessus)

**Lot 2 — Fonctionnel critique**
- Fixer la messagerie inter-comptes (déjà tracké)
- Ajouter RLS UPDATE sur `shelter_animals` pour les employés refuge
- Corriger `create-shelter-employee` : utiliser `upsert` sur `user_roles` au lieu d'`insert` pour éviter les doublons
- Remplacer `listUsers()` par `listUsers({ filter: email })` ou lookup par email

**Lot 3 — Templates et abonnements**
- Générer les 50 templates Pro en base (task existante `60a0fdac`)
- Brancher le frontend Plan.tsx sur `template_tier` + subscription tier
- Implémenter le plan Expert IA (task `516e168f`)

**Lot 4 — Sécurité**
- Hasher le `pin_code` en base (ou ne pas le stocker)
- Créer une vue restreinte `coach_profiles` sans `stripe_account_id` pour les clients
- Stripe Connect dashboard admin (task `7efdedc3`)

**Lot 5 — UX/Polish**
- Confirmation dialog avant suppression employé
- Page de connexion employé dédiée avec champ PIN
- Logs d'activité quand un employé fait une action

### C. Fichiers concernés par l'ensemble

```text
supabase/functions/create-shelter-employee/index.ts  — reset PIN + fix upsert role
src/pages/ShelterEmployees.tsx                       — bouton reset PIN
src/pages/Plan.tsx                                   — filtrage par tier
src/pages/Messages.tsx                               — fix messagerie
src/pages/ShelterMessages.tsx                        — fix messagerie
+ migrations SQL pour RLS employés UPDATE animals
```

Souhaitez-vous que je commence par le reset PIN, puis que j'enchaîne sur les lots suivants dans l'ordre ?

