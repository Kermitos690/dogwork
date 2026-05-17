# DogWork — Validation finale post-config Stripe Live

Date : 2026-05-17
Mode : non destructif, lecture seule + tests d'authentification ciblés.

---

## A. Verdict final

# ⚠️ GO avec réserve

Le code et la sécurité sont prêts. **Un secret critique manque
encore** côté backend (`STRIPE_CONNECT_WEBHOOK_SECRET`). Les paiements
plateforme (abonnements, crédits) peuvent fonctionner, mais le webhook
Connect (paiement de cours / payouts éducateurs) n'aura **aucune signature
valide** et tous ses events seront rejetés en 400. Bloquant pour la
marketplace coachs.

Une fois ce secret renseigné, le verdict passe à **GO**.

---

## B. Secrets — état présent / absent (valeurs jamais exposées)

| Secret | Statut | Commentaire |
|--------|--------|-------------|
| `STRIPE_SECRET_KEY` | ✅ présent | Géré côté plateforme. Mode live/test non vérifiable sans exposer la valeur — à confirmer manuellement dans le dashboard Lovable Cloud (préfixe attendu `sk_live_…` en Live). |
| `STRIPE_WEBHOOK_SECRET` | ✅ présent | OK pour `stripe-webhook` (plateforme). |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | ❌ **ABSENT** | **Bloquant Connect.** À renseigner depuis Stripe Dashboard → Webhook Connect → Signing secret. |
| `CRON_SECRET` | ❌ absent | Non bloquant. Requis uniquement si `cleanup-live-ai-credit-orphans` est déclenchée par un cron automatisé. Le mode admin-JWT fonctionne sans. |
| `LIVE_SERVICE_ROLE_KEY` | ✅ présent | Utilisée par les fonctions de sync admin et `cleanup-live-ai-credit-orphans` (désormais gardée). |
| `RESEND_API_KEY` | ✅ présent | Email router opérationnel. |
| `EMAIL_PROVIDER_DEFAULT` | ❌ absent | Non bloquant : fallback `resend` appliqué automatiquement. À fixer en Live pour figer le routing. |

⚠️ Les secrets listés sont ceux visibles depuis l'environnement courant
(Test / Preview). Au publish, ils sont copiés vers Live s'ils n'y existent
pas déjà. **Vérifier explicitement** dans Cloud View → Secrets (Live) que
`STRIPE_CONNECT_WEBHOOK_SECRET` y est bien présent, sinon les events
Connect resteront rejetés en Live.

---

## C. Stripe principal (plateforme)

| Élément | Statut | Note |
|---------|--------|------|
| `stripe-webhook` | ✅ code OK | Vérification signature, idempotence `billing_events.stripe_event_id`, écritures `ai_credit_wallets` / `ai_credit_ledger` correctes. |
| `create-checkout` | ✅ code OK | Auth JWT requise, secrets via env. |
| `create-credits-checkout` | ✅ code OK | Idem. |
| `customer-portal` | ✅ code OK | Idem. |
| `check-subscription` | ✅ code OK | Refresh côté serveur. |
| Achat abonnement réel (E2E) | ⚠️ **non vérifiable depuis Lovable** | À tester en Live via Stripe Dashboard → Send test webhook ou achat réel de test. |
| Double crédit sur event rejoué | ✅ protégé | Court-circuit ligne 181-189 de `stripe-webhook` (lookup `billing_events` puis return `skipped`). |
| Logs production | ℹ️ aucun event reçu à ce jour | Confirmer en faisant un premier achat de test, ou en utilisant « Send test webhook » depuis Stripe Dashboard. |

---

## D. Stripe Connect

| Élément | Statut | Note |
|---------|--------|------|
| `stripe-course-webhook` | ✅ code OK | Priorité `STRIPE_CONNECT_WEBHOOK_SECRET`, fallback `STRIPE_WEBHOOK_SECRET`. Idempotence `billing_events`. Events gérés : `checkout.session.completed`, `charge.refunded`, `account.updated`. |
| `connect-onboard` / `connect-status` / `connect-dashboard` | ✅ présents | Non re-testés cette passe (déjà audités précédemment). |
| `STRIPE_CONNECT_WEBHOOK_SECRET` configuré | ❌ **non détecté** | **Bloquant.** Sans ce secret, le webhook utilisera le fallback plateforme ; si la signature ne matche pas (cas le plus probable), tous les events Connect seront rejetés. |
| Flag « Listen to events on Connected accounts » | ❓ **non vérifiable depuis Lovable** | Action manuelle obligatoire dans Stripe Dashboard. |
| Test E2E paiement de cours | ⚠️ **non vérifiable depuis Lovable** | À faire après ajout du secret, avec un compte connecté en mode test. |
| Logs production | ℹ️ aucun event reçu en Live | Cohérent avec config Connect non finalisée. |

---

## E. Sécurité `cleanup-live-ai-credit-orphans`

Tests réels exécutés à l'instant via curl edge function (LIVE) :

| Cas de test | Attendu | Résultat |
|-------------|---------|----------|
| POST sans Authorization | `401 Unauthorized` | ✅ `401 {"error":"Unauthorized"}` |
| POST avec Bearer invalide + mauvais `x-cron-secret` | `401 Unauthorized` | ✅ `401 {"error":"Unauthorized"}` |
| POST avec JWT admin valide | `200 success` | ⚠️ non rejoué (effets destructifs sur LIVE — à exécuter uniquement à la demande). |
| POST avec `x-cron-secret` valide | `200 success` | ⚠️ non testable : `CRON_SECRET` non défini. |

**Conclusion** : la faille critique de la passe précédente est corrigée. La
fonction refuse correctement les appels anonymes et les credentials
incorrects.

---

## F. Admin / diagnostics

| Élément | Statut |
|---------|--------|
| 14 Edge Functions admin gardées (JWT + `has_role('admin')` / `is_admin`) | ✅ confirmé (cf. tableau B.4 du rapport précédent) |
| `admin_get_shelter_spaces_stats()` | ✅ `SECURITY DEFINER` + `search_path` + gate `has_role` + `REVOKE FROM PUBLIC` |
| Routes UI `/admin`, `/admin/diagnostics`, `/admin/stripe`, `/admin/credits` | ✅ couvertes par `AdminGuard` (`is_admin` RPC) → redirection `/access-denied` sinon |
| Aucun secret loggé | ✅ vérifié dans les fonctions diagnostics |

---

## G. Profils publics

| Élément | Statut |
|---------|--------|
| `PublicProfileManager` auto-création brouillon | ✅ |
| `profileCompleteness.ts` helpers centralisés | ✅ |
| Faux blocage « profil incomplet » sur owner / educator / shelter / employee | ✅ aucun détecté |
| Routes `/profile`, `/settings`, `/public-profile` | ✅ accessibles |

---

## H. Notifications / préférences

| Élément | Statut |
|---------|--------|
| Routes `/preferences`, `/notifications` | ✅ accessibles sans dépendance au profil public |
| `push_subscriptions` / `notification_preferences` | ✅ pas de couplage avec la complétude profil |
| VAPID + email router opérationnels | ✅ secrets présents (`VAPID_*`, `RESEND_API_KEY`) |

---

## I. Erreurs restantes

| Type | Sévérité | Détail |
|------|----------|--------|
| Secret manquant `STRIPE_CONNECT_WEBHOOK_SECRET` | 🔴 critique pour Connect | Webhook Connect inopérant tant que non renseigné. |
| Secret optionnel `CRON_SECRET` | 🟡 faible | Bloque uniquement l'usage automatisé de `cleanup-live-ai-credit-orphans`. |
| Secret optionnel `EMAIL_PROVIDER_DEFAULT` | 🟢 négligeable | Fallback `resend` appliqué. |
| Mode `STRIPE_SECRET_KEY` (live vs test) non vérifiable depuis Lovable | 🟡 à vérifier | Doit être `sk_live_…` en Live. |
| Flag « Listen to events on Connected accounts » côté Stripe Dashboard | 🟡 à vérifier | Non vérifiable depuis Lovable. |

---

## J. Actions nécessaires avant ouverture publique

### Bloquant
1. **Ajouter `STRIPE_CONNECT_WEBHOOK_SECRET`** en Live (Cloud View → Secrets).
   Valeur : signing secret de l'endpoint Connect créé dans Stripe Dashboard.
2. **Confirmer dans Stripe Dashboard** que l'endpoint `stripe-course-webhook`
   a bien la case « Listen to events on Connected accounts » cochée
   (impossible à vérifier depuis Lovable).
3. **Confirmer** que `STRIPE_SECRET_KEY` côté Live commence par `sk_live_`
   (ouvrir Cloud View → Secrets → Live).

### Recommandé
4. Renseigner `EMAIL_PROVIDER_DEFAULT=resend` en Live pour figer le routing.
5. Si la fonction `cleanup-live-ai-credit-orphans` doit tourner en cron,
   renseigner `CRON_SECRET` puis configurer un pg_cron envoyant
   `x-cron-secret`.

### Tests post-config (à faire en Live)
- « Send test webhook » depuis l'endpoint plateforme → ligne attendue dans
  `billing_events` avec `processing_status=processed`.
- « Send test webhook » depuis l'endpoint Connect avec un compte connecté
  test → ligne dans `billing_events` avec `connected_account` rempli.
- Rejouer le même event → réponse `200 skipped`, aucune double écriture
  dans `ai_credit_ledger`.

---

## Bilan

| Volet | Statut |
|-------|--------|
| Code | ✅ prêt |
| Sécurité Edge Functions | ✅ prêt |
| Stripe plateforme | ✅ prêt (sous réserve clé `sk_live_`) |
| Stripe Connect | ❌ secret manquant |
| Admin / diagnostics | ✅ prêt |
| Profil public / préférences | ✅ prêt |

**Ouverture publique non recommandée** tant que
`STRIPE_CONNECT_WEBHOOK_SECRET` n'est pas renseigné en Live, sauf si la
marketplace coachs est désactivée commercialement au lancement.
