

# Plan d'exécution — Déblocage Publish Live

## Cause racine confirmée du dernier échec
Supabase a rejoué la migration historique `20260423000836` AVANT la nouvelle `20260423163840`. La migration `163840` a bien été enrichie avec le nettoyage idempotent, mais elle s'exécute trop tard : `20260423000836` essaie d'ajouter la FK `ai_credit_wallets_user_fk` sur des wallets orphelins → échec 23503.

**Solution :** déplacer le nettoyage à l'intérieur même de `20260423000836` pour qu'il s'exécute avant l'ADD CONSTRAINT.

## Actions à exécuter (en mode default)

### 1. Réécriture de `supabase/migrations/20260423000836_c32ffad8-...sql`
Remplacer son contenu par, dans cet ordre strict et idempotent :
- `DELETE FROM public.ai_credit_ledger WHERE user_id NOT IN (SELECT id FROM auth.users);`
- `DELETE FROM public.ai_credit_ledger l WHERE NOT EXISTS (SELECT 1 FROM public.ai_credit_wallets w WHERE w.id = l.wallet_id);`
- `DELETE FROM public.ai_credit_wallets WHERE user_id NOT IN (SELECT id FROM auth.users);`
- `ALTER TABLE … DROP CONSTRAINT IF EXISTS ai_credit_wallets_user_fk;`
- `ALTER TABLE … DROP CONSTRAINT IF EXISTS ai_credit_wallets_user_id_fkey;`
- `ALTER TABLE … ADD CONSTRAINT ai_credit_wallets_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;`
- même pattern pour la FK `ai_credit_ledger.wallet_id → ai_credit_wallets.id` ON DELETE CASCADE

### 2. Suppression de `supabase/migrations/20260423163840_...sql`
Devient entièrement redondante. Supprimée pour garder un pipeline propre.

### 3. Nouvelle migration `…_cron_logs_and_indexes.sql` (idempotente)
- `CREATE TABLE IF NOT EXISTS public.cron_run_logs (…)` + RLS admin-only
- Index utiles : `idx_ai_credit_ledger_user_created`, `idx_ai_credit_ledger_operation_status`, `idx_ai_credit_ledger_period_key`, `idx_cron_run_logs_job_period`, `idx_cron_run_logs_started`

### 4. Cron schedule (NON automatisé via migration)
Le `cron.schedule()` contient l'URL Live + le `CRON_SECRET` → **doit rester manuel** selon les règles Supabase (pas de données projet-spécifiques dans une migration partagée). Je fournirai le SQL final à coller dans le SQL Editor Live après Publish.

### 5. Hardening RPC (vérification seulement)
`ensure_ai_wallet`, `credit_ai_wallet`, `debit_ai_credits` : je vérifierai d'abord les vraies signatures Live via `read_query` sur `pg_proc`, puis je n'agirai que si une faille réelle existe. Pas de réécriture spéculative.

### 6. Frontend (corrections ciblées, non-régressives)
- `useAICredits.tsx` — fiabiliser invalidations React Query après refund/purchase
- `useCreditConfirmation.tsx` — bloquer `handleConfirm` tant que `features` non chargées (évite cost=0)
- `CreditConfirmDialog.tsx` — CTA "Recharger" → navigation `/shop` toujours disponible
- `Shop.tsx` — fiabiliser réconciliation post-checkout (déjà partiel)
- `AIChatBot.tsx` — mapping erreurs 402/429 → toast + redirection `/shop`

## Ce qui restera manuel après mes modifications
1. **Cliquer Publish** dans Lovable → applique `20260423000836` corrigée + nouvelle migration cron_logs sur Live
2. **Vérifier secret `CRON_SECRET`** sur Live (je peux le détecter via `secrets--fetch_secrets`)
3. **Coller le SQL `cron.schedule(...)` Live** que je fournirai (1 bloc, idempotent)

## Verdict attendu
- Avant exécution : NO GO
- Après exécution + Publish réussi + planification cron : **GO production**

