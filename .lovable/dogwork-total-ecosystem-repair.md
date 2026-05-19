# DogWork — Audit Auth + RBAC + Signup + Onboarding (Phase 2 + 2B)

**Date :** 2026-05-19  
**Périmètre :** LIVE (`hdmmqwpypvhwohhhaqnf`) — lecture seule.  
**Aucune migration, aucun deploy, aucune écriture.** Toutes les actions listées sont marquées `MANUAL REQUIRED`.

---

## 1. État réel mesuré sur LIVE

### 1.1 Triggers auth
| Élément | État |
|---|---|
| Trigger `on_auth_user_created` sur `auth.users` | ✅ Présent, actif (`AFTER INSERT`, exécute `handle_new_user()`) |
| Welcome email trigger (`send_welcome_email_on_confirm`) | ⚠️ Fonction existe en DB, **non attachée** à `auth.users` (pas dans `pg_trigger`) — l'email de bienvenue dépend uniquement de l'appel best-effort fait dans `useAuth.signUp()` côté client |

### 1.2 Intégrité des comptes
| Métrique | Valeur |
|---|---|
| Total `auth.users` | 7 |
| Non confirmés | 0 |
| Sans `profiles` | **0** |
| Sans `user_roles` | **0** |
| Sans `ai_credit_wallets` | **1** — `pablo.haenggi@gmail.com` (créé 2026-05-18) |
| Profils dupliqués | 0 |
| Lignes de rôle dupliquées | 0 |

### 1.3 Répartition des rôles
```
owner=6  shelter=3  shelter_employee=4  educator=2  admin=2
```
Cumuls observés (légitimes pour comptes admin de test) :
- 2 utilisateurs avec `{admin, educator, owner, shelter, shelter_employee}`
- 1 utilisateur avec `{owner, shelter, shelter_employee}`

### 1.4 Fonction `handle_new_user`
Crée bien : `profiles`, `user_roles='owner'`, `adopter_links` (matching email), `adoption_plans` (rattachement adoptant). Idempotent (`ON CONFLICT DO NOTHING`, `IF NOT EXISTS`).  
**Ne crée pas** le wallet `ai_credit_wallets` — c'est `ensure_ai_wallet` qui le crée à la 1re lecture/débit.

---

## 2. Fixed (constats positifs, rien à faire)

- ✅ Source unique de rôle = table `user_roles` côté DB. Tous les guards (`AdminGuard`, `CoachGuard`, `ShelterGuard`, `EmployeeGuard`) interrogent la DB via RPC `is_admin` ou `useUserRoles` (qui lit `user_roles`). Pas de logique de rôle frontend-only.
- ✅ Hook `useAuth` : `onAuthStateChange` configuré avant `getSession()`, gère `PASSWORD_RECOVERY`, purge React-Query au changement d'utilisateur, tag Sentry. Aucune session ghost détectée.
- ✅ Redirects par rôle dans `App.tsx` cohérents avec la doctrine :
  - `shelter_employee` (sans shelter/admin) → set de routes `/employee/*` isolé, fallback `/employee`
  - `shelter` (sans admin) → set shelter + routes owner partagées, fallback `/shelter`
  - `admin` à `/` → redirige `/admin` (sauf `?as=owner`)
  - `coach && !hasDogs` à `/` → redirige `/coach`
  - non-connecté → `/landing` (sauf flow recovery)
- ✅ Force password change branché correctement (`user_metadata.must_change_password === true` → `<ForcePasswordChange />`).
- ✅ Recovery flow : double safety (markers URL + event `PASSWORD_RECOVERY` + timeout 5 s).
- ✅ Aucun orphan : 100 % des `auth.users` ont profile + role.
- ✅ Aucune duplication de profile ni de role.

---

## 3. Remaining (à traiter, par priorité)

### P1 — Wallet manquant en signup (cohérence économique)
**Constat :** `handle_new_user` n'insère pas dans `ai_credit_wallets`. Conséquence : un utilisateur peut exister sans wallet jusqu'à son premier appel IA. Sur LIVE, 1/7 utilisateurs est dans cet état (`pablo.haenggi@gmail.com`). Le wallet sera créé automatiquement à la 1re consommation via `ensure_ai_wallet`, mais :
- Les KPI admin (`admin_ai_economy_summary.total_wallets`) sous-comptent les comptes réels.
- Le `welcome_bonus_credits` (10 par défaut) n'est crédité qu'à la création différée — OK fonctionnellement, mais retarde la visibilité du solde dans l'UI.

**Action MANUAL REQUIRED (additif, non destructif) :**
```sql
-- À exécuter en migration additive après revue
-- 1) Backfill du wallet manquant (idempotent grâce à ensure_ai_wallet)
SELECT public.ensure_ai_wallet('6e614dc4-6469-4ef9-9cf5-92cc413ba6b3'::uuid);

-- 2) Étendre handle_new_user pour appeler ensure_ai_wallet(NEW.id)
--    juste avant le RETURN NEW final.
--    Ne JAMAIS dropper la fonction : faire CREATE OR REPLACE en gardant
--    tout le corps existant + l'appel ensure_ai_wallet en plus.
```

### P2 — Welcome email : trigger DB absent
**Constat :** la fonction `send_welcome_email_on_confirm` est définie mais **aucun trigger** ne l'attache à `auth.users`. L'email de bienvenue ne part donc qu'à travers l'invocation client dans `useAuth.signUp()` — fragile (échec silencieux si le client perd la connexion juste après signup, ou pour les comptes créés via edge function admin sans passer par le client).

**Action MANUAL REQUIRED :**
```sql
-- Vérifier que la fonction est bien à jour (déjà créée), puis :
CREATE TRIGGER on_auth_user_email_confirmed
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at
      AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.send_welcome_email_on_confirm();
```
**Risque :** double-envoi si le client a déjà envoyé. Mitigation : la fonction utilise `idempotencyKey = 'welcome-' || NEW.id` côté queue email → dédoublonnage natif.

### P3 — `useUserRoles` `staleTime: 5 min`
**Constat :** `useUserRoles` met les rôles en cache 5 min sans invalidation explicite après promotion/démotion (ex : admin ajoute un rôle `educator` à un user déjà connecté). L'utilisateur doit attendre 5 min ou se déconnecter pour voir le nouveau set de routes.

**Action recommandée :** invalider `["user-roles", userId]` dans la fonction admin `update_user_role` (côté client après succès RPC). Non bloquant pour le go-live.

### P4 — Type `app_role` enum frontend désynchro
**Constat :** dans `useCoach.tsx` :
```ts
roles?.includes("shelter" as AppRole)
roles?.includes("shelter_employee" as AppRole)
```
Le commentaire reconnaît que ces valeurs existent en DB mais pas dans le type généré `Database["public"]["Enums"]["app_role"]`. Cast `as AppRole` masque le souci.

**Action MANUAL REQUIRED :** vérifier le contenu réel de l'enum `app_role` en LIVE :
```sql
SELECT enumlabel FROM pg_enum
WHERE enumtypid = 'public.app_role'::regtype
ORDER BY enumsortorder;
```
Si `shelter` et `shelter_employee` manquent du type Postgres : ajouter via `ALTER TYPE ... ADD VALUE IF NOT EXISTS ...` (additif, non destructif). Puis régénération des types Supabase au prochain publish.

### P5 — Coach avec chiens personnels reste sur Dashboard owner
**Constat (UX) :** `(isCoach && !hasDogs) → /coach`. Un coach qui ajoute un chien personnel est silencieusement renvoyé sur Dashboard owner à chaque connexion. Décision produit attendue :
- soit lien permanent visible "Aller à l'espace coach" sur Dashboard (existe déjà ?),
- soit conserver le redirect quel que soit `hasDogs`.
Non bloquant pour go-live, à arbitrer côté produit.

### P6 — `useAuth.signUp` envoie l'email de bienvenue avant confirmation
**Constat :** dans `useAuth.signUp`, l'invocation `send-transactional-email` template `welcome` se déclenche dès le `signUp` réussit, **avant** confirmation email. Un user qui ne confirme jamais reçoit quand même le welcome. Non destructif mais incohérent avec le pattern `send_welcome_email_on_confirm`.

**Action recommandée :** déplacer l'envoi du welcome dans le trigger DB (P2) et retirer l'appel client. Une seule source de vérité.

---

## 4. Risks (ce que je n'ai PAS vérifié dans cette boucle)

| Zone | Statut |
|---|---|
| RLS policies sur `user_roles`, `profiles`, `ai_credit_wallets` | Non audité dans cette passe — à couvrir en Phase 13 |
| Edge functions de signup (`public-signup`, `create-shelter-employee`, `create-educator`) | Lecture des sources non refaite ici — partiellement traité dans les passes scan sécurité précédentes |
| OAuth Google/Apple callback en LIVE | Non testé en runtime |
| Persistance session iOS PWA / Safari | Non testé |
| Onboarding loops (`Onboarding.tsx` 1788 lignes) | Non audité ligne à ligne dans cette boucle |
| Route `/gate-k9x` (AdminLogin) | Existence supposée d'après mémoire, non re-vérifiée |
| RLS recursion / `SECURITY DEFINER` `search_path` sur les fonctions touchant auth | Vu sur `is_admin`, `has_role`, `handle_new_user`, `ensure_ai_wallet` → tous corrects (`search_path = public`) |

---

## 5. Manual actions (ordonnées, sûres, additives)

À exécuter en **TEST d'abord**, valider, puis publier vers LIVE.

1. **Backfill wallet manquant** sur LIVE (1 user) :
   ```sql
   SELECT public.ensure_ai_wallet('6e614dc4-6469-4ef9-9cf5-92cc413ba6b3'::uuid);
   ```
2. **Migration additive** : étendre `handle_new_user` avec `PERFORM public.ensure_ai_wallet(NEW.id);` avant `RETURN NEW`. `CREATE OR REPLACE` uniquement, garder tout le corps existant.
3. **Migration additive** : attacher `send_welcome_email_on_confirm` à `auth.users` (cf. P2).
4. **Migration additive** : `ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'shelter';` et `'shelter_employee'` si manquants (cf. P4).
5. **Code client** : retirer l'envoi welcome client-side dans `useAuth.signUp` (cf. P6) — une fois le trigger DB en place.
6. **Code client** : invalider `["user-roles", userId]` dans les flux admin de promotion/démotion (cf. P3).

---

## 6. Deployment checklist (Phase 2 + 2B uniquement)

- [ ] Migration P1+P2+P4 créée sur TEST, vérifiée idempotente, testée par création d'un user fictif TEST.
- [ ] Backfill wallet exécuté sur LIVE via Cloud → Run SQL.
- [ ] Trigger welcome attaché vérifié via `SELECT * FROM pg_trigger WHERE tgrelid='auth.users'::regclass;` sur LIVE.
- [ ] Suite de validation rôles : login owner / educator / shelter / shelter_employee / admin → chacun atterrit sur la bonne route racine.
- [ ] Smoke test signup nouveau user → profile + role 'owner' + wallet présents + welcome email reçu.

---

## 7. Verdict — Phase 2 + 2B

**🟡 GO CONDITIONNEL**

L'intégrité auth/RBAC/onboarding sur LIVE est **opérationnelle** :
- 0 orphan, 0 doublon, 0 user sans rôle, redirects cohérents, guards alignés sur la DB.

**Conditions de levée du conditionnel (toutes additives, non destructives) :**
1. Backfill du wallet manquant (1 user).
2. Wiring du trigger DB de welcome email (cohérence opérationnelle).
3. Extension de `handle_new_user` pour appeler `ensure_ai_wallet` (cohérence économique + KPI admin).

Les autres points (P3, P4, P5, P6) sont des améliorations à programmer **post go-live** sans risque pour la production.

---

## 8. Périmètre non couvert

Cette boucle couvre **Phase 2 + 2B** uniquement, en lecture seule. Les phases suivantes (3 IA/crédits, 4 Stripe, 5 email SMTP, 6 push/PWA, 7 routes, 8 SEO, 9 marketing hub, 10 refuges, 11 training/walks, 12 perf, 13 sécurité edge, 14 verdict go-live global) restent à traiter dans des boucles séparées dédiées, pour garantir profondeur et non-régression.
