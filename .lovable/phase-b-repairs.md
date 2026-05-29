# Phase B — Réparations Go-Live (preuves & instructions)

Date: 2026-05-29
Score actuel: 75/100 (Conditionnel) → cible 95/100 après exécution.

## ✅ Automatique (déjà appliqué)

### B1 — GRANT EXECUTE sur public.has_role (LIVE)
- Migration `20260529093000_*.sql` créée et appliquée sur TEST.
- **Action utilisateur** : cliquer **Publish** → la migration s'applique sur LIVE.
- Preuve attendue post-publish (à vérifier dans Cloud SQL Live) :
  ```sql
  SELECT has_function_privilege('authenticated', 'public.has_role(uuid, public.app_role)', 'EXECUTE');
  -- attendu: true
  ```

### I1 — URLs webhook hardcodées corrigées
- Fichier: `src/pages/AdminGoLiveCheck.tsx` lignes 283 & 287
- Avant: `https://dcwbqsfeouvghcnvhrpj.supabase.co/...` (ref TEST)
- Après: `https://hdmmqwpypvhwohhhaqnf.supabase.co/...` (ref LIVE)
- Impact: les admins voyaient une URL TEST présentée comme "Webhook LIVE" → risque d'erreur de configuration Stripe.

## 🔧 Manuel — à exécuter par l'utilisateur

### B3 + B4 — pgmq queue + 5 cron jobs LIVE
**Fichier**: `.lovable/phase-b-live-fix.sql`

**Étapes**:
1. Récupérer la clé anon LIVE : Cloud → Settings → API → "anon public key".
2. Remplacer `<LIVE_ANON_KEY>` dans le SQL (5 occurrences).
3. Ouvrir Cloud → Database → **Run SQL**, sélectionner **Live**.
4. Coller le contenu, exécuter.
5. Vérifier :
   ```sql
   SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;
   -- attendu: 5 jobs actifs
   SELECT * FROM pgmq.list_queues();
   -- attendu: q_auth_emails présent
   ```

Le script est **idempotent** (drop si existant, recréation) — safe à relancer.

### B2 — Webhook Stripe LIVE (à vérifier dans Stripe Dashboard)
Aller sur https://dashboard.stripe.com/webhooks (mode **Live**) :

1. **Endpoint plateforme** :
   - URL: `https://hdmmqwpypvhwohhhaqnf.supabase.co/functions/v1/stripe-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_succeeded`, `invoice.payment_failed`
   - Secret `whsec_…` → stocké comme `STRIPE_WEBHOOK_SECRET` (env LIVE)

2. **Endpoint Connect** :
   - URL: `https://hdmmqwpypvhwohhhaqnf.supabase.co/functions/v1/stripe-course-webhook`
   - **⚠️ "Listen to events on Connected accounts" = ON**
   - Events: `account.updated`, `payout.*`, `charge.*`
   - Secret → stocké comme `STRIPE_CONNECT_WEBHOOK_SECRET` (env LIVE)

3. Preuve post-fix (Cloud SQL Live) :
   ```sql
   SELECT COUNT(*), MAX(created_at) FROM billing_events;
   -- attendu: count > 0 et MAX récent après prochain paiement test
   ```

## 📊 Tableau récapitulatif

| ID | Catégorie | Statut | Type | Owner |
|----|-----------|--------|------|-------|
| B1 | Bloquant | ✅ Migration prête | Auto + Publish | User (Publish) |
| B2 | Bloquant | ⏳ À vérifier | Manuel Stripe | User |
| B3 | Bloquant | ⏳ SQL prêt | Manuel SQL | User |
| B4 | Bloquant | ⏳ SQL prêt | Manuel SQL | User |
| I1 | Important | ✅ Patché | Auto | — |
| ShelterGuard | Cosmétique | ✅ Diagnostiqué non-bug | — | — |

## 🎯 Prochaine étape

1. **Publish** (déclenche B1).
2. Exécuter `.lovable/phase-b-live-fix.sql` sur LIVE (B3+B4).
3. Vérifier endpoints Stripe LIVE (B2).
4. Relancer `AdminGoLiveCheck` page LIVE → score attendu ≥ 95/100.
