

# Plan : Correction redirection éducateur + Espace Refuge

## Partie 1 — Correction de la redirection éducateur

**Problème** : Dans `ProtectedRoutes` (App.tsx L72-79), quand un éducateur se connecte sans chien, `onboardingInProgress = true` → redirigé vers `/onboarding` au lieu de `/coach`.

**Correction** : Ajouter un appel à `useIsCoach()` dans `ProtectedRoutes`. Si l'utilisateur est éducateur et n'a pas de chien, rediriger vers `/coach` (qui redirigera vers `/coach/subscription` via CoachGuard si pas d'abonnement actif).

**Fichier** : `src/App.tsx`
- Importer `useIsCoach`
- Ajouter `const { data: isCoach, isLoading: coachLoading } = useIsCoach();`
- Attendre `coachLoading` dans le loading state
- Changer la route `/` : si éducateur sans chien → `/coach`, sinon si pas de chien → `/onboarding`

---

## Partie 2 — Espace Refuge (MVP)

### 2.1 Nouveau rôle `shelter`

**Migration SQL** :
- Ajouter `'shelter'` à l'enum `app_role`
- Créer la table `shelter_profiles` (nom du refuge, adresse, téléphone, type d'organisme, user_id)
- Créer la table `shelter_animals` (nom, espèce [chien/chat/reptile/oiseau/NAC/autre], race, sexe, âge estimé, statut [arrivée/quarantaine/soins/adoptable/adopté/décédé/transféré], photo_url, description, date d'arrivée, date de sortie, puce/ID, user_id du refuge)
- Créer la table `shelter_observations` (animal_id, date, type [médical/comportement