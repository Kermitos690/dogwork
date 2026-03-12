

# Correction des bugs persistants

## Bugs identifiés

### 1. Contrainte `dogs_activity_level_check` — violation lors de la sauvegarde
La capture d'écran montre l'erreur : `new row for relation "dogs" violates check constraint "dogs_activity_level_check"`.

**Cause** : Quand `activity_level` est une chaîne vide `""` (valeur par défaut du Select non touché), la base refuse l'insertion car `""` n'est pas dans la liste autorisée `['faible', 'moyen', 'élevé', 'très élevé']`.

**Même problème pour** : `sex`, `size`, `origin`, `environment` — tous ont des CHECK constraints et peuvent être envoyés comme `""`.

### 2. Sliders comportementaux à 0 violent les CHECK constraints
Les sliders (`obedience_level`, `sociability_dogs`, etc.) commencent à `min={0}` mais les CHECK constraints imposent `>= 1 AND <= 5`. Sauvegarder sans toucher un slider envoie `0` → erreur.

### 3. Onboarding : même problème
Le flux d'onboarding envoie `activityLevel` (potentiellement vide) et d'autres champs texte vides directement dans l'insert.

## Corrections prévues

### A. `src/hooks/useDogs.tsx` — Nettoyer les données avant insert/update
Ajouter une fonction `cleanDogData()` qui :
- Convertit les chaînes vides en `null` pour `sex`, `size`, `activity_level`, `origin`, `environment`
- Convertit les valeurs `0` en `null` pour les champs numériques avec CHECK `>= 1`

Appliquer dans `useCreateDog` et `useUpdateDog`.

### B. `src/pages/DogProfile.tsx` — Slider min=1
Changer `min={0}` en `min={1}` dans le composant `SliderField` pour que les sliders ne puissent plus produire de valeur invalide.

### C. `src/pages/Onboarding.tsx` — Même nettoyage
Appliquer la même conversion `"" → null` dans `handleGenerate` pour les champs `sex`, `size`, `activityLevel`, `origin`, `environment` avant l'insert du chien.

### D. Vérification des champs Select vides
Dans `DogProfile.tsx`, s'assurer que les Select avec `value=""` envoient `null` et non `""`.

## Fichiers modifiés
- `src/hooks/useDogs.tsx` — fonction de nettoyage centralisée
- `src/pages/DogProfile.tsx` — slider min=1
- `src/pages/Onboarding.tsx` — nettoyage avant insert

