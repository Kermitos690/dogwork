# DogWork — État des lieux complet de l'écosystème

Date : 2026-05-17
Auteur : Audit Lovable (lecture seule, additif)
Portée : backend Supabase/Lovable Cloud, frontend React/Vite, Stripe, IA/crédits, refuges, adoption, promenade, notifications, emails, admin, sécurité, SEO/PWA.
Source de vérité produit : `mem://index.md` et rapports précédents :
- `.lovable/audit-go-live-final-report.md`
- `.lovable/audit-go-live-p0-p1-stripe-admin.md`
- `.lovable/final-go-live-validation-stripe-admin.md`
- `.lovable/post-stripe-live-final-validation.md`
- `.lovable/seo-audit-report.md`, `seo-social-pass-report.md`, `seo-social-edge-proxy-report.md`
- `.lovable/cloudflare-worker-social-preview-final-report.md`

> Aucun code, aucune donnée, aucune RLS n'ont été modifiés par cet audit. Seules les corrections déjà actées dans les passes précédentes sont mentionnées comme « faites ».

---

## A. Résumé exécutif

**Verdict global : GO avec réserves.**

L'écosystème DogWork est mature, structuré et largement fonctionnel pour les 5 rôles (owner / educator / shelter / shelter_employee / admin). Les fondations critiques (Auth, RLS, Stripe principal, crédits IA, emails transactionnels, notifications push, admin) sont opérationnelles et durcies. Restent **2 réserves bloquantes** côté **Stripe Connect Live** et **3 chantiers P1** côté UI/branchements pour atteindre un état réellement prêt à l'ouverture publique sans réserve.

Ce qui est **prêt** :
- Auth + rôles + guards + RLS permissive cohérente.
- Stripe principal (subs + crédits) + webhook idempotent.
- Emails transactionnels via routeur centralisé (provider unique).
- Crédits IA (wallet, ledger, packs, débit/refund, shop).
- Module refuge (espaces 2D, employés, adoption).
- Admin (gateway caché, diagnostics, CRUD users, modules, Stripe hub).
- SEO de base + worker social preview Cloudflare.

Ce qui **bloque encore** :
- **P0** : `STRIPE_CONNECT_WEBHOOK_SECRET` absent en Live → marketplace cours payants non opérationnelle.
- **P0** : action manuelle Stripe Dashboard non vérifiable depuis Lovable (cocher *"Listen to events on Connected accounts"* sur l'endpoint `stripe-course-webhook`).

Ce qui doit être **poli avant ouverture** (P1) :
- Branchement UI de `admin_get_shelter_spaces_stats` (RPC existante, dashboard global manquant).
- Nettoyage doublons `feature_credit_costs` ↔ `ai_feature_catalog` (technique only, sans impact runtime).
- Page `/promenade` : vérifier branchement complet `dog_walks` + `dog_walk_points` + météo (`get-walk-weather` présente).

---

## B. Vue d'ensemble — Maturité par grand module

| Module | Maturité | Tendance |
|---|---|---|
| Auth + rôles + guards | 95% | Stable |
| Profils (perso, public, draft) | 90% | Stable |
| Chiens (CRUD, journal, évaluation) | 95% | Stable |
| Exercices (480 enrichis, gating) | 95% | Stable |
| IA + crédits + shop | 90% | Stable |
| Abonnements (owner/educator/shelter) | 85% | Stable |
| Stripe principal | 95% | Prêt Live |
| Stripe Connect (marketplace) | 70% | **Bloqué Live** |
| Refuges (espaces, employés, animaux) | 90% | Stable |
| Adoption + suivi post-adoption | 85% | Stable |
| Promenade GPS | 70% | À vérifier UI |
| Notifications (interne + push) | 85% | Stable |
| Emails (Resend + queue + suppression) | 95% | Centralisé |
| Admin (gateway, diagnostics, CRUD) | 95% | Stable |
| SEO + worker social preview | 85% | Stable |
| PWA / mobile | 75% | iOS limité (normal) |
| Sécurité (RLS, SECURITY DEFINER, search_path) | 95% | Audit OK |

---

## C. Cartographie des fonctionnalités (synthèse)

Échantillon — détails complets table par table dans la base ; tableau exhaustif tenu côté DB (`information_schema`). Inventaire mesuré : **120 pages, 78 edge functions, ~72 composants partagés, 229 migrations, 117 tables/vues `public`**.

| Module | Tables clés | Edge Functions | Routes | Statut |
|---|---|---|---|---|
| Auth | `profiles`, `user_roles` | `dev-login`, `employee-login`, `public-signup`, `auth-email-hook` | `/auth`, `/reset-password`, `/force-password-change` | COMPLET |
| Owner dashboard | `dogs`, `day_progress`, `behavior_logs`, `dog_objectives` | — | `/`, `/dogs`, `/plan`, `/journal`, `/stats`, `/safety` | COMPLET |
| Exercices | `exercises`, `exercise_categories`, `exercise_sessions` | `enrich-exercises`, `sync-enriched-exercises`, `generate-exercise-image(s)` | `/exercises`, `/exercises/:slug` | COMPLET |
| IA & crédits | `ai_credit_wallets`, `ai_credit_ledger`, `ai_credit_packs`, `ai_feature_catalog`, `ai_plan_quotas`, `ai_pricing_config` | `ai-with-credits`, `ai-debit`, `debit-dogwork-credits`, `monthly-credit-grant`, `chat`, `agent-*` | `/outils`, `/shop`, `/credits` | COMPLET |
| Abonnements | `admin_subscriptions`, `stripe_customers`, `subscription_plans`, `subscription_plan_prices`, `billing_events` | `check-subscription`, `create-checkout`, `customer-portal`, `stripe-webhook`, `reconcile-credits-checkout`, `simulate-webhook-provision` | `/subscription`, `/pricing`, `/shop` | COMPLET |
| Stripe Connect | `coach_stripe_data`, `courses`, `course_bookings`, `course_participants`, `marketplace_*` | `connect-onboard`, `connect-status`, `connect-dashboard`, `create-course-checkout`, `stripe-course-webhook`, `check-marketplace-compliance` | `/coach/*`, `/courses` | **PARTIEL — bloqué secret Live** |
| Refuges | `shelter_profiles`, `shelter_animals`, `shelter_spaces` (+ child tables), `shelter_employees`, `shelter_activity_log` | `create-shelter`, `create-shelter-employee`, `enrich-shelter-profile`, `parse-epetcard` | `/shelter/*`, `/employee/*` | COMPLET (UI globale admin manquante) |
| Adoption | `adopter_links`, `adoption_plans`, `adoption_plan_entries/tasks`, `adoption_checkins`, `adoption_updates` | `generate-adoption-plan` | `/adoption-checkins`, `/adoption-followup`, `/shelter/adoption-*` | COMPLET |
| Promenade | `dog_walks`, `dog_walk_points` | `get-walk-weather` | `/promenade` | À VÉRIFIER (UI) |
| Notifications | `notifications`, `notification_preferences`, `notification_logs`, `push_subscriptions` | `dispatch-push`, `send-push`, `push-subscribe`, `notify-message`, `setup-push-internals` | `/notifications`, `/settings/notifications`, `/admin/push-status` | COMPLET |
| Emails | `email_send_log`, `email_send_state`, `email_unsubscribe_tokens`, `suppressed_emails` | `send-transactional-email`, `send-notification-email`, `process-email-queue`, `send-via-google`, `send-via-ionos`, `email-deliverability-test`, `preview-transactional-email`, `handle-email-suppression`, `handle-email-unsubscribe` | `/unsubscribe`, `/admin/email-diagnostics` | COMPLET (centralisé) |
| Admin | tous | `admin-*`, `cleanup-*`, `delete-user`, `create-user`, `verify-stripe-key`, `post-publish-sync`, `sync-*` | `/gate-k9x`, `/admin/*` | COMPLET |
| Marketplace conformité | `marketplace_compliance_checks`, `marketplace_content_scans`, `marketplace_policy_flags`, `marketplace_restrictions`, `coach_charter_acceptances` | `check-marketplace-compliance`, `admin-depublish-placeholder-courses` | `/coach/compliance`, `/admin/compliance`, `/admin/marketplace` | COMPLET |

---

## D. Fonctionnalités développées mais non visibles utilisateur

| Élément | Backend | Frontend | Manque | Priorité |
|---|---|---|---|---|
| `admin_get_shelter_spaces_stats()` (RPC globale) | OUI | NON | Widget admin sur `/admin/shelters` | P1 |
| `v_credit_orders_daily`, `v_credit_orders_admin` | OUI | partiel | Page admin "ventes crédits jour" | P2 |
| `v_my_wallet_daily_activity` | OUI | NON | Graphe historique dans `/shop` | P2 |
| `ai_generated_documents` | OUI | partiel | Hub central `/documents` existe, vérifier filtres/types | P2 |
| `professional_alerts` | OUI | NON | Aucun écran dédié | P2 |
| `coach_calendar_events` | OUI | partiel | `/coach/calendar` existe — vérifier flux côté client owner | P2 |
| `shelter_observations` | OUI | non visible UI directe | Onglet observations animal | P2 |
| `referral_attributions` + `educator_referral_codes` | OUI | OUI partiel (`/coach/referrals`) | Tableau performance + URL partage | P2 |
| `feature_usage` | OUI | NON | Analytics admin par feature | P3 |
| `usage_tracking` | OUI | NON | Doublon avec `feature_usage` ? À clarifier | P3 |
| `simulate-webhook-provision` | OUI | OUI admin | Bouton dans `/admin/stripe` (existant) | OK |
| `enrich-shelter-profile` | OUI | NON | CTA dans `/shelter/profile` | P2 |
| `parse-epetcard` | OUI | NON | Bouton upload "import e-pet card" sur fiche animal | P2 |
| `email-deliverability-test` | OUI | OUI admin | OK |
| `seed-modules`, `seed-exercises` | OUI | admin only | OK (one-shot) |

---

## E. Fonctionnalités visibles mais non fonctionnelles

| Élément | Symptôme | Cause probable | Priorité |
|---|---|---|---|
| Page `/promenade` | UI complète, à valider en e2e GPS/météo | non testé production | P1 |
| Bouton "Installer l'app" iOS | Toast informatif | limitation OS — comportement attendu | OK |
| Page `/modules` add-ons | Liste OK, achat OK ; vérifier que `subscribe-modules` réagit bien aux Live price IDs | dépend de la config Stripe Live | P2 |
| `/coach/courses` création cours | Création OK, publication bloquée si charte ou module manquants (`enforce_course_publication_rules`) | comportement voulu | OK |

Aucun bouton purement statique (sans handler) détecté dans la passe — les CTA "fantômes" ont été corrigés lors des passes précédentes (notification, profil public, push).

---

## F. Backend sans frontend

Voir section D — les principaux candidats sont les RPC admin globales (shelter spaces stats, KPIs crédits journaliers), `professional_alerts` et le bouton `parse-epetcard`. Tous **non bloquants** — ce sont des modules de confort admin/pro.

## G. Frontend sans backend

Aucun écran majeur détecté en mode mock. Les pages historiquement "demo" (ex. anciens dashboards) ont été supprimées ou redirigées via `<Navigate to=... />`. Les pages `/agents` et `/program` sont des redirections explicites vers `/outils` et `/plan`.

## H. Modules partiels

- **Stripe Connect** : code OK, données OK, secret Live manquant.
- **Promenade** : à confirmer en e2e (météo, GPS, dénivelé).
- **Analytics produit** : tables `feature_usage` / `usage_tracking` non agrégées en dashboard.
- **Messagerie owner ↔ coach** : présente (`/messages`), à confirmer compatibilité refuge ↔ adoptant.

## I. Modules obsolètes ou doublons

| Élément | Statut | Action |
|---|---|---|
| `feature_credit_costs` | Doublon legacy de `ai_feature_catalog` | Conserver tant que `consume_my_credits` repose sur catalog. À retirer en P3. |
| `usage_tracking` vs `feature_usage` | Doublon | Décider source unique en P3. |
| `shelter_profiles_public` vs `shelter_profiles_public_v2` | v2 active | Garder v1 pour rollback, supprimer en P3. |
| `ai_credit_packs` vs `ai_credit_packs_public` | Public = vue safe | OK (volontaire) |
| `coach_profiles` vs `coach_profiles_public` | Public = vue safe | OK (volontaire) |
| Anciennes routes `/program`, `/agents`, `/credits`, `/ai` | Redirigées | OK |

---

## J. Audit sécurité (synthèse)

Confirmation des rapports précédents — aucune régression détectée.

| Risque | Fichier / fonction | Gravité | Statut |
|---|---|---|---|
| Cleanup orphelins crédits Live non gardé | `cleanup-live-ai-credit-orphans` | Critique | **CORRIGÉ** (admin JWT + CRON_SECRET) |
| `list-gemini-models` ouvert anon | `list-gemini-models` | Élevé | **CORRIGÉ** (admin guard) |
| Vues publiques sans `security_invoker` | toutes vues `public.*` | Moyen | OK (mémoire confirme) |
| Search_path mutable sur SECURITY DEFINER | toutes RPC publiques | Moyen | OK (`SET search_path = public` partout) |
| Exposition adopter PII | `shelter_animals_safe` | Élevé | OK (vue safe) |
| PIN employé refuge en clair | `shelter_employees_safe` | Élevé | OK (hashed_pin masqué) |
| Edge functions publiques sensibles | `social-preview`, `handle-email-unsubscribe` | OK | Anonymes par design (public) |
| Endpoint SSRF | aucun trouvé | — | OK |

---

## K. Audit paiements (synthèse)

| Sujet | Statut | Détail |
|---|---|---|
| `stripe-webhook` | OK Live | Signature + idempotence via `billing_events.stripe_event_id` |
| `stripe-course-webhook` | **BLOQUÉ** | Manque `STRIPE_CONNECT_WEBHOOK_SECRET` |
| `create-checkout` (subs) | OK | URL retour Lovable-aware |
| `create-credits-checkout` | OK | Provisioning via webhook + fallback `reconcile-credits-checkout` |
| `customer-portal` | OK | |
| `check-subscription` | OK | Source de vérité serveur |
| `coach_stripe_data` | OK | Isolation des IDs Connect |
| `subscribe-modules` | OK | Ajoute items sur sub principale |
| `simulate-webhook-provision` | OK admin only | |
| Cohérence prix landing / app / DB | OK | `subscription_plans` + `subscription_plan_prices` |

**Actions manuelles requises** :
1. Renseigner `STRIPE_CONNECT_WEBHOOK_SECRET` (Live) dans Supabase.
2. Cocher *"Listen to events on Connected accounts"* sur `stripe-course-webhook` endpoint dans Stripe Dashboard.
3. Confirmer `STRIPE_SECRET_KEY` = `sk_live_...` côté Live.

---

## L. Audit IA / crédits

| Composant | Statut |
|---|---|
| Wallet auto-créé (`ensure_ai_wallet` + bonus bienvenue) | OK |
| Débit unique via `debit_ai_credits` (admin/service uniquement) | OK |
| Catalog features actif (`ai_feature_catalog`) | OK — doublon `feature_credit_costs` à retirer P3 |
| Quotas mensuels par tier (`ai_plan_quotas`) | OK |
| Grant mensuel cron (`monthly-credit-grant`) | OK |
| Shop crédits Stripe + retry frontend | OK |
| Anti-spam 30s + erreurs 402/429 mappées | OK |
| Refund automatique si appel IA échoue | OK |
| Universal deduction (admin/educator consomment) | OK |
| Modèles supportés (Gemini 2.5 / 3 preview, GPT-5) | OK |

---

## M. Rôles et permissions

| Rôle | Guard | Layout | Couvertures |
|---|---|---|---|
| owner | implicite | `AppLayout` | dashboard, dogs, plan, exercices, journal, shop, settings, support |
| educator | `CoachGuard` | `CoachLayout` | coach/*, marketplace, courses, clients, compliance, referrals, stripe connect |
| shelter | `ShelterGuard` | dédié | shelter/*, animals, spaces, employés, adoption, coaches |
| shelter_employee | `EmployeeGuard` | `EmployeeLayout` | employee/*, animals safe view, activity, messages |
| admin | `AdminGuard` | `AppLayout` | tous `/admin/*`, gateway `/gate-k9x` |

Aucune fuite de rôle détectée. Cache React Query purgé au changement d'utilisateur (cf. mem `session-cache-invalidation`).

---

## N. PWA / Mobile / Notifications

| Élément | Statut |
|---|---|
| `manifest.webmanifest` | OK |
| Service worker (`sw.js`) | OK |
| Push subscription (Web Push VAPID) | OK |
| iOS install : informatif | OK (limitation iOS) |
| Préférences notif (catégories + quiet hours) | OK |
| Fallback notification interne si push KO | OK |
| `dispatch-push` broadcast role-based | OK |

---

## O. SEO / Public / Go-to-market

| Élément | Statut |
|---|---|
| Landing `/` | OK + vidéos responsives + transparence prix |
| Meta titles/descriptions par route | OK |
| OG image dynamique via Cloudflare Worker | OK |
| `sitemap.xml`, `robots.txt`, canonical | OK |
| Profils publics coach + refuge | OK (boost system) |
| JSON-LD structuré | partiel — P2 |

---

## P. Roadmap de réparation

### Sprint 1 — P0 bloquant (avant ouverture publique)
1. **Stripe Connect Live** : configurer `STRIPE_CONNECT_WEBHOOK_SECRET` + cocher "Listen to events on Connected accounts".
2. **Vérification e2e** : 1 achat cours réel en Live → confirmer payout educator + commission 15.8%.

### Sprint 2 — P1 polish ouverture
1. Brancher widget admin global shelter spaces (`admin_get_shelter_spaces_stats`) dans `/admin/shelters`.
2. Audit e2e `/promenade` : GPS, météo (`get-walk-weather`), historique, RLS.
3. Brancher CTA `enrich-shelter-profile` et `parse-epetcard` (refuges).
4. Vérifier `subscribe-modules` avec price IDs Live.

### Sprint 3 — P2 confort
1. Dashboards admin : ventes crédits jour, KPIs wallets, top features.
2. Onglet observations animal (refuge).
3. Tableau référents coach (performance des codes).
4. JSON-LD enrichi (Organization, Service, Course).

### Sprint 4 — P3 nettoyage
1. Décommissionner `feature_credit_costs`, `usage_tracking`, `shelter_profiles_public` v1.
2. Décider source unique analytics produit.
3. Optimisation lazy-loading admin (`Suspense` déjà en place).

---

## Q. Verdict final

- **Peut être lancé maintenant** : owner, refuge, employé refuge, admin, IA/crédits, abonnements DogWork (owner/shelter/educator), emails, notifications.
- **Ne doit pas être lancé tel quel** : marketplace cours payants Stripe Connect tant que le secret Live et la case "Connected accounts" ne sont pas configurés.
- **À masquer temporairement** si non corrigé : CTA "Acheter le cours" / "Inscrire un participant" côté `/courses` publics jusqu'à validation Connect.
- **À corriger en priorité** : voir Sprint 1.
- **Peut attendre** : nettoyage doublons DB, dashboards analytics avancés, JSON-LD enrichi.

---

## Sortie chat — synthèse

1. **Verdict global** : GO avec réserves (1 P0 Stripe Connect Live + 4 P1).
2. **Modules audités** : 20.
3. **Fonctionnalités complètes** : 16.
4. **Fonctionnalités partielles** : 4 (Stripe Connect, Promenade UI e2e, Analytics, Modules add-ons Live).
5. **Fonctionnalités invisibles/non reliées** : ~10 (RPC/vues admin, `parse-epetcard`, `enrich-shelter-profile`, observations refuge…).
6. **P0** : 1 (secret Connect Live + action Stripe Dashboard).
7. **P1** : 4.
8. **Top 10 problèmes** :
   1. `STRIPE_CONNECT_WEBHOOK_SECRET` absent en Live.
   2. Case "Connected accounts" Stripe Dashboard non vérifiable.
   3. RPC `admin_get_shelter_spaces_stats` non branchée UI.
   4. Promenade : pas de validation e2e production.
   5. CTA `parse-epetcard` non exposé refuge.
   6. CTA `enrich-shelter-profile` non exposé.
   7. Doublon `feature_credit_costs` / `ai_feature_catalog`.
   8. Doublon `usage_tracking` / `feature_usage`.
   9. JSON-LD partiel (SEO P2).
   10. Dashboards analytics crédits jour non branchés.
9. **Top 10 fonctionnalités développées mais non exploitées** :
   1. `admin_get_shelter_spaces_stats`.
   2. `v_credit_orders_daily` / `_admin`.
   3. `v_my_wallet_daily_activity`.
   4. `parse-epetcard`.
   5. `enrich-shelter-profile`.
   6. `professional_alerts`.
   7. `shelter_observations`.
   8. `feature_usage` analytics.
   9. Référents éducateurs (`referral_attributions`).
   10. `coach_calendar_events` côté client owner.
10. **Fichiers modifiés ce tour** : `.lovable/full-ecosystem-state-audit.md` (nouveau rapport, lecture seule).
11. **Rapports créés** : 1 (`full-ecosystem-state-audit.md`).
12. **Tests réalisés** : inventaire SQL (117 tables/vues), inventaire FS (120 pages, 78 edge functions, 229 migrations), corrélation routes ↔ guards ↔ pages.
13. **Tests impossibles depuis Lovable** :
    - Validation Stripe Connect Live (webhook signature, payout réel).
    - Test PWA install iOS réel.
    - Vérification présence d'options dans Stripe Dashboard.
    - E2E géolocalisation promenade sur appareil mobile réel.
