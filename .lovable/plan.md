

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
`ai_messages` (19 lignes) stocke les conversations chat, mais aucun FK vers ledger. Impossible d'auditer "ce message a coûté X crédits". Audit financier impossible si litige client.

### I4 — Triple source de vérité abonnement
`admin_subscriptions` + `stripe_customers` + `get_user_tier()` RPC. Le webhook met à jour `stripe_customers`, mais l'admin override passe par `admin_subscriptions`. Question : qui gagne en cas de conflit ? Le code le sait, mais c'est non documenté dans la fonction `get_user_tier`.

### I5 — `dog_evaluations` n'a pas de contrainte unique → on peut créer 50 évaluations pour le même chien
Aucun garde-fou sur ce qui devrait être un singleton (ou versionné). Risque pollution données + UX confuse côté éducateur.

---

## 4. Risques techniques

| Risque | Sévérité | Détail |
|---|---|---|
| **Replay offline crée des doublons** | Haute | Si l'utilisateur a 2 onglets ouverts, les 2 lancent `flush()` au retour online. Dédup repose uniquement sur `id` localStorage — pas de garde DB. |
| **Service worker cache un index.html cassé** | Moyenne | Network-first sur navigation, mais si `fetch()` retourne 200 + HTML d'erreur Cloudflare, il sera servi en fallback offline ad vitam. |
| **`enforce_dog_limit` côté DB peut être contourné** | Haute | Trigger existe (`has_dog_limit:true`) mais limite frontend = `Infinity` pour expert. Si tier expert est révoqué côté Stripe et que sync échoue, l'utilisateur garde N chiens > limite et la prochaine update plante avec erreur cryptique. |
| **Image generation queue : 840 lignes, 206 dead tup** | Moyenne | Aucun cleanup, 656 kB pour <1 % du DB mais croît linéairement avec créations d'exos. À surveiller. |
| **`debit_ai_credits` lock pessimiste sans timeout** | Moyenne | `FOR UPDATE` sans `NOWAIT` ni `lock_timeout` → si un user spam clique, requêtes empilent et tiennent les connexions. |
| **No index `(user_id, created_at DESC)` sur `ai_credit_ledger`** | Moyenne | Page Shop affiche le full ledger user. À 10k entries/user → scan séquentiel. |

---

## 5. Opportunités produit (haut impact)

1. **Activation réelle** : 91 % des crédits viennent d'admin. Lancer un cohort beta payant de 10 utilisateurs réels avant tout autre feature. Sans data terrain, impossible d'optimiser.
2. **Fallback IA multi-provider** : le 31 % d'échec Gemini est inacceptable. Ajouter OpenAI gpt-5-mini en fallback automatique sur 429 → -90 % de refunds.
3. **Pricing pack remboursable** : tester un "essai pack 4.90 CHF avec garantie satisfait/remboursé" pour casser la barrière 1er achat. 0 conversions actuelles = aucune friction connue.
4. **Sessions multiples par jour** : permettre N `behavior_logs` par `(dog_id, day_id)` débloque le cas réel propriétaire (matin + soir). Migration faible risque.
5. **Dashboard rentabilité par feature** : `chat_general` = 122 uses pour 0,45 CHF revenu / 0,30 USD coût. Exposer cette donnée à l'admin déclenche les bonnes décisions de pricing.

---

## 6. Recommandations priorisées (Top 10)

| # | Action | Impact | Effort | Pourquoi |
|---|---|---|---|---|
| 1 | **Programmer le cron `monthly-credit-grant` sur l'instance Live** | 🔥 Critique | XS (1 SQL) | SLA cassé pour tout futur abonné. Bug silencieux aujourd'hui = scandale demain. |
| 2 | **Ajouter fallback OpenAI sur 429 Gemini dans `ai-with-credits`** | 🔥 Critique | M | Tue 31 % de refunds. Améliore confiance produit. |
| 3 | **Lever la contrainte UNIQUE sur `behavior_logs(dog_id, day_id)`** | 🔥 Critique | XS | Débloque cas usage propriétaire évident. Remplacer par index non-unique. |
| 4 | **Ajouter FK ON DELETE CASCADE sur `dogs`, `users`** vers tables enfants | Haute | S | Évite orphelins, garantit RGPD, simplifie cleanup. |
| 5 | **Tagger `feature_code` sur les refunds** dans `ai-with-credits` | Haute | XS | Sans ça, impossible d'analyser quoi que ce soit côté économie IA. |
| 6 | **Lancer cohort beta 10 utilisateurs payants réels** (1 mois) | Haute | M | Sans data terrain, toute optimisation est aveugle. |
| 7 | **Migrer entièrement `recovery_after_trigger='avoidance'` → colonne `avoidance`** dans `useStats`, `useAdaptive`, `Dashboard`, `BehaviorLog` | Moyenne | S | Termine la dette Phase 2C. Évite double comptage long terme. |
| 8 | **Lier `ai_messages.id` → `ai_credit_ledger.metadata.message_id`** | Moyenne | XS | Audit financier exigible en cas de litige client. |
| 9 | **Index composite `(user_id, created_at DESC)` sur `ai_credit_ledger`** | Moyenne | XS | Page Shop scalable. |
| 10 | **Documenter ordre de précédence `admin_subscriptions` vs `stripe_customers`** dans `get_user_tier()` | Moyenne | XS | Évite décisions divergentes à 6 mois. |

---

## 7. Verdict global

**Le produit est techniquement solide mais commercialement non validé.**

Les fondations (RLS, AI credits, mode terrain, offline) sont au-dessus de la moyenne SaaS. La sécurité est propre. L'architecture monétisation est complète.

**Mais** : 0 achat réel, 0 cron mensuel actif, 31 % d'échecs IA, 0 logs terrain. Tout l'effort technique de Phases 1→4 attend sa validation produit-marché.

**Recommandation stratégique** : geler les nouvelles features 4 semaines, exécuter Top 1-3 immédiatement (1 jour de dev), puis lancer un cohort beta payant pour générer la donnée qui débloquera les vraies décisions produit.

