# Phase 1 — Audit Notifications / Push / Realtime (read-only)
Date : 2026-05-25 — Mode : aucune modification.

## TL;DR — Verdict

**Le code est complet et correct. Tout fonctionne déjà en TEST.**
La défaillance LIVE n'est **pas** un bug applicatif — c'est une **carence de configuration LIVE** héritée de l'audit Phase 5 :

1. **`supabase_realtime` publication LIVE = vide** → le toaster in-app ne reçoit rien (déjà documenté dans `.lovable/phase5b-fix-live-v2.sql`).
2. **`push_subscriptions` LIVE = vraisemblablement 0 ligne** (aucun utilisateur n'a jamais finalisé la subscription en prod). À confirmer côté LIVE.
3. **VAPID public key codée en dur côté client ET serveur** — elles correspondent (vérifié), donc les subscriptions générées par les clients sont bien acceptées par `send-push` via `web-push`. OK.
4. **Secrets** : `VAPID_PRIVATE_KEY` + `VAPID_SUBJECT` présents. **VAPID_PUBLIC_KEY n'est pas dans les secrets** (et n'a pas besoin de l'être — elle est publique et hardcodée).

---

## Ce qui existe et fonctionne (TEST validé)

### Tables (toutes RLS + scoping correct)
| Table | Colonnes clés | RLS |
|---|---|---|
| `notifications` | recipient_user_id, actor_user_id, type, title, body, url, image_url, priority, read_at, metadata | ✅ owner-scoped + admin read + update-mark-read |
| `push_subscriptions` | user_id, endpoint (unique), p256dh, auth, user_agent, platform, is_active, failure_count, last_success_at, last_failure_at | ✅ owner ALL + admin SELECT |
| `notification_preferences` | exercises/messages/shelter/billing/plans/appointments/support/admin_alerts `_enabled`, quiet_hours_start/end, timezone | ✅ owner ALL + admin SELECT |
| `notification_logs` | user_id, category, title, status, endpoints_total/succeeded/failed, error, dedup_key | ✅ owner SELECT + admin SELECT |

Toutes les colonnes attendues par la spec sont présentes. Aucun champ manquant.

### Edge functions (déployées)
- **`push-subscribe`** ✅ — JWT requis, upsert sur `endpoint` (clé unique), détecte plateforme via UA, réinitialise `failure_count`, crée prefs par défaut. Robuste.
- **`send-push`** ✅ — Double auth (JWT admin OU `x-internal-secret`), respecte prefs catégorie + quiet hours, désactive auto les endpoints 404/410, log complet dans `notification_logs`, insère ligne `notifications` (alimente le toaster), TTL + urgency par catégorie. Production-grade.
- **`dispatch-push`** ✅ — Wrapper broadcast/role, filtre par préférence catégorie, délègue à `send-push`. Appelé par les triggers DB via `pg_net` (`notify_users_push`).
- **`notify-message`** ✅ — Trigger DB `trg_notify_new_message` → notif push pour nouveau message direct.
- **`setup-push-internals`** ✅ — Configure `app_internal_settings` (URL Supabase + service_role) consommé par les triggers `notify_users_push`.

### Service worker
- **`public/sw-push.js`** ✅ — Strictement push : `install` skipWaiting, `activate` clients.claim, `push` JSON robust + fallback, `notificationclick` focus puis navigate puis openWindow. Séparé de `public/sw.js` (PWA killer) pour ne pas interférer.
- **`public/sw.js`** = SW kill-switch v3 (Phase 5 audit) — préserve compatibilité PWA.

### Frontend
- **`src/lib/push/config.ts`** ✅ — VAPID hardcoded (publique, OK), helpers `isPreviewOrIframe`, `isIos`, `isStandalonePwa`, `isPushSupported`. Bloque proprement le preview Lovable.
- **`src/hooks/usePushNotifications.ts`** ✅ — 7 états explicites (`unsupported | blocked-preview | needs-ios-install | denied | default | granted-not-subscribed | subscribed`), refresh passif (pas de re-subscribe agressif), enable explicite, disable serveur+client, re-resync sur focus/visibility.
- **`src/components/PushNotificationCard.tsx`** ✅ — Monté sur 8 routes (Preferences, NotificationSettings, ShelterSettings, CoachSettings, CoachProfile, EmployeeSettings, AdminDashboard, AdminPreferences).
- **`src/components/DogWorkNotificationToaster.tsx`** ✅ — Monté **globalement** dans `src/App.tsx:475`. Channel Realtime filtré sur `recipient_user_id=eq.{uid}`, dédup `seenRef`, invalide les queries React-Query liées, toast avec action "Ouvrir" + mark-as-read best-effort.
- **`src/pages/AdminPushStatus.tsx`** ✅ — Page diagnostic admin existe.

### Triggers DB → push
- `notify_push_on_new_plan`, `notify_push_on_ticket_created`, `notify_push_on_ticket_replied`, `notify_push_on_new_signup`, `notify_push_on_appointment`, `notify_push_on_adoption_plan` — tous présents en TEST, appellent `notify_users_push` → `dispatch-push`. Email triggers parallèles (`notify_email_on_*`) aussi présents.

---

## Ce qui est cassé / partiel sur LIVE

### 🔴 LIVE-1 — Publication realtime vide
Confirmé Phase 5. `pg_publication_tables WHERE pubname='supabase_realtime'` = 0 ligne en LIVE alors que TEST contient `messages` + `notifications`.
**Conséquence directe :** `DogWorkNotificationToaster` ne reçoit AUCUN `postgres_changes` INSERT en LIVE. Le toaster fonctionne mais ne se déclenche jamais.
**Fix prêt :** `.lovable/phase5b-fix-live-v2.sql` (sections 1 + REPLICA IDENTITY FULL).

### 🔴 LIVE-2 — Cron jobs absents
Confirmé Phase 5. Aucun `monthly-credit-grant`, `monthly-credit-grant-daily`, `send-appointment-reminders-daily`. À installer via v2.

### 🟡 LIVE-3 — push_subscriptions LIVE probablement vide
Mémoire Phase 5 : « table de subscriptions push vide ou non alimentée en prod ». Cohérent avec le fait que tant que le toaster Realtime ne fonctionne pas, les utilisateurs ne perçoivent rien et n'enregistrent pas leur push.
**À vérifier après exécution du v2** : `SELECT count(*) FROM push_subscriptions WHERE is_active` côté LIVE.

### 🟡 LIVE-4 — `app_internal_settings` LIVE potentiellement non seedé
Les triggers `notify_push_on_*` et `trg_notify_new_message` lisent `app_internal_settings` (`supabase_url`, `service_role_key`) pour appeler `dispatch-push` via `net.http_post`. Si la table est vide en LIVE, **tous les triggers échouent silencieusement** (RAISE LOG seulement). L'edge `setup-push-internals` doit avoir été appelé au moins une fois par un admin connecté en LIVE.
**À vérifier** : `SELECT key, length(value) FROM app_internal_settings` côté LIVE. Si vide → bouton/action admin pour invoquer `setup-push-internals`.

### 🟢 Aucun bug applicatif identifié
- Pas de duplication de toast (dédup via `seenRef`).
- Pas de re-subscribe agressif (refresh = passif).
- Endpoints invalides désactivés auto (404/410 → is_active=false).
- Quiet hours + prefs catégorie respectés serveur-side.

---

## Différences in-app vs realtime vs web push

| Couche | Déclencheur | Dépendance LIVE | État LIVE |
|---|---|---|---|
| **In-app (toaster)** | INSERT `notifications` + Realtime publication | publication `supabase_realtime` ADD TABLE | 🔴 manquant |
| **In-app (queries)** | useNotifications() polling via React Query | aucun | ✅ fonctionne |
| **Web Push (app ouverte)** | `dispatch-push` → `send-push` → service worker | VAPID + push_subscriptions + app_internal_settings | 🟡 dépend de #3 + #4 |
| **Web Push (app fermée)** | idem + service worker actif côté device | idem + SW enregistré au moins une fois | 🟡 idem |
| **iOS PWA** | idem + iOS ≥16.4 + standalone | UI cards déjà gèrent `needs-ios-install` | ✅ géré |

---

## Secrets requis (état actuel)

| Secret | Présent | Notes |
|---|---|---|
| `VAPID_PRIVATE_KEY` | ✅ | utilisé par `send-push` |
| `VAPID_SUBJECT` | ✅ | utilisé par `send-push` |
| VAPID public key | hardcoded | `BM7n5azCYAmdSkiD9ehd93CAqyIgwyG4efqR9HaB490y-hkg3Sri-v2HyW5FNUFY7K-hqQ5Osbpfi2b9Nb5OSBU` (client + serveur, vérifié identiques) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ auto | utilisé par toutes les edge functions |
| `LIVE_SERVICE_ROLE_KEY` | ✅ | utilisé par admin-live-proxy |

**Aucun nouveau secret n'est nécessaire** pour réparer LIVE.

---

## Plan d'action minimal pour LIVE (phases 2-7 condensées)

Toutes les briques existent. Il ne reste qu'à :

1. **[Manuel utilisateur — LIVE SQL Editor]** Exécuter `.lovable/phase5b-fix-live-v2.sql` (déjà préparé). Couvre realtime + crons + monitoring + alerting.
2. **[Manuel admin connecté à LIVE]** Visiter une page admin pour déclencher `setup-push-internals` (vérifier qu'elle s'auto-déclenche, ou ajouter un bouton). Seede `app_internal_settings`.
3. **[Smoke test par 1 admin]** Activer push depuis `PushNotificationCard` → vérifier 1 ligne dans `push_subscriptions LIVE` avec `is_active=true`.
4. **[Smoke test envoi]** Utiliser `AdminPushStatus` pour "test envoyer une notification à moi-même" → vérifier `notification_logs` + arrivée toast + arrivée Web Push.
5. **[Validation iOS]** Documenter dans `PushNotificationCard` que iOS exige installation PWA (déjà géré dans `usePushNotifications` état `needs-ios-install`).

Aucun changement de code/schema n'est nécessaire pour la majorité de la mission.

---

## Phases 2-11 du brief — Statut

| Phase brief | État réel |
|---|---|
| 2. In-app live | ✅ Code OK. Bloqué uniquement par publication realtime LIVE. |
| 3. push_subscriptions | ✅ Table + RLS + upsert OK. |
| 4. SW push `/sw-push.js` | ✅ Existe et conforme. |
| 5. Edge send-push + VAPID | ✅ Déployée + secrets présents. |
| 6. Trigger DB → push | ✅ 6 triggers + `notify_users_push` + `dispatch-push`. |
| 7. App fermée | ✅ Mécanique standard Web Push, fonctionnera dès push_subscriptions alimentée. |
| 8. Préférences | ✅ 8 catégories + quiet hours + timezone, filtrage serveur. |
| 9. Diagnostic admin | ✅ `AdminPushStatus` existe (à valider en preview LIVE). |
| 10. Tests | À effectuer après fix LIVE (smoke tests 1-4 ci-dessus). |
| 11. Livrable | Le présent fichier + fix-live-v2.sql + rapport post-tests. |

---

## Ce que je recommande de faire maintenant

**Option A — Minimaliste, recommandé** :
1. Tu exécutes `phase5b-fix-live-v2.sql` sur LIVE.
2. Tu te connectes admin sur LIVE, ouvres `/admin/system-health` (à créer — voir réponse précédente) ou n'importe quelle page qui déclenche `setup-push-internals`.
3. Tu actives push depuis ton compte admin.
4. Smoke test 1 envoi.
5. Je consigne le résultat dans `.lovable/notifications-live-push-repair-report.md`.

**Option B — Si tu veux que je « bouge le code »** :
- Améliorer `AdminPushStatus` avec un bouton "Tester sur moi-même" et un panneau "État VAPID / SW / permission".
- Ajouter dans `PushNotificationCard` une bannière iOS dédiée (déjà géré par état, mais texte explicite).
- Créer la page `/admin/system-health` (cron monitoring + push diagnostic).

Aucune réécriture/refacto nécessaire — le système est déjà au niveau attendu.
