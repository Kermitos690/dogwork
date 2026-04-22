

# Audit Produit DogWork @ Home — Rapport Senior

**Date** : 22 avril 2026 · **Périmètre** : production (instance Live) · **Méthode** : analyse code + DB live + logs + scan sécurité

---

## 1. Forces majeures

| # | Force | Preuve |
|---|---|---|
| 1 | **Architecture AI credits robuste** | `debit_ai_credits` / `credit_ai_wallet` / `ensure_ai_wallet` présentes, RLS verrouille toute écriture directe (`No direct insert/update/delete wallets`), refund automatique sur erreur fournisseur fonctionne (40 entrées refund tracées). |
| 2 | **Séparation rôles solide** | RLS permissive cohérente, `coach_read_client_*` policies bien scopées via `client_links.status='active'`, `is_admin()` SECURITY DEFINER partout. Aucun finding critique au scan sécurité. |
| 3 | **Mode terrain bien conçu** | `TrainingSession.tsx` (606 lignes) : full-screen sans `AppLayout`, vibration + TTS + auto-advance, `persistedIdsRef` anti double-tap, fallback wall-clock pour `duration_actual`. Phase 1 est réellement hardenée. |
| 4 | **Offline queue propre** | `localStorage` + replay cross-tab, scope volontairement réduit aux 3 tables critiques, idempotence par `id` unique. Pas de sur-engineering IndexedDB. |
| 5 | **PWA preview-safe** | SW bypass total des origines tierces (Supabase, AI, fonts), `network-first` sur les navigations, `cache-first` uniquement sur `/assets/*` immutables. Aucun risque de cacher de la donnée utilisateur. |
| 6 | **Schéma monétisation mature** | 5 tiers (starter/pro/expert/educator/shelter), 3 tables séparées (plans/prices/quotas), webhook Stripe avec `billing_events` audit trail, idempotency check sur `stripe_event_id`. |

---

## 2. Faiblesses critiques (impact business immédiat)

### 🔴 C1 — La monétisation n'a jamais été validée en production
**Preuve DB Live** :
- `lifetime_purchased = 0` sur **tous** les wallets (4/4)
- Revenus cumulés : **0,45 CHF** vs coût provider **0,38 USD** → marge réelle inconnue
- Total credits injectés = `bonus (40) + admin_adjustment (405) = 445` → 91 % des crédits actifs sont **manuels**, pas commerciaux
- 0 `billing_events` malgré tout le pipeline Stripe

**Impact** : la rentabilité n'a aucune validation empirique. Le pricing 4.90 / 6.90 / 19.90 CHF est théorique. Aucun parcours d'achat de pack n'a été complété par un vrai utilisateur.

### 🔴 C2 — Cron `monthly-credit-grant` n'est PAS programmé
**Preuve DB Live** : `SELECT * FROM cron.job` retourne uniquement `process-email-queue` (5 secondes). Aucun job mensuel actif. Le rapport précédent affirmait l'inverse — c'était soit un autre instance soit le job a été supprimé.

**Impact** : abonnés Pro/Expert ne reçoivent **aucun crédit mensuel automatique**. Soit le SLA produit est rompu, soit personne n'est encore abonné Pro/Expert et le bug est silencieux. Sans utilisateur réel = invisible jusqu'au premier client payant.

### 🔴 C3 — Taux de refund AI catastrophique : 31 %
**Preuve** : 40 refunds / 127 consumptions, **100 % causés par Gemini 429** (rate limit).
- Tous les refunds ont `feature_code = NULL` → impossible d'analyser quelle feature échoue
- Pattern : 6 refunds en moins de 12 minutes sur la même session le 18 avril

**Impact business réel** : un utilisateur sur 3 voit l'IA échouer. Combiné avec un cooldown 30s, c'est une expérience destructrice. Les 79 crédits remboursés représentent du churn potentiel direct.

### 🔴 C4 — Aucune contrainte d'intégrité référentielle sur les tables cœur métier
**Preuve** : `SELECT * FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY'` → **0 FK** sur `behavior_logs`, `exercise_sessions`, `day_progress`, `dogs`, `ai_credit_wallets`, `ai_credit_ledger`.

**Impact** :
- Suppression d'un chien laisse des `behavior_logs` orphelins → stats faussées
- Suppression d'un user ne purge pas les wallets → fuite RGPD potentielle
- Replay offline peut insérer un log avec `dog_id` désormais supprimé → erreur silencieuse

### 🔴 C5 — Contrainte `behavior_logs (dog_id, day_id) UNIQUE` incohérente avec usage terrain
**Preuve** : `behavior_logs_dog_id_day_id_key` UNIQUE.

**Impact** : un propriétaire ne peut **physiquement pas** logger 2 séances dans la même journée (matin + soir). Tout 2e `INSERT` échoue avec `23505`. Le QuickJournalSheet va silently swallow l'erreur en mode offline (queue) mais échouer en mode online sans message clair. **Casse le cas d'usage le plus naturel.**

### 🔴 C6 — Volume terrain réel = quasi nul
**Preuve DB Live** : `behavior_logs=0`, `exercise_sessions=1`, `day_progress=2`. Tout l'investissement Phase 1+2 (training session, journal, lock state, offline) **n'a jamais été utilisé** au-delà d'1 test.

**Impact** : aucune validation produit-marché. Les KPIs UX, les performances stats, la pertinence des zones — tout est théorique.

---

## 3. Incohérences produit

### I1 — Naming `starter` partout vs spec produit "Free / Freemium"
`PLANS.starter.name = "Freemium"` mais slug = `starter`. La doc commerciale, la mémoire workspace, le quota table parlent de `starter`. Risque de confusion utilisateur (badge "Gratuit" sur page de pricing) + complexité admin.

### I2 — Colonne `recovery_after_trigger` toujours utilisée comme texte libre alors que `avoidance` existe
`useStats`, `Dashboard`, `BehaviorLog`, `useAdaptive`, `Plan` lisent encore `recovery_after_trigger` comme string. La migration Phase 2C a ajouté la colonne `avoidance` (boolean) mais **n'a pas remplacé** l'usage : les deux schémas cohabitent. Risque de double-comptage et confusion long terme.

### I3 — `ai_messages` séparé de `ai_credit_ledger` sans lien
`ai_messages` (19 lignes) stocke les conversations chat, mais aucun FK vers ledger. Impossible d'auditer "ce message a coûté X crédits". Aud