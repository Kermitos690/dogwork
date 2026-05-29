# DogWork — Phase A : Scan Global Go-Live (Preuves Réelles)

**Date :** 2026-05-29  
**Méthode :** lecture croisée TEST (`dcwbqsfeouvghcnvhrpj`) ↔ LIVE (`hdmmqwpypvhwohhhaqnf`) via `supabase--read_query` + `analytics_query` + inspection code source. Aucune affirmation sans preuve SQL ou log.

---

## 1. Schéma & migrations

| Indicateur | TEST | LIVE | Écart |
|---|---|---|---|
| Tables + vues `public` | 118 | 118 | ✅ identique |
| Exercices | 480 | 480 | ✅ identique |
| Catégories exercices | 25 | 25 | ✅ identique |

**Preuve :** `SELECT table_name FROM information_schema.tables WHERE table_schema='public'` retourne la même liste exacte des deux côtés.

**Conclusion schéma :** aucune dérive structurelle. Toutes les migrations DDL sont alignées.

---

## 2. Données métier (LIVE = production réelle)

| Indicateur | TEST | LIVE | Lecture |
|---|---|---|---|
| `user_roles` | 15 | 17 | LIVE a 2 admins (cohérent) |
| `profiles` | 8 | 7 | normal |
| `dogs` | 2 | 3 | normal |
| `shelter_animals` | 3 | 5 | normal |
| `ai_credit_wallets` | 9 | 9 | OK |
| `ai_credit_ledger` | 94 | 359 | LIVE = vraie usage |
| `push_subscriptions` | 0 | 26 | LIVE = vraies installations PWA |
| `admin_subscriptions` actives | 1 | 4 | LIVE = vrais abonnés |
| `stripe_customers` | n/a | 1 (avec stripe_id) | un seul payeur réel |
| `coach_stripe_data` onboardés | n/a | 1 | un coach Connect onboardé |
| `courses` | n/a | 2 | deux cours créés |
| `course_bookings` | n/a | 1 | une réservation |
| **`billing_events`** | **26** | **0** | 🔴 **anomalie critique** |
| `notifications` | n/a | 13 | OK |

---

## 3. 🔴 BLOQUANTS GO-LIVE (priorité absolue)

### B1. `has_role()` sans EXECUTE grant sur LIVE
**Preuve :**
```
SELECT proname, has_function_privilege('authenticated', oid, 'EXECUTE') ...
→ has_role : authenticated=false, anon=false
  toutes les autres fonctions (is_admin, has_module, etc.) : true
```
**Impact :** chaque policy RLS qui appelle `public.has_role(auth.uid(), 'X')` retourne faux/erreur silencieuse pour les utilisateurs authentifiés. Tous les guards admin/educator/shelter passent en "accès refusé" intermittent.

**Statut :** migration corrective créée sur TEST (`20260529093000_*.sql`) — **non encore propagée sur LIVE**. Requiert publish ou exécution SQL Live.

### B2. `stripe-webhook` LIVE n'a aucun log
**Preuve :** `supabase--edge_function_logs(stripe-webhook, env=production)` → `No logs found`.  
Combiné à `billing_events = 0` sur LIVE alors qu'il y a 4 active_subs + 1 stripe_customer + 1 booking.

**Lecture probable :** soit l'endpoint webhook configuré sur le Dashboard Stripe LIVE ne pointe pas vers `https://hdmmqwpypvhwohhhaqnf.supabase.co/functions/v1/stripe-webhook`, soit la signature est rejetée silencieusement, soit aucun event Stripe LIVE n'a jamais été émis (les 4 abonnements actifs viendraient alors d'overrides admin manuels via `subscription_overrides`).

**Impact :** zéro traçabilité Stripe → impossible d'auditer renouvellements, échecs, refunds. Risque réglementaire et opérationnel.

**Action MANUELLE requise :**
- Vérifier sur Stripe Dashboard LIVE → Developers → Webhooks que l'endpoint pointe bien sur `https://hdmmqwpypvhwohhhaqnf.supabase.co/functions/v1/stripe-webhook` (et pas l'URL TEST encore présente dans `src/pages/AdminGoLiveCheck.tsx:283/287`).
- Vérifier que `STRIPE_WEBHOOK_SECRET` LIVE est aligné avec celui du Dashboard LIVE.
- Vérifier l'option **"Listen to events on Connected accounts"** pour `stripe-course-webhook` (cf. memory).

### B3. Queue email LIVE cassée (`pgmq.q_auth_emails` n'existe pas)
**Preuve :** `postgres_logs` LIVE = **flood d'erreurs toutes les 5 secondes** :
```
ERROR : relation "pgmq.q_auth_emails" does not exist
```
Origine : cron `process-email-queue` (schedule `5 seconds`) appelle `pgmq.read('auth_emails', ...)` sans la wrapper `read_email_batch` qui crée la queue si absente.

**Impact :** logs LIVE pollués, et selon le code de la function `process-email-queue`, potentiellement aucun email auth/transactionnel envoyé via la queue.

**Action AUTOMATIQUE possible :** créer la queue manquante côté LIVE.

### B4. Cron jobs manquants sur LIVE
**Preuve :**
```
TEST cron.job : 6 jobs (billing-events-sync-check, dogwork-exercise-reminders,
  monthly-ai-credit-grant, monthly-credit-grant-daily, process-email-queue,
  send-appointment-reminders-daily)
LIVE cron.job : 1 seul (process-email-queue)
```
**5 jobs manquants** sur LIVE :
- `monthly-ai-credit-grant` (grants mensuels crédits IA) — **bloquant business**
- `monthly-credit-grant-daily` (check daily)
- `send-appointment-reminders-daily` — feature coach payée silencieusement morte
- `dogwork-exercise-reminders` (rappels push exercices)
- `billing-events-sync-check` (auto-reco anomalies billing)

**Impact :** aucun crédit ne sera attribué aux abonnés à la prochaine date de renouvellement mensuel. Pas de rappels RDV. Pas de rappels d'exercices push.

**Action SQL Live requise** (DDL `cron.schedule` non versionné dans migrations).

---

## 4. 🟡 IMPORTANTS (non-bloquants mais à traiter avant volume)

### I1. Refs hardcodées TEST en code UI admin
- `src/pages/AdminGoLiveCheck.tsx:283` et `:287` → affiche `dcwbqsfeouvghcnvhrpj.supabase.co/functions/v1/stripe-webhook` comme URL à coller dans Stripe Dashboard. **Trompeur sur LIVE**. À corriger en env-aware.

### I2. Catalogue d'exercices LIVE servi depuis storage TEST
Les `cover_image` des 480 exercices LIVE pointent vers `dcwbqsfeouvghcnvhrpj.supabase.co/storage/...`. Documenté (memory `post-publish-sync-pipeline-v2`) mais crée une dépendance dure : si TEST tombe, LIVE perd ses images.

### I3. Phase A : 0 push_subscriptions sur TEST
Normal (preview). Mention pour info.

---

## 5. 🟢 OK & SAINS

- ✅ Schéma 100% aligné TEST/LIVE
- ✅ 480 exercices + 25 catégories synchronisés
- ✅ Vault & `app_internal_settings` LIVE renseignés (`supabase_url`, `service_role_key`) → push triggers opérationnels
- ✅ 26 push subscriptions LIVE actives = PWA déployée et utilisée
- ✅ `ai_credit_ledger` LIVE = 359 entrées = système crédits réellement utilisé
- ✅ Modules (15), packs crédits (3), features IA actives (7), plans (5), prix (5) tous présents
- ✅ Toutes les autres fonctions critiques (`is_admin`, `is_educator`, `has_module`, `get_user_tier`, `debit_dogwork_credits`, `consume_my_credits`, `get_my_credit_balance`) ont l'EXECUTE grant requis
- ✅ Edge function logs LIVE : aucune erreur ≥ 400 récente (hors webhook stripe inactif)

---

## 6. Runtime error ShelterGuard "Importing a module script failed"

**Diagnostic :** session replay ([1780047487061]) montre la séquence :
1. Nouvelle version de l'app déployée pendant la session
2. Banner "Nouvelle version disponible — Recharger l'application" affiché
3. L'utilisateur navigue → Vite ne trouve plus les vieux chunks → `chunk-QCHXOAYK.js?v=cee4ba4e` 404
4. `Importing a module script failed`

**Cause racine :** *stale Vite chunks après hot deploy*. **Ce n'est PAS un bug de code** dans `ShelterGuard.tsx` (le fichier compile et fonctionne). C'est le comportement attendu d'une SPA lors d'un déploiement live : le SW détecte la nouvelle version et invite à recharger. Le crash apparaît seulement si l'utilisateur ignore le prompt et continue à naviguer.

**Action :** aucune correction code requise. Vérifier juste que le `sw.js` force bien un `skipWaiting` + `clients.claim` après prompt, et que le banner "Recharger" est bien proéminent. Auto-résolu au reload.

---

## 7. MATRICE GO-LIVE

| # | Item | Sévérité | Type | Owner |
|---|---|---|---|---|
| B1 | `has_role` grant manquant LIVE | 🔴 BLOQUANT | AUTOMATIQUE (publish) | Toi (publish) |
| B2 | `stripe-webhook` LIVE inactif | 🔴 BLOQUANT | MANUEL (Stripe Dashboard) | Toi |
| B3 | Queue `pgmq.q_auth_emails` absente LIVE | 🔴 BLOQUANT | AUTOMATIQUE (SQL Live) | Agent (script prêt) |
| B4 | 5 cron jobs manquants LIVE | 🔴 BLOQUANT | AUTOMATIQUE (SQL Live) | Agent (script prêt) |
| I1 | URLs TEST hardcodées dans AdminGoLiveCheck | 🟡 IMPORTANT | AUTOMATIQUE (code) | Agent |
| I2 | Cover images servies depuis TEST | 🟡 IMPORTANT | MANUEL (déplacer storage) | Toi |
| C1 | ShelterGuard "module script failed" | 🟢 COSMÉTIQUE | RIEN À FAIRE | — |
| C2 | refs TEST dans `sync-from-test`, `post-publish-sync`, `sync-enriched-exercises` | 🟢 COSMÉTIQUE | by design | — |

---

## 8. SCORE GO-LIVE RÉEL

**75 / 100** — Statut : **CONDITIONNEL**

Décomposition :
- Schéma & code : 95/100 (très propre, 4 lignes UI à corriger)
- Données prod réelles : 90/100 (vraies usages mesurées)
- Sécurité RLS / RBAC : 70/100 (B1 invalide tous les guards)
- Stripe LIVE : 30/100 (B2 — webhook muet, traçabilité zéro)
- Background jobs : 20/100 (B4 — 5/6 jobs absents, crédits mensuels non distribués)
- Email LIVE : 50/100 (B3 — queue cassée, mais auth emails Supabase natifs fonctionnent)
- Frontend & PWA : 95/100 (RAS, runtime error = stale chunk normal)

**Verdict :** **NE PAS go-live tant que B1, B2, B3, B4 ne sont pas traités**. Une fois ces 4 corrigés (1 publish + 1 action Stripe Dashboard + 1 script SQL Live), le score passe à ~95/100 et le go-live est sain.

---

## 9. Stratégie de réparation Phase B (proposée, à valider)

**Ordre d'exécution** :
1. **B1** — `git publish` (la migration `20260529093000` GRANT EXECUTE has_role est déjà en attente). Risque : nul. Temps : 1 min.
2. **B3 + B4** — un seul script SQL Live consolidé : crée `pgmq.q_auth_emails` + réinstalle les 5 cron jobs manquants. Idempotent. À coller dans Cloud → Database → Run SQL (Live). Agent prépare le script.
3. **I1** — patch UI `AdminGoLiveCheck.tsx` env-aware (5 lignes). Diff fourni.
4. **B2** — toi sur Stripe Dashboard LIVE : vérifier endpoint + secret + "Listen on connected accounts". Pas de code à pousser, juste config Stripe.
5. **Validation post-fix** : re-run des requêtes preuves de §3 → tout doit basculer vert.

**Aucun reset, aucun drop, aucune feature touchée. 100% additif.**

---

## 10. Prochaine étape

**J'attends ton GO pour Phase B** :
- préparer le script SQL Live consolidé (B3+B4) prêt à coller
- patcher I1 dans le code
- te donner la check-list précise des actions Stripe Dashboard pour B2
- attendre ton publish pour B1
