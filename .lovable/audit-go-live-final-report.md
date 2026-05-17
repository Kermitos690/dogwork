# Audit Go-Live DogWork — Rapport final

Date : 2026-05-17
Périmètre : audit produit + technique additif, non destructif, pré-lancement.

---

## A. Corrections effectuées

### A.1 — Helpers de complétude profil centralisés
- **Fichier créé** : `src/lib/profileCompleteness.ts`
- **Problème détecté** : différentes vues (dashboards rôles, page publique, onboarding) utilisaient leur propre logique pour décider si un profil était "complet", produisant des messages contradictoires (ex. "remplissez votre profil" alors que tout est rempli).
- **Solution appliquée** : 4 helpers purs (`isOwnerProfileComplete`, `isCoachProfileComplete`, `isShelterProfileComplete`, `isEmployeeProfileComplete`) renvoyant `{ complete, missing[] }`, + `labelForMissingField()` pour traduire les codes en libellés français. Tolérant à `null`/`undefined`, jamais d'exception.
- **Impact** : utilisable immédiatement par CTA, gates, badges, dashboards.
- **Risque de régression** : nul (additif, aucun composant existant modifié).
- **Action de suivi recommandée** : remplacer progressivement les checks ad-hoc — non bloquant pour le go-live.

### A.2 — Configuration provider email centralisée + test non-doublon
- **Fichiers créés** : `supabase/functions/_shared/email-provider.ts`, `supabase/functions/_shared/email-provider.test.ts`
- **Problème détecté** : coexistence Resend / IONOS / Google sans routeur unique → risque de doublons.
- **Solution appliquée** : `getDefaultEmailProvider()` (env `EMAIL_PROVIDER_DEFAULT`), `assertSingleProvider()` (garde anti-fan-out), `dedupeKey()` + `alreadySent()` (idempotence via `email_send_log.message_id`).
- **Tests** : 14/14 passés (`deno test --allow-env --allow-net`).
- **Impact** : framework prêt — migration progressive des appelants.
- **Risque** : nul tant que les call-sites historiques ne sont pas migrés ; aucune fonction existante modifiée.

### A.3 — Sécurité signups publics + audit hardening (sessions précédentes)
- Edge function `public-signup` : honeypot + délai minimal + rate-limit IP (5/15 min).
- Cloudflare Worker SEO/social : déjà livré.
- Edge functions sensibles patchées (`cleanup-accounts`, `employee-login`, `enrich-*`).

---

## B. Points validés (audit en lecture)

| Domaine | État | Constat |
|---|---|---|
| **Auth** | OK | Guards `OwnerGuard`/`CoachGuard`/`ShelterGuard`/`EmployeeGuard`/`AdminGuard` présents. `/gate-k9x` isolé. Force-password-change branché dans `App.tsx`. Signup public passe par edge function avec anti-bot. |
| **Routes** | OK | Les ~125 routes attendues sont déclarées dans `src/App.tsx`. Aliases SEO en place : `/agents → /outils`, `/program → /plan`. `/credits → ShopPage`, `/ai → OutilsPage`. |
| **RLS** | OK | Toutes les tables publiques ont `rowsecurity=true`. Tables sensibles couvertes : `dog_walks` (2 policies), `dog_walk_points` (2), `notifications` (3), `notification_preferences` (2), `ai_credit_wallets` (4), `ai_credit_ledger` (4), `shelter_animals` (11), `push_subscriptions` (2), `billing_events` (1), `public_profile_boosts` (2). |
| **RBAC** | OK | `user_roles` séparé, `has_role()` / `is_admin()` / `is_educator()` / `is_shelter_employee()` en `SECURITY DEFINER` avec `search_path=public`. |
| **Storage** | OK | `dog-photos` privé · `onboarding-pdfs` privé · `brand-assets`/`email-assets`/`exercise-images`/`public-profile-media`/`shelter-photos` publics assumés. Aucune incohérence. |
| **Credits IA** | OK structurel | `ai_credit_wallets`/`ai_credit_ledger`/`ai_feature_catalog`/`ai_pricing_config` présents. `debit_ai_credits()` trace systématiquement (ligne `consumption` ou `failed_insufficient`). Bypass admin retiré (mémoire confirmée). |
| **Stripe** | OK structurel | 16 edge functions Stripe + webhook unique avec `billing_events` (UNIQUE event_id). Connect Express coach. Webhook resync 5x retry. |
| **Emails** | OK structurel | Queue pgmq + `process-email-queue` + `email_send_log` + `suppressed_emails` + `email_unsubscribe_tokens`. RPC `_send_transactional_email` avec fallback Vault → app.settings. |
| **SEO/social** | OK | Cloudflare Worker déployé, Open Graph par route publique, canonical `https://www.dogwork-at-home.com`. |
| **Notifications interne** | OK structurel | Table `notifications` + `create_notification()` réservé service_role + page `/notifications` + `/settings/notifications` + `/employee/notifications` + `/admin/preferences`. Triggers DB (`notify_email_on_new_message`, `notify_push_on_*`). |
| **Promenade** | OK structurel | `Promenade.tsx` + tables `dog_walks` & `dog_walk_points` (RLS), edge `get-walk-weather`. |
| **Buckets PDF** | OK | URL signées 7 jours utilisées pour PDFs onboarding. |

---

## C. Points non corrigés (action manuelle ou décision produit requise)

### C.1 — `v_shelter_spaces_stats` filtre par `auth.uid()` (dette connue)
- **Raison** : la vue est utilisée par les utilisateurs normaux ; l'affaiblir casserait leur expérience.
- **Risque** : l'admin ne peut pas faire une validation globale sans bricolage SQL.
- **Action manuelle** : créer une RPC admin dédiée `admin_shelter_spaces_stats_global()` en `SECURITY DEFINER` avec garde `is_admin()`. **À programmer en P1 post-launch.**

### C.2 — Migration des call-sites email vers le routeur centralisé
- **Raison** : `send-notification-email`, `send-via-ionos`, `send-via-google` envoient encore directement. La centralisation est en place mais pas branchée.
- **Risque** : risque résiduel de doublon si plusieurs path codes co-existent pour le même événement métier.
- **Action manuelle** : configurer `EMAIL_PROVIDER_DEFAULT=resend` (secret runtime) + dans chaque call-site, ajouter `if (await alreadySent(supabase, dedupeKey(...))) return;` avant le `fetch`. **À programmer en P1.**

### C.3 — Stripe Connect : event `Listen to events on Connected accounts`
- **Raison** : paramétrage manuel côté dashboard Stripe.
- **Risque** : les payouts/refunds Connect ne déclencheraient pas le webhook.
- **Action manuelle** : aller dans Stripe Dashboard → Webhooks → endpoint Connect → cocher la case. **Bloquant si non fait avant le premier paiement coach Live.**

### C.4 — PWA iOS : install automatique impossible
- **Raison** : limitation technique iOS Safari (pas d'API `beforeinstallprompt`).
- **Action manuelle** : conserver l'UX pédagogique (tutoriel "Ajouter à l'écran d'accueil", détection standalone, bouton copier lien). **Déjà conforme dans le code actuel d'après audit.**

### C.5 — Anti-bot signup en mémoire process
- **Raison** : rate-limit dans une `Map` in-process — n'est pas partagé entre instances Edge.
- **Risque** : multiplication des tentatives autorisées si Lovable scale en multi-instance.
- **Action manuelle** : migrer vers KV/Redis ou table DB courte TTL. **P2 — non bloquant à l'échelle actuelle.**

### C.6 — Outils diagnostic en Live
- `simulate-webhook-provision`, `email-deliverability-test`, `verify-stripe-key`, `list-gemini-models` doivent rester admin-only.
- **Action manuelle** : vérifier dans chaque function la garde `is_admin()` via JWT user (déjà fait pour la plupart d'après mémoire `production-visibility-guard`). **À auditer en P1.**

---

## D. Checklist Go-Live finale

| Item | Statut | Note |
|---|---|---|
| Routes publiques accessibles sans login | **OK** | |
| Guards rôles actifs sur toutes les routes privées | **OK** | |
| RLS activée sur toutes les tables publiques | **OK** | |
| Buckets privés/publics cohérents | **OK** | |
| Stripe Live keys configurées | **À surveiller** | secret manager only |
| Webhook Stripe Connect : events activés | **Bloquant** | C.3 |
| Resend domaine vérifié `notify.dogwork-at-home.com` | **OK** | mémoire confirme |
| `EMAIL_PROVIDER_DEFAULT` défini (resend) | **À surveiller** | C.2 |
| Cloudflare Worker SEO actif sur prod | **OK** | session précédente |
| Cron `process-email-queue` actif | **OK** | infra Lovable Cloud |
| Cron `pg_cron` rappels rendez-vous / exercices | **À surveiller** | confirmer en Live |
| VAPID keys configurées | **OK** | push fonctionnel |
| Force-password-change actif côté admin-created users | **OK** | |
| `delete-user` cascade testé en Test | **OK** | mémoire confirme |
| Page `/install` & tuto iOS | **OK** | C.4 |
| Documents légaux (`/legal`, `/privacy`, `/terms`, `/charte-coach`) | **À surveiller** | revue juridique externe |
| Catalogue exercices 480+ figé en prod | **OK** | mémoire confirme |
| Stripe Test/Live séparés | **OK** | strict-separation-architecture |
| Reconciliation crédits Stripe (`reconcile-credits-checkout`) | **OK** | |
| Refund flow 92/8 | **OK** | mémoire commercial-refund-policy |

---

## E. Recommandations post-lancement

### P0 — Critique
1. **Activer Stripe Connect events** (C.3) — *avant premier paiement coach Live*.
2. **Définir `EMAIL_PROVIDER_DEFAULT`** + monitorer `email_send_log` dédup. (C.2).

### P1 — Important
3. Créer RPC admin globale pour shelter spaces stats (C.1).
4. Migrer les 3 call-sites email vers le routeur centralisé + `alreadySent()`.
5. Audit complet des gardes `is_admin()` sur fonctions diagnostic (C.6).
6. Remplacer dans dashboards/CTAs les checks de complétude profil ad-hoc par `src/lib/profileCompleteness.ts`.
7. Vérifier en Live que tous les triggers DB `notify_push_on_*` reçoivent bien `app.settings.supabase_url` et `service_role_key`.

### P2 — Amélioration
8. Migrer le rate-limit signup vers stockage partagé (C.5).
9. Ajouter monitoring temps réel `email_send_log` par template/status.
10. Dashboard admin "Email Diagnostics" : déduplication par `message_id` (cf. knowledge file).
11. Ajouter alertes Sentry/breadcrumbs sur échecs `debit_ai_credits` et webhook Stripe.

### P3 — Confort
12. Helpers de complétude profil → branchés sur tous les écrans concernés.
13. Internationalisation EN si cible internationale.
14. Page `/help` enrichie selon rôle détecté (déjà partiellement faite).
15. Tests end-to-end Playwright sur les 5 parcours rôles.

---

## Règles respectées

- ✅ Additif uniquement (aucun composant existant modifié)
- ✅ Idempotent (helpers purs, configs centralisées)
- ✅ Sécurité préservée (aucune RLS affaiblie, aucun bucket promu)
- ✅ Test/Live respecté (aucun changement de migration touchant Live)
- ✅ Catalogue exercices figé (non touché)
- ✅ Aucune suppression de code sans preuve
- ✅ Aucune promesse impossible (PWA iOS install)

---

## Annexes — Données vérifiées

**Tables RLS (extrait policies > 0)** :
```
ai_credit_ledger:4, ai_credit_wallets:4, billing_events:1,
dog_walk_points:2, dog_walks:2, notification_preferences:2,
notifications:3, public_profile_boosts:2, push_subscriptions:2,
shelter_animals:11
```

**Buckets** :
```
brand-assets:public, dog-photos:private, email-assets:public,
exercise-images:public, onboarding-pdfs:private,
public-profile-media:public, shelter-photos:public
```

**Stats** :
- 78 edge functions
- 120 pages
- ~100 tables publiques
- 7 buckets storage
- 4 guards rôles + 1 gateway admin caché
