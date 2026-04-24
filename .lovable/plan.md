## Contexte

L'app possède déjà :
- une bottom-nav 5 onglets (`AppLayout`) : Accueil · Chiens · GO (centre) · Plan · Stats
- un menu latéral (`SlideMenu`) très complet
- un `Dashboard` (écran d'accueil) chargé visuellement
- un `DayJourneyHeader` utilisé sur DayDetail/Training
- une session d'entraînement plein écran (`TrainingSession`) sans accès rapide aux consignes ni au sommaire de la journée

Objectif : rendre la navigation mobile plus fluide, recentrer l'accueil sur l'essentiel, et donner pendant l'entraînement un accès immédiat aux consignes de l'exercice et à la vue d'ensemble de la journée.

## Ce qui change

### 1. Écran d'accueil (Dashboard) recentré "mobile-first"
Réduire le bruit visuel et hiérarchiser l'action :
- En-tête condensé : avatar chien actif + DogSwitcher + statut (ex. « Jour 7 / 28 · S2 »)
- Bloc CTA principal "Continuer la journée" → ouvre directement le jour en cours (Training)
- 3 raccourcis utiles maxi : Plan · Bibliothèque exercices · Journal
- Carte "Suggestion adaptative" conservée (utile, déjà existante) mais resserrée
- Suppression / repli des cartes secondaires sous un lien "Tout voir" pour ne pas surcharger
- Aucun flux retiré : tous les écrans restent accessibles via la barre basse + menu latéral

### 2. Barre basse (bottom-nav) plus lisible
Conserver les 5 onglets, mais :
- Renommer/clarifier : Accueil · Plan · **Entraîner** (centre, badge pastille si journée en cours non terminée) · Exercices · Profil
  - "Chiens" et "Stats" passent dans le menu latéral (déjà accessibles)
  - "Exercices" devient un onglet (très utilisé pendant l'entraînement)
- Ajouter un indicateur de jour en cours sur le bouton central (ex. petit chip "J7")
- Bouton central agrandi, halo plus marqué, libellé court "GO J7"
- Conserver `safe-bottom` et le glassmorphism existant

### 3. Pendant l'entraînement : accès rapide consignes + journée
Sur `TrainingSession` (vue plein écran, exercice par exercice) :
- **Bouton "Consignes"** flottant en haut à droite → ouvre une bottom-sheet avec :
  - Le titre, l'objectif, les consignes pas-à-pas de l'exercice
  - Le rappel sécurité éventuel
  - Bouton "Lire à voix haute" (ReadAloud déjà en place)
- **Bouton "Journée"** en haut à gauche → ouvre une bottom-sheet "Sommaire J7" :
  - Liste des exercices du jour, état (à faire / en cours / fait)
  - Tap = saute directement à l'exercice
  - Mini barre de progression de la journée
- Un fil de breadcrumb discret sous le header : `J7 · Exo 3/5` (toujours visible)
- Les sheets utilisent les composants Shadcn déjà présents, fermeture par swipe/backdrop

### 4. Détails UX transverses
- Masquer la bottom-nav uniquement sur les écrans plein écran qui le justifient (TrainingSession en mode focus) → remplacée par une mini-barre contextuelle (Consignes · Pause · Suivant)
- Le `DayJourneyHeader` reste sur `DayDetail` et `Training` mais devient "sticky" en haut sur mobile (plus de perte de contexte au scroll)

## Détails techniques

Fichiers touchés :
- `src/components/AppLayout.tsx` — nouveau set d'onglets, badge "jour en cours" sur le bouton central, hide/replace nav sur `/training/session/*`
- `src/components/BottomNavBadge.tsx` *(nouveau)* — petit chip "Jx" réutilisable
- `src/pages/Dashboard.tsx` — refonte hiérarchie : header compact, CTA principal "Continuer J{n}", 3 raccourcis, repli des cartes secondaires
- `src/pages/TrainingSession.tsx` — ajout des deux boutons (Consignes / Journée), breadcrumb sticky, mini-barre contextuelle en remplacement de la bottom-nav
- `src/components/training/SessionInstructionsSheet.tsx` *(nouveau)* — bottom-sheet consignes (réutilise Sheet shadcn + ReadAloud)
- `src/components/training/SessionDayOutlineSheet.tsx` *(nouveau)* — bottom-sheet sommaire de journée
- `src/components/DayJourneyHeader.tsx` — variante `sticky` (prop optionnelle)
- `src/components/SlideMenu.tsx` — s'assurer que "Mes chiens" et "Statistiques" restent en haut du menu (compensation des onglets retirés)

Aucun changement backend, aucune migration, aucun impact billing/IA. Les routes existantes ne bougent pas (pas de régression sur deep-links).

## Hors périmètre
- Pas de refonte visuelle globale ni de changement de thème
- Pas de modification des rôles Coach / Refuge / Admin (leurs layouts dédiés ne sont pas touchés)
- Pas de nouvelle table ni de nouveau endpoint
