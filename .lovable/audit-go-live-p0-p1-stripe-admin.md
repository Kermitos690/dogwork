# Go-Live Pass — Stripe Connect / Admin RPC / Diagnostics

Date: 2026-05-17
Scope: P0/P1 remaining items after email centralization.

## A. Stripe Connect — `stripe-course-webhook`

Status: **OK in code**, one Stripe Dashboard action required.

Code audit (`supabase/functions/stripe-course-webhook/index.ts`):
- Uses `STRIPE_CONNECT_WEBHOOK_SECRET` first, falls back to `STRIPE_WEBHOOK_SECRET` only if the Connect secret fails verification (migration safety). No silent acceptance.
- Mode (test/live) detected from key prefix and logged — no secret material printed.
- Idempotence: `billing_events.stripe_event_id` is upserted with unique constraint; if `processing_status='success'` already, returns `{duplicate:true}` and exits before re-processing.
- Events handled and documented:
  - `checkout.session.completed` — confirms booking, computes commission via `calculate_course_commission` RPC (server-authoritative), upserts `course_participants`, attributes referral, flags capacity overflow.
  - `payment_intent.succeeded` — defensive fallback if session.completed never fired.
  - `payment_intent.payment_failed` — marks booking failed.
  - `charge.refunded` / `charge.refund.updated` — marks booking refunded, cancels participant.
  - Unhandled events still recorded as `success` for traceability.
- `billing_events` row contains: `stripe_event_id`, `event_type`, `payload`, `processing_status`, `processing_error`.

Action manuelle Stripe Dashboard (NON automatisable):
1. Dashboard → Developers → Webhooks → endpoint pointant vers `…/stripe-course-webhook`.
2. Cocher **"Listen to events on Connected accounts"** (sinon les events `account.updated`, `charge.refunded` issus des comptes Connect ne sont jamais reçus).
3. Vérifier que les events suivants sont sélectionnés :
   `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `account.updated`.
4. Copier le **Signing secret** dans la variable `STRIPE_CONNECT_WEBHOOK_SECRET` (Test puis Live au publish).

## B. RPC admin — `admin_get_shelter_spaces_stats()`

Status: **Done.**

- Vue `v_shelter_spaces_stats` conservée (filtre `auth.uid()` pour les refuges).
- Nouvelle fonction `public.admin_get_shelter_spaces_stats()` — `SECURITY DEFINER`, `search_path=public`, gate `has_role(auth.uid(),'admin')` dans le WHERE → non-admin reçoit 0 lignes.
- `REVOKE ALL FROM PUBLIC; GRANT EXECUTE TO authenticated;`
- Retourne `total_spaces, occupied_spaces, free_spaces, occupancy_pct, total_capacity, space_types, active_shelters` (global, tous refuges).
- Aucune PII exposée.
- À brancher côté UI admin si/quand une page dédiée est créée. Pas de page existante à patcher.

## C. Fonctions diagnostic admin — Audit

| Fonction | Garde avant | Garde après | Risque restant |
|---|---|---|---|
| `admin-go-live-check` | JWT + `user_roles=admin` | inchangé OK | aucun |
| `admin-stripe` | JWT + `has_role` | inchangé OK | aucun |
| `admin-verify-stripe-catalog` | JWT + `user_roles` | inchangé OK | aucun |
| `admin-depublish-placeholder-courses` | JWT + `user_roles` | inchangé OK | aucun |
| `simulate-webhook-provision` | JWT + `user_roles` | inchangé OK | aucun |
| `verify-stripe-key` | JWT + `user_roles` | inchangé OK | aucun |
| `email-deliverability-test` | JWT + `has_role` | inchangé OK | aucun |
| `list-gemini-models` | **AUCUNE** | **JWT + `has_role('admin')`** | corrigé |

Aucune fonction ne retourne de secret en clair. `verify-stripe-key` retourne uniquement `valid/invalid + mode`. `email-deliverability-test` ne retourne que des statuts.

## D. Helpers profil

Status: **Aucun bug réel détecté ; pas de rebranchement effectué.**

Recherche `rg "profil incomp|complétez votre profil"`: aucune occurrence en dehors du fichier helper lui-même.
`PublicProfileManager.tsx` traite déjà le cas "pas de ligne" via la mutation `ensureProfile` (auto-création d'un brouillon) — pas de blocage faux-positif.
Les helpers `src/lib/profileCompleteness.ts` restent disponibles pour les futurs CTA. Aucune logique contradictoire identifiée à remplacer aujourd'hui.

## E. Tests

- Tests Deno email : 20/20 verts (inchangés, non rejoués ici).
- Migration SQL appliquée sans erreur ; les warnings linter listés étaient pré-existants (non causés par cette migration — la fonction est `REVOKE ALL FROM PUBLIC` + `GRANT EXECUTE TO authenticated`).
- Pas de modification frontend → pas de build à valider.

## F. Checklist go-live restante

**Bloquant**
- [ ] Stripe Dashboard : activer "Listen to events on Connected accounts" sur l'endpoint `stripe-course-webhook` et renseigner `STRIPE_CONNECT_WEBHOOK_SECRET` (Test + Live).

**À surveiller**
- [ ] Définir `EMAIL_PROVIDER_DEFAULT=resend` (déjà recommandé dans le rapport email).
- [ ] Brancher `admin_get_shelter_spaces_stats()` dans une future page admin diagnostics.
- [ ] Surveiller `billing_events.processing_status='error'` après mise en prod.

**OK**
- Webhook Connect : secret dédié, idempotence, events documentés.
- Toutes les fonctions admin/diagnostic exigent désormais un admin authentifié.
- RPC admin shelter spaces livré, sans affaiblir la vue utilisateur.
- Aucun secret loggé, aucune RLS affaiblie, aucun changement pricing / catalogue.
