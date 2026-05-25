# Audit Phase 5 — Realtime, PWA, Observabilité, Cron (LIVE)

**Cible**: `hdmmqwpypvhwohhhaqnf` — lecture seule
**Date**: 2026-05-25

---

## 1. Realtime — Publication `supabase_realtime`

🔴 **P0 — La publication realtime est VIDE sur LIVE.**

```sql
SELECT * FROM pg_publication_tables WHERE pubname='supabase_realtime';
-- 0 rows
```

Or 4 fichiers front utilisent `.channel()` + `postgres_changes` :
- `src/components/DogWorkNotificationToaster.tsx`
- `src/components/NotificationToast.tsx`
- `src/pages/Messages.tsx`
- `src/pages/ShelterMessages.tsx`

**Conséquences réelles sur LIVE** :
- Les notifications push internes **ne déclenchent jamais** en temps réel
- La messagerie owner ↔ coach ↔ refuge **ne reçoit pas** les nouveaux messages en live (rafraîchissement manuel requis)
- Le toaster `DogWorkNotificationToaster` est silencieux

**Tables candidates à publier** (à confirmer) : `messages`, `notifications`, `support_tickets` (si présents).

## 2. Cron jobs (`cron.job`)

| Job | Schedule | Actif |
|---|---|:---:|
| `process-email-queue` | toutes les 5s | ✅ |

🔴 **P0 — Crons métier mémoire-référencés sont ABSENTS sur LIVE** :
- Pas de `monthly_credit_grant` / grant mensuel crédits IA
- Pas de `schedule_appointment_reminders`
- Pas de `cleanup_*`, pas de `reconcile_*` automatique

Les fonctions correspondantes n'existent même pas en DB (`pg_proc` ne retourne rien d'utile sur "grant", "monthly", "reminder").

**Conséquence** : les abonnés payants Pro/Expert ne recevront **pas leur grant mensuel automatique** de crédits IA. Tout passe par achat de packs ou ajustement admin manuel.

## 3. PWA — Service worker + manifest

✅ `public/manifest.json` complet (icônes 32 → 512, maskable, theme color cohérent #1a1a2e, lang=fr).
✅ `public/sw.js` v3 :
- Preview-safe (refuse install sur Lovable preview / iframe)
- Network-first pour navigations, cache-first pour `/assets/*` (Vite content-hash)
- Bypass Supabase / AI / tiers
- Versionning explicite (`dogwork-sw-v3`) — invalidation propre

✅ Pas de plugin VitePWA — SW manuel maîtrisé.

🟡 **P2** : pas de stratégie de notification push web (`push` event handler absent du SW). La mémoire évoque `push_subscriptions` (table présente) mais l'envoi de push réel n'est pas implémenté côté SW.

## 4. Storage buckets

| bucket | public |
|---|:---:|
| brand-assets | ✅ |
| email-assets | ✅ |
| exercise-images | ✅ |
| public-profile-media | ✅ |
| shelter-photos | ✅ |
| dog-photos | ❌ |
| onboarding-pdfs | ❌ |

✅ Séparation public/privé cohérente.
🟡 **P2** — Vérifier que `shelter-photos` ne contient pas de PII (visages adoptants, documents). Si oui, basculer en privé + URLs signées.

## 5. Observabilité — Edge logs

ℹ️ La requête `function_edge_logs` retourne vide sur LIVE — pas de filtre temporel approprié testé. À approfondir au cas par cas via `edge_function_logs` ciblé sur une fonction (`stripe-webhook`, `consume_credits`…) si besoin.

✅ Table `billing_events` audit (vue Phase 4) + `billing_sync_alerts` (0 ouverte) constituent l'observabilité métier minimale.

🟡 **P2** : pas de dashboard admin pour visualiser :
- Cron health (dernier run, échecs)
- Edge function error rate
- Realtime channel health

---

## Synthèse Phase 5

| ID | Sévérité | Sujet |
|---|:---:|---|
| **P0-5A** | 🔴 **P0** | Realtime publication VIDE — messagerie + notifications cassées en temps réel |
| **P0-5B** | 🔴 **P0** | Crons métier absents (grant mensuel crédits, reminders) |
| P2-5C | 🟢 P2 | Pas de handler `push` dans le SW malgré table `push_subscriptions` |
| P2-5D | 🟢 P2 | Vérifier confidentialité bucket `shelter-photos` |
| P2-5E | 🟢 P2 | Pas de dashboard observabilité cron / edge / realtime |

### 🚦 Verdict

🔴 **NO-GO en l'état pour ouverture publique** tant que :
1. La publication realtime ne contient pas au minimum `messages` et `notifications`
2. Le grant mensuel de crédits IA n'est pas planifié (sinon les Pro/Expert se sentiront floués au mois 2)

Les deux correctifs sont **additifs** et **non destructifs** : ajouter des tables à la publication + créer 1 ou 2 cron jobs.

---

## Plan correctif additif proposé (Phase 5B)

### Étape 1 — Réactiver realtime (TEST puis publish → LIVE)

```sql
-- À appliquer via migration (TEST), publish → LIVE
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
-- (ajouter d'autres tables si confirmées)
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
```

⚠️ À confirmer : noms exacts de tables (vérifier `messages` vs autre nommage refuge).

### Étape 2 — Grant mensuel crédits IA

Créer :
- Fonction `public.grant_monthly_ai_credits()` qui parcourt `stripe_customers` actifs + `admin_subscriptions` actifs, et crédite via `ai_credit_ledger` (`operation_type='bonus'`, raison `monthly_grant`).
- Cron `pg_cron` mensuel le 1er à 03:00 UTC.

### Étape 3 — (Optionnel) Reminders rendez-vous

Si la fonctionnalité rendez-vous existe vraiment côté DB (à confirmer), ajouter cron quotidien.

---

## Questions

1. **OK pour appliquer le correctif realtime** (messages + notifications) sur TEST ?
2. **Confirmes-tu la règle de grant mensuel** : combien de crédits pour Pro / Expert / Educator / Shelter ? (cf. mémoire `ai-economy-quotas-and-packs-v5` à relire)
3. **Veux-tu enchaîner Phase 6** (multi-rôles, navigation, mobile) ou rester sur Phase 5B (correctifs) en priorité ?
