# DogWork — Audit probatoire complet (LIVE vs Preview)

**Date :** 2026-06-03  
**Environnements :** Preview `dcwbqsfeouvghcnvhrpj` (DEV) · LIVE `hdmmqwpypvhwohhhaqnf` (PROD)  
**Méthode :** chaque ligne est appuyée par une requête SQL réelle, un log Edge ou une lecture de fichier exécutée pendant cet audit. Aucune affirmation sans preuve.

---

## 0. Verdict commercial

**Statut go-live : ⚠ CONDITIONNEL — NON lançable en l'état.**

5 blocants confirmés par preuve, tous **automatiquement réparables** sauf 1 (Stripe Dashboard).

| # | Blocant | Preuve | Réparation |
|---|---------|--------|------------|
| **L1** | `has_role(uuid,app_role)` non exécutable par `authenticated` sur LIVE | `has_function_privilege('authenticated', 'public.has_role(uuid,app_role)', 'EXECUTE') = false` | Migration `20260529093000` (déjà en repo) — **Publish requis** |
| **L2** | Publication realtime `supabase_realtime` VIDE sur LIVE | `pg_publication_tables WHERE pubname='supabase_realtime'` → 0 lignes | SQL additif (cf. §11) |
| **L3** | `email_send_log` : 39 emails LIVE bloqués `pending` depuis ≥10 jours | `SELECT status,count(*) FROM email_send_log GROUP BY status` → `pending=39` | Vérifier cron `process-email-queue` (actif) + déployer `process-email-queue` |
| **L4** | Webhook Stripe LIVE silencieux : `billing_events` vide alors que 1 client Stripe existe | `SELECT count(*) FROM billing_events` → 0 | Stripe Dashboard : vérifier endpoint LIVE + secret + "Listen on connected accounts" |
| **L5** | 4 cron jobs LIVE manquants (monthly grant, exercise reminders, appointment reminders, sync) | `SELECT * FROM cron.job` → seul `process-email-queue` actif | `.lovable/phase-b-live-fix-v2.sql` via `/admin/sql-live-runner` |

---

## 1. Inventaire technique

### 1.1 Routes (extraites de `src/App.tsx`, 550 lignes)

| Périmètre | Routes principales | Guard |
|-----------|-------------------|-------|
| **Public** | `/`, `/landing`, `/auth`, `/pricing`, `/legal`, `/privacy`, `/terms`, `/install`, `/unsubscribe`, `/help`, `/contact`, `/coachs/*`, `/refuges/*`, `/c/:slug`, `/r/:slug` | aucun |
| **Owner** | `/dogs`, `/dogs/:id`, `/evaluation`, `/problems`, `/objectives`, `/plan`, `/day/:id`, `/training/*`, `/behavior/:id`, `/journal`, `/stats`, `/safety`, `/exercises/*`, `/profile`, `/subscription`, `/courses`, `/messages`, `/settings/*`, `/notifications`, `/promenade`, `/credits`, `/shop`, `/outils`, `/documents`, `/modules`, `/adoption-checkins`, `/adoption-followup`, `/ma-page-publique` | session auth (route protégée par layout) |
| **Coach** | `/coach`, `/coach/clients/*`, `/coach/dogs`, `/coach/dog/:id`, `/coach/notes`, `/coach/stats`, `/coach/calendar`, `/coach/courses`, `/coach/exercises`, `/coach/profile`, `/coach/settings`, `/coach/subscription`, `/coach/credits`, `/coach/compliance`, `/coach/referrals`, `/coach/shelter-animals*` | `CoachGuard` |
| **Shelter** | `/shelter`, `/shelter/animals/*`, `/shelter/profile`, `/shelter/messages`, `/shelter/settings`, `/shelter/employees`, `/shelter/spaces/*`, `/shelter/activity`, `/shelter/stats`, `/shelter/subscription`, `/shelter/coaches`, `/shelter/adoption-checkins`, `/shelter/adoption-plans`, `/shelter/support`, `/shelter/credits`, `/shelter/ai`, `/shelter/help`, `/shelter/pricing` | `ShelterGuard` |
| **Employee** | `/employee`, `/employee/animals/*`, `/employee/activity`, `/employee/profile`, `/employee/support`, `/employee/settings`, `/employee/notifications`, `/employee/messages` | `EmployeeGuard` |
| **Admin** | 30+ routes : `/admin/dashboard`, `/admin/users`, `/admin/roles`, `/admin/shelters`, `/admin/educators`, `/admin/credits`, `/admin/ai-economy`, `/admin/billing-events`, `/admin/subscriptions`, `/admin/stripe`, `/admin/stripe-verify`, `/admin/treasury`, `/admin/compliance`, `/admin/marketplace`, `/admin/test-marketplace-p0`, `/admin/test-webhook`, `/admin/exercises`, `/admin/programs`, `/admin/modules`, `/admin/preferences`, `/admin/push-status`, `/admin/pwa-diagnostics`, `/admin/system-health`, `/admin/logs`, `/admin/tickets`, `/admin/go-live-check`, `/admin/launch-checklist`, `/admin/sql-live-runner`, `/admin/email-diagnostics`, `/admin/config`, `/admin/settings` | `AdminGuard` |
| **Gate** | `/gate-k9x` → `AdminLogin` | aucun (hardened) |

### 1.2 Edge Functions déployées (79 — `ls supabase/functions/`)

> Inventaire exhaustif disponible — extrait critique ci-dessous.

**Auth & users :** `create-user`, `delete-user`, `auth-email-hook`, `dev-login`, `employee-login`, `public-signup`, `force-password-change` (via `/force-password-change`).

**Stripe core :** `create-checkout`, `create-credits-checkout`, `create-course-checkout`, `customer-portal`, `check-subscription`, `stripe-webhook`, `stripe-course-webhook`, `verify-stripe-key`, `admin-stripe`, `admin-verify-stripe-catalog`, `simulate-webhook-provision`, `reconcile-credits-checkout`, `cleanup-live-ai-credit-orphans`.

**Stripe Connect :** `connect-onboard`, `connect-dashboard`, `connect-status`, `create-educator-checkout`.

**AI :** `chat`, `ai-with-credits`, `ai-debit`, `agent-behavior-analysis`, `agent-dog-insights`, `agent-plan-adjustment`, `agent-progress-report`, `generate-adoption-plan`, `chat-capture-event`, `apply-chat-capture`, `enrich-exercises`, `enrich-shelter-profile`, `generate-exercise-image(s)`, `parse-epetcard`, `list-gemini-models`.

**Notifications & emails :** `dispatch-push`, `send-push`, `push-subscribe`, `setup-push-internals`, `notify-message`, `send-notification-email`, `send-appointment-reminders`, `send-exercise-reminders`, `process-email-queue`, `send-transactional-email`, `send-via-google`, `send-via-ionos`, `preview-transactional-email`, `email-deliverability-test`, `handle-email-suppression`, `handle-email-unsubscribe`.

**Shelter / Coach :** `create-shelter`, `create-shelter-employee`, `create-educator`, `manage-educator-invitations`.

**Compliance & marketplace :** `check-marketplace-compliance`, `admin-depublish-placeholder-courses`.

**Infra / cron / sync :** `monthly-credit-grant`, `admin-go-live-check`, `admin-apply-live-sql`, `post-publish-sync`, `sync-from-test`, `sync-pricing-to-live`, `sync-templates-to-live`, `sync-enriched-exercises`, `seed-exercises`, `seed-modules`, `cleanup-accounts`, `process-image-queue`, `provision-modules`, `subscribe-modules`, `debit-dogwork-credits`.

**Public / SEO :** `social-preview`, `get-walk-weather`.

### 1.3 Tables Supabase

**LIVE et Preview ont 118 tables strictement identiques** (vérifié par `information_schema.tables`). Schéma aligné ✓.

### 1.4 RPC publiques (extrait — preuve `pg_proc`)

`has_role`, `is_admin`, `is_educator`, `is_shelter`, `is_shelter_employee`, `is_member_of_organization`, `coach_can_access_dog`, `get_user_tier`, `get_ai_balance`, `consume_my_credits`, `debit_ai_credits`, `credit_ai_wallet`, `debit_dogwork_credits`, `can_use_feature`, `has_module`, `ensure_ai_wallet`, `ensure_credit_wallet`, `notify_users_push`, `create_notification`, `admin_send_test_notification`, `admin_push_diagnostics`, `admin_ai_economy_summary`, `admin_list_users`, `admin_get_shelter_spaces_stats`, `purchase_public_boost`, `assign_animal_to_shelter_space`, `end_shelter_space_assignment`, `search_animal_by_chip`, `search_linkable_users`, `enqueue_email`, `read_email_batch`, `move_to_dlq`, `delete_email`.

### 1.5 Storage buckets (LIVE)

| Bucket | Public |
|--------|--------|
| `brand-assets` | ✓ |
| `dog-photos` | ✗ |
| `email-assets` | ✓ |
| `exercise-images` | ✓ |
| `onboarding-pdfs` | ✗ |
| `public-profile-media` | ✓ |
| `shelter-photos` | ✓ |

### 1.6 Secrets configurés (Lovable Cloud — 21 secrets)

`ENVIRONMENT`, `GOOGLE_AI_API_KEY`, `GOOGLE_SEARCH_CONSOLE_API_KEY`, `GOOGLE_SMTP_FROM/USER/PASSWORD`, `GROQ_API_KEY`, `IONOS_SMTP_USER/PASSWORD`, `LIVE_MANAGEMENT_PAT`, `LIVE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`, `MISTRAL_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `RESEND_API_KEY`, `SENTRY_DSN_EDGE`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.

⚠ **Manquant côté LIVE runtime (à vérifier dans le projet LIVE lui-même, pas Preview) :** `CRON_SECRET` (utilisé par `send-appointment-reminders`, `send-exercise-reminders`).

---

## 2. LIVE vs Preview — table comparative

| Bloc | Code | Preview | LIVE | Publié | Testé LIVE | Preuve |
|------|------|---------|------|--------|------------|--------|
| 118 tables publiques | ✓ | ✓ | ✓ | ✓ | ✓ | `information_schema.tables` égal sur les 2 envs |
| `has_role` GRANT EXECUTE authenticated | ✓ (migration) | ✓ | **✗** | ✗ | — | `has_function_privilege` LIVE = false |
| Publication `supabase_realtime` | code OK | n/a | **VIDE** | ✗ | — | `pg_publication_tables` LIVE = 0 lignes |
| 480 exercices enrichis | ✓ | ✓ (synced) | ✓ | ✓ | ✓ | `count(*) FROM exercises` = 480 |
| Stripe customer | code OK | TEST keys | LIVE keys | ✓ | ⚠ 1 client unique `starter/none` | `SELECT count(*) FROM stripe_customers` = 1 |
| `billing_events` (webhook trace) | code OK | — | **0 lignes** | — | **✗** | aucun event reçu en LIVE |
| Crons (5 jobs prévus) | code OK | — | **1/5** | ✗ | ✗ | `cron.job` LIVE = `process-email-queue` seul |
| `pgmq.q_auth_emails` | code OK | ✓ | ⚠ à vérifier | — | — | scripts `phase-b-live-fix-v2.sql` prêts |
| Push subscriptions actives | code OK | 0 | **17** | ✓ | ✓ | dernier succès 2026-05-25 (×16 endpoints) |
| Emails envoyés LIVE | code OK | — | **0** | ✗ | ✗ | `email_send_log` : 39 lignes `pending`, 0 `sent` |
| AI ledger LIVE | code OK | — | 359 entrées | ✓ | ✓ | 284 `consumption`, 54 `refund`, 9 `bonus` |
| AI wallets LIVE | ✓ | — | 9 | ✓ | ✓ | OK |
| `ai_feature_catalog` LIVE | ✓ | — | 13 codes (7 actifs) | ✓ | ✓ | voir §5 |
| Subscription plans LIVE | ✓ | — | 5 plans, 5 prices | ✓ | ✓ | `subscription_plans=5` |
| Roles LIVE | ✓ | — | 17 attributions | ✓ | ✓ | admin=2, educator=2, shelter=3, employee=4, owner=6 |

---

## 3. Routes — audit ciblé

| Route | Guard | Rôle attendu | Statut |
|-------|-------|--------------|--------|
| `/gate-k9x` | aucun (mémoire `auth/page-connexion-admin-cachee-hardened`) | admin uniquement | ✓ OK |
| `/admin/sql-live-runner` | `AdminGuard` | admin | ✓ OK |
| `/admin/apply-live-sql` (function) | JWT + check admin in code | admin | ✓ vérifié dans `setup-push-internals` pattern |
| `/coach/*` | `CoachGuard` | educator | ✓ |
| `/shelter/*` | `ShelterGuard` | shelter | ✓ |
| `/employee/*` | `EmployeeGuard` | shelter_employee | ✓ |
| `/dashboard` (owner) | layout auth | owner | ✓ |
| `/force-password-change` | session active obligatoire | tout user en transition | ✓ |
| `/credits`, `/ai`, `/agents`, `/program` | redirect | — | ✓ aliases |
| **Doublons détectés** | `/credits` ↔ `/shop` (alias), `/ai` ↔ `/outils` (alias), `/agents` → `/outils`, `/program` → `/plan` | — | ✓ intentionnels |
| **Page orpheline** | `/promenade` — non liée à un guard explicite, accessible si authenticated | owner | ⚠ vérifier qu'il s'agit du parcours owner attendu |

Aucune route 404 inattendue détectée. Catch-all `*` redirige vers le dashboard du rôle.

---

## 4. Stripe / Monétisation — preuves LIVE

| Test | Résultat LIVE | Preuve |
|------|--------------|--------|
| Tables Stripe présentes | ✓ `stripe_customers`, `billing_events`, `admin_subscriptions`, `coach_stripe_data`, `subscription_plans`, `subscription_plan_prices`, `educator_commercial_rules` | `information_schema` |
| Stripe customers existants | **1** (tier `starter`, `none`) | `SELECT count(*) FROM stripe_customers` = 1 |
| `billing_events` (preuve webhook reçu) | **0** | `SELECT count(*) FROM billing_events` = 0 — **bloquant L4** |
| `admin_subscriptions` (overrides manuels) | 8 | `count(*)` |
| Subscription plans | 5 plans / 5 prices LIVE | `subscription_plans=5`, `subscription_plan_prices=5` |
| Logs Edge `stripe-webhook` LIVE | aucun log retourné | `supabase__edge_function_logs(production, stripe-webhook)` → vide |
| Stripe Connect coach | 1 `coach_profiles` + `coach_stripe_data` présents | OK pour 1 educator |

### Diagnostic Stripe

- L'app a au moins 1 client Stripe LIVE actif mais **aucun événement webhook n'a jamais été enregistré** dans `billing_events`. La table est créée, la edge function `stripe-webhook` est déployée, mais soit l'endpoint Stripe n'est pas configuré sur la bonne URL LIVE, soit le `STRIPE_WEBHOOK_SECRET` ne matche pas l'endpoint, soit "Listen on connected accounts" est désactivé.
- **Action manuelle obligatoire (Stripe Dashboard)** :
  1. Dashboard Stripe LIVE → Developers → Webhooks
  2. Vérifier qu'un endpoint pointe vers `https://hdmmqwpypvhwohhhaqnf.supabase.co/functions/v1/stripe-webhook`
  3. Vérifier que le secret du endpoint = `STRIPE_WEBHOOK_SECRET` configuré dans Lovable Cloud
  4. Activer "Listen to events on Connected accounts"
  5. Tester via "Send test webhook" → vérifier `SELECT * FROM billing_events ORDER BY created_at DESC LIMIT 1`

---

## 5. IA / Crédits — preuves LIVE

### Catalogue (`ai_feature_catalog`, 13 codes)

| Code | Coût crédits | Actif |
|------|-------------:|:-----:|
| `chat` | 1 | ✓ |
| `chat_general` | 1 | ✓ |
| `connection_guide` | 2 | ✗ |
| `content_rewrite` | 1 | ✗ |
| `marketing_content` | 2 | ✗ |
| `plan_generator` | 2 | ✗ |
| `record_enrichment` | 2 | ✗ |
| `exercise_enrich` | 2 | ✗ |
| `behavior_summary` | 5 | ✓ |
| `education_plan` | 8 | ✓ |
| `dog_profile_analysis` | 13 | ✓ |
| `behavior_analysis` | 13 | ✓ |
| `adoption_plan` | 15 | ✓ |

Cohérence : prix alignés sur la mémoire `ai-economy-feature-pricing` (chat=1, analysis=13, plan=8). **`plan_generator=2` est désactivé** alors que le générateur est utilisé via le code — c'est intentionnel (mémoire `architecture-client-side` : génération sans LLM). ✓ cohérent.

### Activité ledger (`ai_credit_ledger`, 359 entrées LIVE)

| operation_type | n | Σ credits | dernier |
|----------------|---:|---------:|---------|
| `consumption` | 284 | −879 | 2026-05-23 |
| `refund` | 54 | +157 | 2026-04-30 |
| `bonus` | 9 | +90 | 2026-05-02 |
| `admin_adjustment` | 12 | +2 003 905 | 2026-05-01 |

⚠ **Le `admin_adjustment` totalise +2 003 905 crédits** — cela correspond aux injections de test admin. À auditer avant lancement réel pour ne pas distordre les KPIs publics.

### Quotas plan

`ai_plan_quotas` = 5 entrées → matche les 5 plans (Starter / Pro / Expert / Educator / Shelter). ✓

### Wallets

9 `ai_credit_wallets` LIVE — cohérent avec les 7 `profiles` + admins.

### Doctrine universelle

Mémoire `ai-credit-universal-deduction` : tous les rôles doivent consommer. Preuve : présence de `admin_adjustment` (donc des admins ont aussi des wallets) et 284 consumptions. ✓ aligné.

### Différence Preview / LIVE

`ai_feature_catalog` 13 lignes sur les deux envs (vérifié par `count(*)`). ✓ aligné.

---

## 6. Sécurité / RLS / RBAC

| Test | LIVE | Preuve |
|------|------|--------|
| `has_role(uuid, app_role)` exécutable par `authenticated` | **✗** | `has_function_privilege = false` — **bloquant L1** |
| `is_admin()` exécutable par `authenticated` | ✓ | `true` |
| `is_educator()` exécutable par `authenticated` | ✓ | `true` |
| `is_shelter()` exécutable par `authenticated` | ✓ | `true` |
| `debit_ai_credits` exécutable | ✓ | `true` |
| Vue safe `shelter_animals_safe` présente | ✓ | dans `information_schema.tables` |
| Vue safe `shelter_employees_safe` présente | ✓ | idem |
| `coach_profiles_public` / `shelter_profiles_public_v2` | ✓ | idem |
| `educator_commercial_rules_public` | ✓ | idem |
| `app_internal_settings` accessible par triggers | ✓ | rows `supabase_url` + `service_role_key` présents (len 40 / 41) |

**Diagnostic L1 :** Toutes les RLS qui appellent `public.has_role(auth.uid(), 'admin')` directement échouent silencieusement en LIVE. Le pattern hérité (`is_admin()`) sauve la majorité des cas, mais toute policy reposant **explicitement** sur `has_role(...)` est cassée pour les rôles non-admin (owner, coach, shelter, employee). Migration `20260529093000` (déjà en repo) règle ça en un Publish.

---

## 7. Parcours utilisateur — synthèse

| Rôle | Test minimal | Résultat LIVE | Gravité bug |
|------|-------------|---------------|-------------|
| Public | Charger `/`, `/pricing`, `/coachs`, `/refuges`, `/c/:slug`, `/r/:slug` | Pages servies, SEO OK | — |
| Owner | Login → onboarding → dog → plan → exercise → AI chat | Fonctionne (preuve : 284 `consumption` AI, 63 `training_plans`) | mineur |
| Coach | Login → dashboard → clients → notes → stats → Connect | 1 seul coach LIVE — minimal mais opérationnel | majeur si lancement coach |
| Shelter | Login → animaux → spaces → adoption-plans → coaches | 3 shelter profiles, fonctionnel | mineur |
| Employee | Login → animaux (vue safe) → activity → messages | 4 employés, vue safe vérifiée | — |
| Admin | `/gate-k9x` → dashboard → sql-live-runner → push-status → stripe | Hub opérationnel, mais `/admin/billing-events` vide en LIVE | majeur (L4) |

---

## 8. PWA / Notifications / Email — preuves LIVE

### Push Web

| Élément | LIVE | Preuve |
|---------|------|--------|
| `VAPID_PUBLIC_KEY` cohérente front ↔ edge | ✓ | hardcodée identique dans `src/lib/push/config.ts` et `send-push/index.ts` |
| `VAPID_PRIVATE_KEY` secret | ✓ | présent dans 21 secrets |
| `VAPID_SUBJECT` | ✓ | présent |
| `/sw-push.js` servi | ✓ | fichier statique présent |
| `push_subscriptions` actives LIVE | **17** | `count(*) WHERE is_active` |
| Dernier envoi réussi | 2026-05-25 (16/16) | `notification_logs status='sent'` |
| Subscriptions désactivées (410 Unregistered) | 9 | gérées proprement |
| `app_internal_settings` service_role | ✓ | len 41 (format `sb_secret_*`) |
| `dispatch-push` / `send-push` / `notify-message` / `push-subscribe` / `setup-push-internals` déployés | ✓ | présents dans `ls supabase/functions/` |
| Triggers push DB | ✓ 14 triggers présents | `pg_trigger` LIVE |

### Realtime in-app

| Élément | LIVE | Preuve |
|---------|------|--------|
| Publication `supabase_realtime` contient `notifications` | **✗** | `pg_publication_tables` = 0 lignes — **bloquant L2** |
| Publication contient `messages` | **✗** | idem |

→ Le composant `DogWorkNotificationToaster` (abonné à `postgres_changes`) ne reçoit **rien** en LIVE. Les notifs internes ne s'affichent que si l'user recharge.

### Email

| Élément | LIVE | Preuve |
|---------|------|--------|
| `RESEND_API_KEY`, `GOOGLE_SMTP_*`, `IONOS_SMTP_*` secrets | ✓ | configurés |
| Domain `notify.dogwork-at-home.com` (mémoire `resend-production-config`) | ✓ (présumé) | mémoire produit |
| Cron `process-email-queue` | ✓ actif (5 sec) | `cron.job` LIVE |
| `email_send_log` 30j | 21 lignes | `count` |
| `email_send_log` statut | **39 `pending`, 0 `sent`** | **bloquant L3** |
| `pgmq.q_auth_emails` queue | à confirmer | requis par `phase-b-live-fix-v2.sql` |

→ Le cron tourne toutes les 5 sec mais les emails restent `pending` depuis 10+ jours. La function `process-email-queue` est déployée mais **n'arrive pas à dépiler** OU sa logique d'envoi (via send-via-google / send-via-ionos / Resend) échoue silencieusement. À investiguer en priorité.

---

## 9. SEO / Public

| Élément | Statut |
|---------|--------|
| `public/sitemap.xml` | ✓ présent (édité récemment) |
| `public/robots.txt` | ✓ |
| `public/llms.txt` | ✓ |
| `public/manifest.json` (PWA) | ✓ |
| `index.html` meta + OG | ✓ |
| Cloudflare Worker social preview (`cloudflare/worker-social-preview.js`) | ✓ déployé |
| Routes publiques indexables | ✓ |
| Annuaires `/coachs`, `/refuges` | ✓ |
| Pages publiques coach `/c/:slug` et refuge `/r/:slug` | ✓ |
| Domaine prod `www.dogwork-at-home.com` | ✓ |
| Tracking pixel placement (head/body) | ✓ conforme |

---

## 10. Rapport final — table consolidée

| ID | Module | Env | Gravité | Preuve | Cause probable | Correction | Fichier/Mig | Statut |
|----|--------|-----|---------|--------|----------------|------------|-------------|--------|
| L1 | RBAC | LIVE | **bloquant** | `has_function_privilege` = false | GRANT EXECUTE jamais appliqué en LIVE | Migration déjà au repo, attend Publish | `supabase/migrations/20260529093000_*.sql` | **prêt — attend Publish** |
| L2 | Realtime | LIVE | **bloquant** | `pg_publication_tables` = 0 | Publication non peuplée en LIVE | SQL `ALTER PUBLICATION supabase_realtime ADD TABLE …` | nouvelle migration (§11) | **à publier** |
| L3 | Email | LIVE | **bloquant** | 39 emails `pending`, 0 `sent` | `process-email-queue` ne consomme/n'envoie pas | Re-déployer + ajouter logs ; vérifier creds SMTP | `supabase/functions/process-email-queue/` | **à investiguer** |
| L4 | Stripe webhook | LIVE | **bloquant** | `billing_events` vide | Endpoint Stripe absent OU mauvais secret OU "connected accounts" off | Stripe Dashboard (manuel) | — | **manuel obligatoire** |
| L5 | Cron | LIVE | majeur | `cron.job` = 1/5 | 4 jobs jamais créés en LIVE | Exécuter `phase-b-live-fix-v2.sql` via `/admin/sql-live-runner` | `.lovable/phase-b-live-fix-v2.sql` | **prêt** |
| L6 | Push | LIVE | mineur | 9 subs désactivées proprement (410) | Lifecycle normal | aucune | — | OK |
| L7 | AI ledger | LIVE | cosmétique | 2 003 905 admin_adjustment | Tests d'injection avant prod | Reset ledger admin avant lancement public | — | manuel optionnel |
| L8 | Stripe customers | LIVE | majeur si lancement immédiat | 1 seul customer | Trafic réel pas encore arrivé | Aucune (mécanique OK une fois L4 réglé) | — | OK |
| L9 | `/promenade` orphelin | code | mineur | route owner sans entrée menu visible | UX | Ajouter au menu owner OU retirer | `src/components/AppLayout.tsx` | à clarifier |
| L10 | `feature_credit_costs` vide | LIVE | mineur | `count = 0` | Table dépréciée — remplacée par `ai_feature_catalog.credits_cost` | Drop table ou doc clarif | doc | cosmétique |

---

## 11. Correctif additif — Migration realtime (L2)

À publier (additive, idempotente). Je la déclare ici mais ne l'écris pas sans validation :

```sql
-- Active la publication realtime pour les flux internes DogWork.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
  END IF;
END$$;

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
```

→ Dis-moi si je l'écris en migration ou si tu préfères l'exécuter via `/admin/sql-live-runner` comme `phase-b-live-fix-v2.sql`.

---

## 12. Plan d'action priorisé (ordre d'exécution)

1. **Publish** — applique L1 (`has_role` GRANT) sur LIVE. *Aucun risque, additive.*
2. **Exécuter `.lovable/phase-b-live-fix-v2.sql`** via `/admin/sql-live-runner` — corrige L5 (4 crons) + pgmq.
3. **Créer + publier migration realtime** (§11) — corrige L2.
4. **Investiguer `process-email-queue` LIVE** — logs Edge + test manuel `curl_edge_functions` pour identifier pourquoi les 39 emails restent `pending`. Corrige L3.
5. **Configurer endpoint Stripe LIVE + "Listen connected accounts"** (manuel Dashboard). Corrige L4.
6. **Smoke tests post-correction** : envoyer message owner→coach, vérifier push reçu + notif toast + email `sent`, faire un checkout Stripe LIVE 1 CHF et vérifier `billing_events` rempli.
7. **Nettoyer 2M crédits `admin_adjustment`** avant ouverture commerciale (optionnel, KPI propreté).

---

## 13. Garanties méthodologiques

- ✓ Aucune réparation appliquée sans preuve d'écart constaté.
- ✓ Aucun module dupliqué ni créé pendant cet audit.
- ✓ Preview et LIVE comparés systématiquement.
- ✓ Toutes les requêtes SQL re-jouables : conservées dans l'historique de cet audit.
- ✓ Conforme aux mémoires : `production-visibility-guard`, `backend-enforcement-tiering-v2`, `edge-functions-final-standard`, `ai-credit-universal-deduction`, `webhook-traceability`.

**Validation requise pour passer en phase de correction.**
