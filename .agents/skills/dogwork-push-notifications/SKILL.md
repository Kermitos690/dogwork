---
name: dogwork-push-notifications
description: Système notifications DogWork — in-app live (realtime), web push VAPID, PWA iOS standalone, diagnostic admin. À déclencher pour tout sujet notification, push, PWA, service worker, VAPID.
---

# DogWork — Notifications & Push

## 3 couches
1. **In-app live** — Supabase Realtime sur table `notifications` (publication `supabase_realtime`)
2. **Web Push** — VAPID + service worker `/sw-push.js`, fonctionne app fermée
3. **Historique** — table `notifications` + page `/notifications`

## Composants clés
- `src/hooks/usePushNotifications.ts` — enable/disable/refresh status
- `src/lib/push/config.ts` — VAPID_PUBLIC_KEY, isPushSupported, isIos, isStandalonePwa
- `src/components/PushNotificationCard.tsx` — UI user
- `src/components/PushInternalsBootstrap.tsx` — auto-setup admin (idempotent)
- `src/pages/AdminPushStatus.tsx` + `AdminSystemHealth.tsx` — diagnostic
- `public/sw-push.js` — service worker push

## Edge functions
- `push-subscribe` — subscribe/unsubscribe (action: 'subscribe' | 'unsubscribe')
- `push-send` — envoi via web-push library, VAPID privée en secret
- `setup-push-internals` — bootstrap `app_internal_settings` (service_role + URL)

## Statuts (PushStatus)
- `unsupported` — pas de PushManager
- `blocked-preview` — iframe / preview Lovable
- `needs-ios-install` — iOS sans standalone PWA
- `denied` / `default` / `granted-not-subscribed` / `subscribed`

## iOS — contraintes critiques
- Push **uniquement** si PWA installée (standalone, `display-mode: standalone` ou `navigator.standalone`)
- Documenter à l'user: "Ajouter à l'écran d'accueil" obligatoire

## Realtime activation
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
```

## Préférences user
Table `notification_preferences` + page `/settings/notifications`. Respecter opt-in/opt-out par canal.

## Refresh passif (règle UX)
`refresh()` ne **jamais** re-subscribe automatiquement — affiche `granted-not-subscribed` si pas de souscription. Évite faux clignotements UI.

## Diagnostic admin
`/admin/system-health` doit afficher:
- Publication realtime contient `notifications` + `messages`
- VAPID public/privé configurés
- Service worker enregistré
- Nb subscriptions actives
- Dernier envoi push réussi

## Smoke test push
Bouton "Envoyer push test" dans AdminSystemHealth → appel `push-send` avec payload de test sur subscription admin.
