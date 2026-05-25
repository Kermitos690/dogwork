# Notifications Live / Push / PWA — Rapport final

Date : 2026-05-25
Mission : phases 1-11 du brief « MISSION CRITIQUE — DOGWORK NOTIFICATIONS LIVE / PUSH / PWA ».
Choix utilisateur : **Option D** — audit + UI admin enrichie + UX iOS clarifiée.

---

## Verdict

✅ **Le système notifications/push DogWork est complet et opérationnel en TEST.**
🟡 **La défaillance LIVE est environnementale**, pas applicative. 2 actions manuelles restent à la charge de l'utilisateur.

Voir l'audit complet : `.lovable/notifications-live-push-audit-phase1.md`.

---

## Ce qui a été livré dans cette session

### Migration DB
- `admin_send_test_notification(_target_user_id, _title, _body)` — RPC SECURITY DEFINER réservée aux admins. Insère une notification (toaster) + déclenche `notify_users_push` (Web Push) en un appel. Non-bloquante côté push.

### Nouvelle page
- **`/admin/system-health`** (`src/pages/AdminSystemHealth.tsx`)
  - 4 metric cards : push actifs, notifications 24h, envois push 24h (+ échecs), préférences users
  - Section cron jobs (compteur 24h + échecs, gracieuse si `cron_job_runs` absent)
  - 10 dernières lignes `notification_logs` avec status badge + erreurs
  - Bouton test self (in-app + push)
  - Liens directs vers `/admin/push-status` et `/admin/pwa-diagnostics`

### Page enrichie
- **`/admin/push-status`** (`src/pages/AdminPushStatus.tsx`)
  - Nouvelle carte **« État côté navigateur (ce device) »** :
    - Web Push supporté
    - Permission Notification
    - SW `/sw-push.js` enregistré + actif
    - Souscription push locale (endpoint preview)
    - Détection iOS + standalone PWA
    - VAPID public key affichée (16 premiers chars)
  - Nouveau bouton **« Tester sur moi-même (in-app + push direct) »** → appelle `admin_send_test_notification`
  - Nouveau bloc **« Tester sur un utilisateur précis »** avec input UUID + bouton Envoyer
  - Conservé : bouton setup-push-internals + bouton test via message trigger DB

### Composant amélioré
- `src/components/PushNotificationCard.tsx` — ajoute une note inline iOS quand l'utilisateur est subscribed sur iPhone (rappel installation PWA pour push hors app).

### Routes
- `src/App.tsx` — `/admin/system-health` derrière `AdminGuard` (lazy-loaded).

### Mémoire
- `mem://features/admin/system-health-page.md` — documentation interne.

---

## Fichiers modifiés

| Fichier | Type |
|---|---|
| `supabase/migrations/<timestamp>_admin_send_test_notification.sql` | nouveau |
| `src/pages/AdminSystemHealth.tsx` | nouveau |
| `src/pages/AdminPushStatus.tsx` | enrichi |
| `src/components/PushNotificationCard.tsx` | petite note iOS |
| `src/App.tsx` | + route + lazy import |
| `mem://features/admin/system-health-page.md` | nouveau |
| `.lovable/notifications-live-push-repair-report.md` | présent fichier |

Aucun secret nouveau requis. Aucun edge function créé/modifié (existants suffisent : `push-subscribe`, `send-push`, `dispatch-push`, `notify-message`, `setup-push-internals`).

---

## État détaillé phase par phase

| Phase brief | Statut |
|---|---|
| 1. Audit complet | ✅ livré dans `notifications-live-push-audit-phase1.md` |
| 2. In-app live | ✅ code complet ; **bloqué LIVE** par `supabase_realtime` publication vide |
| 3. push_subscriptions | ✅ schéma + RLS + edge `push-subscribe` complets |
| 4. SW `/sw-push.js` | ✅ existe, conforme à la spec |
| 5. Edge `send-push` + VAPID | ✅ déployée, secrets `VAPID_PRIVATE_KEY` + `VAPID_SUBJECT` présents |
| 6. Trigger DB → push | ✅ 6 triggers + `notify_users_push` + `dispatch-push` |
| 7. App fermée | ✅ standard Web Push, fonctionnera dès push_subscriptions LIVE alimentée |
| 8. Préférences | ✅ 8 catégories + quiet hours + timezone, filtrage serveur dans `send-push` |
| 9. Diagnostic admin | ✅ enrichi : `/admin/system-health` + `/admin/push-status` |
| 10. Tests | ⏳ smoke tests à faire après actions manuelles LIVE ci-dessous |
| 11. Livrable | ✅ présent fichier |

---

## Actions manuelles restantes (utilisateur)

### 1. Exécuter `phase5b-fix-live-v2.sql` sur LIVE
Active la publication realtime LIVE (messages + notifications) + crons + monitoring + alerting. **Sans ça, le toaster in-app reste muet en LIVE.**
- Remplacer `<LIVE_ANON_KEY>` (Cloud Settings > API LIVE)
- Coller dans Cloud SQL Editor (environnement Live)
- Vérifier `SELECT * FROM pg_publication_tables WHERE pubname='supabase_realtime'`

### 2. Initialiser `app_internal_settings` sur LIVE
Un admin connecté à LIVE doit visiter `/admin/push-status` et cliquer **« Initialiser les settings »** (1 fois). Sans ça, les triggers `notify_push_on_*` échouent silencieusement quand ils tentent d'appeler `dispatch-push`.

### 3. Smoke tests (après #1 et #2)
1. Admin LIVE active Web Push depuis `PushNotificationCard` → vérifier 1 ligne dans `push_subscriptions LIVE` avec `is_active=true`.
2. Aller sur `/admin/system-health` LIVE → cliquer **« Envoyer une notification de test à moi-même »** :
   - **Attendu in-app** : toast immédiat avec titre "Test santé système"
   - **Attendu push** : notification système même si on bascule sur un autre onglet
3. Vérifier dans `notification_logs` qu'une ligne `status=sent` apparaît avec `endpoints_succeeded ≥ 1`.

---

## Limites iOS (documentées dans l'UI)

Web Push iOS exige **toutes** les conditions :
- iOS 16.4 ou supérieur
- App installée sur l'écran d'accueil (Safari Partager → "Sur l'écran d'accueil")
- Permission accordée (Réglages iOS > DogWork > Notifications)
- Service worker `/sw-push.js` actif

L'UI gère explicitement ces cas via les états `needs-ios-install` et `denied` dans `usePushNotifications`, et affiche une note inline dans `PushNotificationCard` quand l'utilisateur iOS est subscribed.

---

## Ce qu'on ne refera PAS

- Pas de nouvelle table de queue : le pattern actuel (trigger DB → `pg_net` → `dispatch-push` → `send-push` → `notification_logs`) est suffisant et robuste, pas de double notification observée.
- Pas de nouvel edge function : les 5 existantes couvrent 100% du brief.
- Pas de modification du SW `/sw-push.js` : conforme à la spec (push + notificationclick avec focus/navigate/openWindow fallback).
- Pas de modification des RLS : déjà strictes (owner ALL + admin SELECT).

---

## Conclusion

Aucun bug de code n'a été trouvé. Le système est production-grade côté code/schéma/RLS/edge functions/SW/hooks/UI. L'expérience admin est désormais plus directe (test 1-clic depuis 2 pages, diagnostic client + serveur côte-à-côte, monitoring cron unifié quand le SQL LIVE sera exécuté).

Une fois les 2 actions manuelles LIVE effectuées, le flow notifications est entièrement opérationnel sur tous les rôles, desktop/Android, et iOS PWA dans les limites Apple.
