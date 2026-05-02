
# Réparation complète du frontend DogWork — Plan d'intervention

## 1. Constat (audit ciblé)

### 1.1 Pages développées mais NON intégrées au menu / sans entrée navigation
- `Outils.tsx` → routée `/outils`, présente dans owner menu, mais **absente** de Coach/Shelter/Employee/Admin nav.
- `Documents.tsx` → routée, présente owner uniquement.
- `Modules.tsx`, `Pricing.tsx`, `Shop.tsx` → routées, owner uniquement (Shop = page crédits IA effective).
- `AdoptionFollowup.tsx` → routée, owner uniquement.
- `AdminAIEconomy`, `AdminTreasury`, `AdminLaunchChecklist`, `AdminSubscriptions`, `AdminTickets`, `AdminStripe`, `AdminStripeVerify`, `AdminGoLiveCheck`, `AdminPushStatus`, `AdminPreferences`, `AdminEmailDiagnostics`, `AdminModules` → routées mais **invisibles dans SlideMenu admin** (qui n'expose que 4 entrées).
- `CoachExercises`, `CoachExercisePreview`, `CoachShelterAnimals`, `CoachSubscription`, `EducatorReferrals` → routées, **absentes de CoachNav**.
- `ShelterSettings`, `ShelterSubscription`, `ShelterCoaches`, `ShelterAdoptionPlans`, `ShelterAdoptionCheckins`, `ShelterEmployees`, `ShelterActivityLog`, `ShelterProfile` → routées mais ShelterNav n'expose que 6 onglets (atteignables seulement via Settings).
- `EmployeeProfile` accessible mais pas de **page Settings/Notifications** dédiée employé.
- `NotificationSettings` (`/settings/notifications`) → routée seulement dans la branche shelter, **manquante** dans la branche owner/coach/admin du switch.
- `Help.tsx`, `Safety.tsx` → owner uniquement.
- `PublicProfileManager` (`/ma-page-publique`) → utilisée par CoachNav et ShelterNav, OK.

### 1.2 Settings / Paramètres
- **Owner** : `/settings` existe (`Settings.tsx`) ✅
- **Coach** : aucune route `/coach/settings` → manquante. CoachProfile existe mais n'est pas un vrai "Settings".
- **Shelter** : `ShelterSettings` existe (sert de hub), OK.
- **Employee** : aucune page Settings, seulement EmployeeProfile.
- **Admin** : `AdminPreferences` existe mais non accessible via menu.

### 1.3 Crédits IA
- Page dédiée = `Shop.tsx` (`/shop`) → fonctionne pour owner.
- **Aucune route `/coach/credits`, `/shelter/credits`, `/employee/credits`, `/admin/credits`**.
- Le solde s'affiche dans SlideMenu owner mais pas dans CoachLayout/ShelterLayout/EmployeeLayout headers.

### 1.4 Routes cassées / incohérences
- `/coach/clients/:clientId` → pointe vers `CoachClients` (pas vers un détail client). À corriger ou laisser comme filtre.
- Dans la branche `isShelter`, route `/pricing` **manquante** alors que `/pricing` existe pour owner.
- `/coach/ai`, `/shelter/ai`, `/employee/ai`, `/admin/ai` → **n'existent pas**, alors que la doctrine demande des hubs IA par rôle. À mapper sur `/outils` (réutilisable).
- Pas de `/admin/users`, `/admin/exercises`, `/admin/programs`, `/admin/shelters`, `/admin/educators`, `/admin/marketplace`, `/admin/logs`, `/admin/audit`, `/admin/config` → certaines fonctions existent dans des sous-pages (AdminAIEconomy, AdminCompliance), d'autres sont à créer en alias ou en stubs.
- SlideMenu admin référence `/admin/test-webhook` & `/admin/test-marketplace-p0` (pages de test exposées en prod).
- `OutilsPage` est exposée à tous mais sans guard de rôle pour adapter le contenu.

### 1.5 Doublons / éléments à archiver
- `Profile.tsx` vs `Preferences.tsx` vs `Settings.tsx` → 3 pages owner qui se chevauchent. Settings = hub, Profile = identité, Preferences = visibilité sections. À garder mais mieux articuler (Settings devient le hub ; Preferences et Profile y sont liées).
- `AdminTestWebhook`, `AdminTestMarketplaceP0` → pages techniques, à déplacer sous un sous-menu "Diagnostics" admin et masquer hors admin.
- `Pricing.tsx` (interne) vs `Subscription.tsx` → garder, mais Pricing devient lecture seule depuis Settings.

### 1.6 Guards
- `AdminGuard` ✅ correct
- `CoachGuard`, `ShelterGuard`, `EmployeeGuard` : tous fonctionnels (admin bypass OK).
- **Manque** : pas de `RoleGuard` générique ni `SubscriptionGuard` réutilisable côté frontend (la logique est éparpillée dans `useFeatureGate`/`useSubscription`).

---

## 2. Plan correctif (exécutable en une passe)

### Étape A — Routes manquantes / alias (App.tsx)
Ajouter dans la branche **owner** ET dupliquer dans branches shelter/coach/employee/admin selon besoin :

```
/settings/notifications  → NotificationSettings  (owner branche manquante)
/credits                 → Shop                  (alias propre vers la page achat crédits)
/ai                      → Outils                (alias hub IA owner)

/coach/settings          → SettingsPage          (réutilise la page settings)
/coach/credits           → Shop
/coach/ai                → Outils
/coach/messages          → MessagesPage          (au lieu d'utiliser /messages owner)

/shelter/credits         → Shop
/shelter/ai              → Outils
/shelter/help            → HelpPage
/shelter/pricing         → PricingPage

/employee/settings       → SettingsPage          (version simplifiée via guard)
/employee/messages       → MessagesPage
/employee/notifications  → NotificationSettings

/admin/settings          → AdminPreferences
/admin/credits           → AdminAIEconomy        (déjà existant, alias propre)
/admin/users             → AdminSubscriptions    (jusqu'à création d'une vraie page users)
/admin/audit             → AdminGoLiveCheck
/admin/config            → AdminPreferences
/admin/logs              → AdminEmailDiagnostics (alias temporaire)
```

Dans la branche `isShelter` du switch ProtectedRoutes, ajouter explicitement `/settings/notifications`, `/pricing`, `/credits`, `/ai`.

### Étape B — SlideMenu : refonte par rôle

**Owner** (épuré, ordre) :
Accueil • Mes chiens • Programme • Séance du jour • Bibliothèque • Journal • Stats • Outils IA • Messages • Abonnement • **Crédits IA** • **Paramètres** • Aide

**Coach** (nouveau bloc complet) :
Dashboard coach • Clients • Chiens suivis • Programmes (notes) • Cours • Marketplace (cours) • Calendrier • **Refuges partenaires** (`/coach/shelter-animals`) • Bibliothèque (`/coach/exercises`) • **Ma page publique** • Parrainages • Conformité • Stats • **Abonnement** (`/coach/subscription`) • **Crédits IA** (`/coach/credits`) • **Paramètres** (`/coach/settings`) • Support

**Shelter** (compléter) :
Dashboard refuge • Animaux • Espaces • Adoptables/Plans adoption • Suivi adoptants • Employés • Coachs partenaires • Journal d'activité • Stats • Messages • **Abonnement** • **Crédits IA** • **Paramètres** (déjà = ShelterSettings) • Ma page publique

**Employee** (compléter EmployeeNav + ajouter Settings) :
Accueil • Animaux • Activités • Support • Profil + entrée Settings/Notifications dans Profil

**Admin** (refonte SlideMenu admin section) :
Dashboard admin • Utilisateurs (alias) • Abonnements • Crédits IA (AI Economy) • Stripe • Stripe Verify • Treasury • Tickets support • Modules • Conformité marketplace • Email diagnostics • Push status • Go-live check • Launch checklist • **Préférences admin** • **Diagnostics** (sous-section : test webhook, test marketplace P0)

### Étape C — Création/Réparation pages "Settings" par rôle

1. **`SettingsPage` (owner)** : déjà OK, ajouter section "Notifications push" + lien "Crédits IA" + lien "Abonnement" + lien "Préférences sections".
2. **Coach Settings** : nouvelle page `CoachSettings.tsx` (hub) qui regroupe : Profil pro (lien `/coach/profile`), Marketplace, Stripe Connect (lien existant ou via subscription), Notifications, Conformité (`/coach/compliance`), Charte (`/legal/charte-coach`), Abonnement, Crédits IA. Routée `/coach/settings`.
3. **Employee Settings** : nouvelle page `EmployeeSettings.tsx` minimaliste : Profil personnel, Notifications, Langue, Déconnexion. Routée `/employee/settings` ; ajouter onglet/CTA dans EmployeeNav ou EmployeeProfile.
4. **Shelter Settings** : déjà = `ShelterSettings`. Ajouter cartes manquantes (Notifications déjà via PushNotificationCard, Crédits IA, Abonnement déjà OK, Aide).
5. **Admin Settings** : alias `/admin/settings` → `AdminPreferences` (renommer carte UI "Paramètres administrateur").

### Étape D — Page Crédits IA dédiée
- Garder `Shop.tsx` comme page de référence (déjà historique + packs).
- Créer une **route alias** `/credits` (et déclinaisons `/coach/credits`, `/shelter/credits`, `/admin/credits`) → toutes pointent sur `Shop` qui s'adapte au rôle (déjà branché sur `useAIBalance`).
- Ajouter widget solde + lien "Acheter des crédits" dans :
  - `CoachLayout` (header)
  - `ShelterLayout` (header)
  - `EmployeeLayout` (header — lecture seule, pas d'achat)
  - Dashboard admin (carte AI Economy)

### Étape E — Nettoyage léger (sans suppression destructive)
- Masquer dans SlideMenu admin les pages de **diagnostic** (test-webhook, test-marketplace-p0) derrière un sous-groupe "Diagnostics" replié.
- Marquer en commentaire `// LEGACY` les routes alias `/program → /plan`, `/agents → /outils` (déjà présentes), aucun retrait.
- Aucune suppression de fichier dans cette passe (risque d'imports cachés). Documentation des candidats à archiver dans le rapport final.

### Étape F — UX friendly (microcopy)
- `NotFound.tsx` : message friendly ciblé DogWork (vérifier état actuel, adapter si générique).
- Empty states : ajouter à `CoachClients`, `ShelterAnimals`, `EmployeeAnimals`, `Documents` un message d'accueil orienté action si déjà absents (vérifier au passage).
- Guards de redirection : remplacer redirections silencieuses par toast informatif côté `CoachGuard`/`ShelterGuard`/`EmployeeGuard` (option : non bloquant pour cette passe si déjà acceptable).

### Étape G — Vérifications finales
- Build TS (automatique).
- Vérifier qu'aucun item de menu ne pointe vers une route 404.
- Vérifier que chaque rôle voit uniquement ses sections (déjà géré par `roles` dans SlideMenu).

---

## 3. Hors périmètre (à confirmer ensuite si tu veux)
- Création de **vraies** pages admin manquantes (`AdminUsers` réelle avec table `auth.users`, `AdminLogs` réelle, `AdminConfig` feature flags). Pour cette passe, on utilise des alias vers les pages existantes les plus proches afin de tenir la promesse du sitemap **sans inventer de fausses fonctionnalités**.
- Refonte profonde des dashboards (contenu) : la structure actuelle reste, on n'ajoute que les widgets crédits IA + liens Settings là où ils manquent.
- Migration backend / RLS : aucune modification.
- Stripe / billing logic : aucune modification.

---

## 4. Livrables attendus après exécution
- `App.tsx` enrichi (~20 routes alias ajoutées).
- `SlideMenu.tsx` refondu (sections par rôle complètes).
- `CoachNav.tsx`, `ShelterNav.tsx`, `EmployeeNav.tsx` enrichis ou laissés (mobile bottom nav reste 5–7 onglets, le SlideMenu prend le relais pour la profondeur).
- 2 nouvelles pages : `CoachSettings.tsx`, `EmployeeSettings.tsx`.
- Mise à jour mineure : `ShelterSettings.tsx` (cartes manquantes), `Settings.tsx` (liens manquants), layouts (widget crédits).
- Rapport final dans le message de réponse listant : routes ajoutées, pages intégrées, menus modifiés, doublons identifiés, éléments à archiver manuellement.

---

## 5. Risques & garde-fous
- Aucun fichier supprimé dans cette passe → zéro régression d'import.
- Aucun guard durci (les permissions backend RLS restent la vraie sécurité).
- Aliases plutôt que duplications → un seul composant par feature, plusieurs URLs.
- Si une page alias doit afficher un contenu différent par rôle, la logique reste dans la page (elle utilise déjà `useIsCoach`/`useIsShelter`/`is_admin`).

Périmètre estimé : ~10 fichiers édités, 2 fichiers créés. Pas de migration SQL, pas de touche backend.
