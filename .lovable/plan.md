

# Plan d'amélioration : Animations, Onboarding et Notifications

## 1. Animations et transitions fluides

### Page transitions
- Créer un composant `PageTransition` wrapper qui applique `animate-fade-in` avec une variante de slide léger sur chaque changement de route.
- Ajouter des keyframes `slide-up` (translateY 12px → 0) dans `tailwind.config.ts` pour un effet d'entrée plus doux que le fade actuel.

### Feedback tactile sur les boutons
- Ajouter `active:scale-95 transition-transform` au `buttonVariants` dans `button.tsx` pour un effet "press" sur tous les boutons.
- Ajouter `active:scale-[0.98]` sur les cartes cliquables (Programme, DayDetail exercices).

### Micro-animations
- Ajouter une animation de check (scale bounce) quand on coche un exercice dans `DayDetail.tsx`.
- Ajouter un `transition-all duration-200` sur les toggles du `BehaviorLog.tsx`.
- Ajouter une animation pulse sur le bouton "Reprendre aujourd'hui" dans `Index.tsx`.
- Ajouter `animate-fade-in` avec stagger delay sur les listes (exercices, jours du programme) via des classes `delay-[${i*50}ms]`.

### CSS additions dans `index.css`
- Keyframe `bounce-check` pour l'animation de validation.
- Keyframe `slide-up` pour les entrées de page.
- Classe `.btn-press` pour le feedback tactile.

---

## 2. Écran d'onboarding

### Nouveau fichier : `src/pages/Onboarding.tsx`
- Écran en 2-3 étapes (pas de routing, état local avec `step`).
- **Étape 1** : Bienvenue + champ nom du chien.
- **Étape 2** : Acceptation des règles de sécurité (muselière, pas de rencontres improvisées, travail sous seuil). Checkbox obligatoire.
- **Étape 3** : Confirmation + bouton "Commencer le défi".
- Au clic final : `saveSettings({ dogName, startDate: today, currentDay: 1, theme: "light", safetyAcknowledged: true })` puis redirect vers `/`.

### Modification de `App.tsx`
- Wrapper conditionnel : si `getSettings().safetyAcknowledged === false` (ou si la clé n'existe pas dans localStorage), afficher `<Onboarding />` au lieu des routes normales.
- Après onboarding, les routes normales prennent le relais.

### Modification de `lib/storage.ts`
- Le `defaultSettings` a déjà `safetyAcknowledged: false` — c'est suffisant pour détecter le premier lancement.

---

## 3. Notifications/rappels quotidiens

### Nouveau fichier : `src/lib/notifications.ts`
- `requestNotificationPermission()` : demande la permission via `Notification.requestPermission()`.
- `scheduleDaily()` : utilise `setTimeout` / `setInterval` pour vérifier toutes les heures si l'heure cible est atteinte (ex: 9h00), puis envoie une `new Notification(...)`.
- `getNotificationSettings()` / `saveNotificationSettings()` : stocke dans localStorage l'état (activé/désactivé, heure de rappel).

### Modification de `Settings.tsx`
- Ajouter une section "Rappels quotidiens" avec :
  - Toggle activer/désactiver.
  - Sélecteur d'heure (input time).
  - Bouton "Tester la notification".
  - État de permission affiché (accordée / refusée / non demandée).

### Modification de `App.tsx`
- Au montage, si notifications activées, appeler `scheduleDaily()`.

### Texte de la notification
- Titre : "🐕 Défi Canin — Jour {currentDay}"
- Corps : "C'est l'heure de l'entraînement ! {dogName} vous attend."

---

## Détails techniques

| Fichier | Action |
|---|---|
| `tailwind.config.ts` | Ajouter keyframes `slide-up`, `bounce-check` |
| `src/index.css` | Ajouter classes utilitaires animation |
| `src/components/ui/button.tsx` | Ajouter `active:scale-95 transition-transform` |
| `src/pages/Onboarding.tsx` | Créer (nouveau) |
| `src/App.tsx` | Conditionnel onboarding + init notifications |
| `src/lib/notifications.ts` | Créer (nouveau) |
| `src/pages/Settings.tsx` | Ajouter section notifications |
| `src/pages/Program.tsx` | Ajouter stagger animation |
| `src/pages/DayDetail.tsx` | Ajouter animation check |
| `src/pages/Index.tsx` | Pulse sur CTA principal |
| `src/components/Layout.tsx` | Wrapper transition |

