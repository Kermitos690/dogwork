# Phase B — Protocole d'exécution strict (LIVE)

> **Règle d'or :** chaque étape se valide par requête SQL en LIVE avant de passer à la suivante. Aucune affirmation sans preuve.

## Pré-requis

1. Tu es admin DogWork.
2. Tu ouvres `/admin/sql-live-runner` dans l'app **publiée** (`www.dogwork-at-home.com`) — surtout pas en preview.
3. Pour chaque étape : colle **uniquement** le contenu du fichier indiqué, lance, puis dis-moi "L1 fait" / "L2 fait" etc. Je relance les vérifs LIVE après chaque.

---

## Ordre obligatoire

### ▶ L1 — `has_role` GRANT EXECUTE

| Champ | Valeur |
|---|---|
| Fichier | `.lovable/phase-b-L1-has-role-grant.sql` |
| Effet | 2 GRANTs sur `public.has_role(uuid, app_role)` |
| Risque | Nul (additif, idempotent) |
| Preuve avant | `has_function_privilege('authenticated', …) = false` |
| Preuve après (je vérifie) | `has_function_privilege('authenticated', …) = true` |

### ▶ L5 — Cron jobs manquants

| Champ | Valeur |
|---|---|
| Fichier | `.lovable/phase-b-live-fix-v2.sql` |
| Effet | Crée `pgmq.q_auth_emails` (utile pour L3) + 5 cron jobs |
| Risque | Faible (idempotent, garde-fou anti-Preview en tête de script) |
| Preuve avant | `cron.job` = 1 job (`process-email-queue`) |
| Preuve après (je vérifie) | `cron.job` = 6 jobs, tous `active=true` |

### ▶ L2 — Realtime publication

| Champ | Valeur |
|---|---|
| Fichier | `.lovable/phase-b-L2-realtime-publication.sql` |
| Effet | Ajoute `notifications`, `messages`, `notification_logs` à `supabase_realtime` |
| Risque | Nul (additif) |
| Preuve avant | `pg_publication_tables WHERE pubname='supabase_realtime'` = 0 lignes |
| Preuve après (je vérifie) | 3 tables listées |
| Test fonctionnel | Tu insères une notif test via `/admin/push-status` → tu dois voir le toast apparaître sans recharger |

### ▶ L3 — Queue email

| Champ | Valeur |
|---|---|
| Fichier | `.lovable/phase-b-L3-email-queue.sql` |
| Effet | Crée `pgmq.q_auth_emails` (si pas déjà créée par L5) + initialise `email_send_state` id=1 |
| Pourquoi | Le cron `process-email-queue` crashe toutes les 5 sec depuis 10+ jours sur `EXISTS SELECT 1 FROM pgmq.q_auth_emails` car cette queue n'existe pas → la branche `THEN net.http_post(...)` n'est jamais atteinte → les 20 messages déjà dans `pgmq.q_transactional_emails` ne sont jamais dépilés. |
| Risque | Nul (aucune donnée supprimée) |
| Preuve avant | `pgmq.q_transactional_emails` = 20 messages, `email_send_log.status='sent'` = 0 |
| Preuve après (je vérifie à T+5 min) | `pgmq.q_transactional_emails` < 20 et `email_send_log.status='sent'` > 0 |

### ▶ L4 — Stripe webhook LIVE (manuel Dashboard Stripe)

Je ne peux pas configurer Stripe à ta place. Checklist exhaustive :

#### 1. Endpoint principal (subscriptions/checkout)
- Dashboard Stripe (**Mode Live**, pas Test) → Developers → Webhooks → Add endpoint
- URL : `https://hdmmqwpypvhwohhhaqnf.supabase.co/functions/v1/stripe-webhook`
- Events à cocher :
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `charge.refunded`
- Récupère le **Signing secret** → dans Lovable Cloud, mets-le dans `STRIPE_WEBHOOK_SECRET`.

#### 2. Endpoint Connect (éducateurs)
- Même Dashboard → Webhooks → Add endpoint
- URL : `https://hdmmqwpypvhwohhhaqnf.supabase.co/functions/v1/stripe-course-webhook`
- Events à cocher :
  - `checkout.session.completed`
  - `payment_intent.succeeded`
  - `charge.refunded`
  - `account.updated`
- ⚠ **OBLIGATOIRE** : coche **"Listen to events on Connected accounts"** dans l'écran de création.
- Récupère le Signing secret → dans Lovable Cloud, crée/écrase `STRIPE_CONNECT_WEBHOOK_SECRET`.

#### 3. Test webhook
- Stripe Dashboard → ton endpoint principal → "Send test webhook" → choisis `checkout.session.completed` → Send.
- Tu me dis "L4 test envoyé" et je vérifie en LIVE :
  ```sql
  SELECT stripe_event_id, event_type, processing_status, created_at
  FROM billing_events ORDER BY created_at DESC LIMIT 5;
  ```
- Attendu : au moins 1 ligne avec `event_type='checkout.session.completed'`, `processing_status='completed'`.

---

## Rapport final (je le complète au fur et à mesure)

| ID | Blocant | Correction appliquée | Preuve LIVE | Risque restant | Action manuelle |
|----|---------|---------------------|-------------|----------------|-----------------|
| L1 | has_role non exécutable | GRANT EXECUTE × 2 | _(en attente)_ | aucun | aucune |
| L5 | 4 crons manquants | `phase-b-live-fix-v2.sql` | _(en attente)_ | aucun | aucune |
| L2 | Realtime vide | ALTER PUBLICATION + REPLICA IDENTITY | _(en attente)_ | aucun | test toast |
| L3 | 20 emails coincés en queue | CREATE pgmq.q_auth_emails + init state | _(en attente)_ | minimal | aucune |
| L4 | Webhook Stripe LIVE muet | — | _(en attente)_ | bloquant tant que non fait | **Stripe Dashboard** |

---

## Démarre par L1

Colle `.lovable/phase-b-L1-has-role-grant.sql` dans `/admin/sql-live-runner` en mode "Execute" (pas dry-run), puis dis-moi "**L1 fait**" et je relance la vérif `has_function_privilege` immédiatement.
