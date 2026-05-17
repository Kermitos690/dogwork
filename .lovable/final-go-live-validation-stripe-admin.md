# DogWork — Validation finale Go-Live (Stripe / Admin / Profil)

Date : 2026-05-17  
Périmètre : passe finale après la correction P0/P1 documentée dans
`.lovable/audit-go-live-p0-p1-stripe-admin.md`.  
Mode : non destructif, additif, idempotent.

---

## A. Résumé exécutif

La chaîne Stripe (plateforme + Connect), la sécurité admin et la gestion de
profil sont **prêtes pour la production**, sous réserve de **3 actions
manuelles externes** (Stripe Dashboard + 1 secret Supabase).

Une **faille critique** a été détectée et corrigée dans cette passe :
`cleanup-live-ai-credit-orphans` était exposée sans authentification et
exécutait des `DELETE` sur la base LIVE via `LIVE_SERVICE_ROLE_KEY`.

**Verdict : GO avec actions manuelles.**

---

## B. Ce qui est confirmé OK (vérifié en code)

### B.1 Stripe plateforme (`stripe-webhook`)
- ✅ Vérification de signature via `STRIPE_WEBHOOK_SECRET`.
- ✅ Détection automatique du mode (live/test) à partir du préfixe de
  `STRIPE_SECRET_KEY`.
- ✅ Idempotence : lookup `billing_events` par `stripe_event_id`, court-circuit
  immédiat si déjà traité (lignes 181-189).
- ✅ Écritures `billing_events` (insert initial puis updates `processing_status`
  / `processing_error`) sur tous les events traités.
- ✅ Écritures `ai_credit_wallets` / `ai_credit_ledger` cohérentes pour les
  packs (lignes ~220-310).
- ✅ Aucun secret hardcodé, aucune URL projet Test hardcodée dans la fonction.

### B.2 Stripe Connect (`stripe-course-webhook`)
- ✅ Priorité `STRIPE_CONNECT_WEBHOOK_SECRET` puis fallback
  `STRIPE_WEBHOOK_SECRET` (documenté, non dangereux : si l'un valide la
  signature, l'event est légitime).
- ✅ Idempotence `billing_events.stripe_event_id` (upsert + check, lignes 36-44
  et 119-121).
- ✅ Events gérés : `checkout.session.completed`, `charge.refunded`,
  `account.updated`. Les autres sont loggés comme « Unhandled » sans erreur
  (cf. logs : `payment_intent.created` / `payment_intent.canceled` ignorés
  proprement, statut 200).
- ✅ Aucun secret hardcodé, mode live/test détecté depuis la clé.

### B.3 Checkout / Portal / Subscription
- `create-checkout` (123 LOC), `create-credits-checkout` (134 LOC),
  `customer-portal` (83 LOC), `check-subscription` (221 LOC) : aucun secret
  hardcodé, validation `Authorization` présente, clés lues via `Deno.env`.

### B.4 Sécurité admin Edge Functions
| Fonction                              | JWT  | `has_role('admin')`     | Statut  |
|---------------------------------------|------|-------------------------|---------|
| `admin-stripe`                        | ✅   | ✅ (RPC `has_role`)      | OK      |
| `admin-go-live-check`                 | ✅   | ✅ (table `user_roles`)  | OK      |
| `admin-verify-stripe-catalog`         | ✅   | ✅                       | OK      |
| `admin-depublish-placeholder-courses` | ✅   | ✅                       | OK      |
| `cleanup-accounts`                    | ✅   | ✅ (RPC `is_admin`)      | OK      |
| `verify-stripe-key`                   | ✅   | ✅                       | OK      |
| `simulate-webhook-provision`          | ✅   | ✅                       | OK      |
| `sync-from-test`                      | ✅   | ✅ (ou CRON secret)      | OK      |
| `sync-enriched-exercises`             | ✅   | ✅                       | OK      |
| `sync-pricing-to-live`                | ✅   | ✅ (ou `x-admin-secret`) | OK      |
| `sync-templates-to-live`              | ✅   | ✅                       | OK      |
| `post-publish-sync`                   | ✅   | ✅ (ou service-role)     | OK      |
| `list-gemini-models`                  | ✅   | ✅                       | OK (corrigée passe précédente) |
| **`cleanup-live-ai-credit-orphans`**  | ❌→✅ | ❌→✅                    | **CORRIGÉE ce tour** |

### B.5 `admin_get_shelter_spaces_stats()`
- ✅ `SECURITY DEFINER` + `SET search_path = public`.
- ✅ Gate `WHERE public.has_role(auth.uid(), 'admin'::public.app_role)` →
  retourne zéro lignes pour un non-admin.
- ✅ `REVOKE ALL FROM PUBLIC` + `GRANT EXECUTE TO authenticated`.
- ✅ Aucune donnée personnelle exposée (agrégats par refuge uniquement).
- ✅ Vue existante `v_shelter_spaces_stats` non touchée → pas de régression
  pour le refuge propriétaire.

### B.6 Profil / brouillon public
- `PublicProfileManager` : auto-création du brouillon via `ensureProfile`,
  helpers `profileCompleteness.ts` centralisés.
- Aucun guard ne pose de faux blocage « profil incomplet » sur les rôles
  owner / educator / shelter.
- Routes vérifiées : `/profile`, `/settings`, `/public-profile`,
  `/coach/profile`, `/shelter/profile`. Aucune n'oblige une complétion avant
  l'accès à Préférences / Notifications.
- Préférences (`/preferences`, `/notifications`) et push subscriptions ne sont
  pas conditionnées au profil public.

---

## C. Ce qui a été corrigé dans cette passe

### C.1 `cleanup-live-ai-credit-orphans` — CRITIQUE
**Problème détecté** : la fonction acceptait n'importe quel POST anonyme et
exécutait `DELETE FROM ai_credit_ledger` + `DELETE FROM ai_credit_wallets`
sur la base **LIVE** via `LIVE_SERVICE_ROLE_KEY`. Un attaquant connaissant
l'URL de la fonction pouvait vider la table des crédits.

**Correction** (additive, non destructive) :
- Ajout d'un guard `Authorization: Bearer <JWT>` + vérification
  `user_roles.role = 'admin'` via service role local.
- Fallback `x-cron-secret` vs `CRON_SECRET` pour autoriser un cron automatisé
  côté serveur uniquement.
- Aucune modification du comportement de cleanup ; seules les autorisations
  changent.

Fichier modifié : `supabase/functions/cleanup-live-ai-credit-orphans/index.ts`.

---

## D. Actions manuelles restantes (externes à Lovable)

Ces actions **ne sont pas vérifiables depuis le code** : elles doivent être
faites dans le Dashboard Stripe et dans Supabase Cloud Secrets.

### D.1 Stripe Dashboard — endpoint principal (plateforme)
- URL : `https://<project>.functions.supabase.co/stripe-webhook`
- Mode : **Live**
- Events recommandés :
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
- Secret généré → à coller dans Supabase secret : `STRIPE_WEBHOOK_SECRET`.

### D.2 Stripe Dashboard — endpoint Connect (cours/marketplace)
- URL : `https://<project>.functions.supabase.co/stripe-course-webhook`
- Mode : **Live**
- ☑️ **Cocher « Listen to events on Connected accounts »** ← OBLIGATOIRE
- Events recommandés :
  - `checkout.session.completed`
  - `charge.refunded`
  - `account.updated`
- Secret généré → à coller dans Supabase secret :
  `STRIPE_CONNECT_WEBHOOK_SECRET`.

### D.3 Test minimal recommandé
1. Côté plateforme : `stripe trigger checkout.session.completed` → vérifier
   apparition de la ligne dans `billing_events` (`processing_status=processed`).
2. Côté Connect : créer un compte test, déclencher un `checkout.session.completed`
   sur le compte connecté → vérifier la ligne `billing_events` + champ
   `connected_account` rempli.
3. Idempotence : rejouer le même event → la fonction doit répondre `200
   skipped` sans double traitement.

---

## E. Risques résiduels

| Risque | Sévérité | Mitigation |
|--------|----------|-----------|
| `STRIPE_CONNECT_WEBHOOK_SECRET` non renseigné → fallback sur `STRIPE_WEBHOOK_SECRET` | Moyen | Documenté ; les events Connect resteront ignorés tant que le secret n'est pas configuré. Vérifier dans Stripe Dashboard que l'endpoint Connect remonte des events. |
| `LIVE_SERVICE_ROLE_KEY` présent dans les secrets et utilisable depuis Test pour écrire en Live | Moyen | Limité aux fonctions admin gardées. Recommandation : rotater en cas de doute. |
| `sync-from-test` / `post-publish-sync` contiennent une URL Test hardcodée | Faible | Intentionnel (source Test → cible Live), fonctions admin-only. |
| `dev-login` activable en preview | Faible | Bloquée sur les hosts `dogwork-at-home.com` + flag `DEV_LOGIN_ENABLED`. |

---

## F. Tests à effectuer en production (après publish)

1. **Auth** : signup email → réception PDF + login.
2. **Subscription** : checkout Pro / Expert → `check-subscription` reflète le
   plan, `subscribers` mis à jour.
3. **Crédits** : checkout pack 50/150/500 → wallet créditée, ledger inséré,
   `billing_events.processing_status='processed'`.
4. **Connect** : achat d'un cours → split paiement éducateur + commission
   plateforme visible dans `billing_events` avec `connected_account`.
5. **Refund** : remboursement Stripe → ligne `charge.refunded` traitée.
6. **Admin** : `/admin/diagnostics` → `admin-go-live-check` retourne
   `ready=true` après config webhook Connect.
7. **Idempotence** : rejouer un webhook depuis Stripe Dashboard → réponse
   `skipped` sans effet de bord.

### Tests impossibles depuis Lovable
- Vérifier la config réelle de l'endpoint Stripe Dashboard (events cochés,
  flag « Listen on Connected accounts »).
- Vérifier que les secrets Live (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `STRIPE_CONNECT_WEBHOOK_SECRET`) sont effectivement renseignés en
  environnement Live.

---

## G. Checklist Go-Live finale

**Bloquant (à faire avant lancement)**
- [ ] Stripe Dashboard : créer endpoint `stripe-webhook` Live + récupérer secret.
- [ ] Stripe Dashboard : créer endpoint `stripe-course-webhook` Live + cocher
      « Listen to events on Connected accounts ».
- [ ] Supabase Secrets Live : `STRIPE_SECRET_KEY` (sk_live_…),
      `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`.
- [ ] Supabase Secrets Live : `EMAIL_PROVIDER_DEFAULT` (= `resend`),
      `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.

**À surveiller (J+1 → J+7)**
- [ ] `billing_events` : taux d'événements `processed` vs `error`.
- [ ] `email_send_log` : taux `sent` vs `failed`, doublons inter-provider.
- [ ] Logs `stripe-webhook` / `stripe-course-webhook` : signatures invalides.
- [ ] Dashboard admin : `ready=true` dans `admin-go-live-check`.

**OK (vérifié)**
- [x] RLS active sur toutes les tables sensibles.
- [x] Toutes les Edge Functions admin/diagnostic gardées par JWT + admin.
- [x] `cleanup-live-ai-credit-orphans` désormais protégée.
- [x] `admin_get_shelter_spaces_stats` sécurisée.
- [x] Stripe webhooks idempotents.
- [x] Email router centralisé (`getDefaultEmailProvider`, `assertSingleProvider`,
      `alreadySent`).
- [x] Profil public : aucun faux blocage détecté.

---

## H. Verdict

# ✅ GO avec actions manuelles

Le code DogWork est prêt pour la production. Les **3 secrets Stripe Live** et
la **configuration des deux endpoints webhook dans Stripe Dashboard**
(notamment le flag « Listen on Connected accounts ») doivent être réalisés
manuellement avant ouverture commerciale.

Une fois ces actions faites, lancer la suite de tests décrite en section F
pour valider la chaîne complète en conditions réelles.
