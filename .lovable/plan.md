

## Plan : Intégrer les exercices enrichis dans la génération de plans IA

### Problème actuel
Le générateur de plans (`planGenerator.ts`) référence des IDs d'exercices inexistants (`lib-stop-1`, `lib-focus-1`, etc.) qui ne correspondent à aucun exercice réel. Les exercices générés dans les plans ont donc des instructions vides ou génériques. Les 480+ exercices enrichis en base de données (avec voice_commands, body_positioning, troubleshooting, tutorial_steps, etc.) ne sont jamais utilisés.

### Ce qui va changer

**1. Supprimer tous les plans existants en base**
- Migration SQL : `DELETE FROM training_plans;` pour forcer la régénération.

**2. Refactorer le générateur de plans pour utiliser les vrais exercices**
- Remapper les axes vers les vrais IDs d'exercices du `EXERCISE_LIBRARY` :
  - `securite` → `ctrl-stop`, `marche-demitour`, `focus-regarde`
  - `focus` → `focus-regarde`, `focus-mvt`, `focus-distraction`
  - `reactivite_chiens` → `react-seuil`, `focus-regarde`, `marche-demitour`
  - `marche` → `marche-laisse`, `ctrl-stop`
  - etc.

**3. Enrichir le type `PlanExercise` avec les données DB**
- Ajouter les champs : `description`, `slug`, `voiceCommands`, `bodyPositioning`, `troubleshooting`, `validationProtocol`, `tutorialSteps`
- Le `buildExercisesForAxis` cherchera d'abord dans `EXERCISE_LIBRARY` pour les données de base, et le plan stockera le `slug` pour permettre un lien vers la fiche complète enrichie en DB.

**4. Modifier `DayDetail.tsx` pour afficher les exercices clairement**
- Chaque exercice dans le plan affichera :
  - Description claire et détaillée
  - Lien "Voir la fiche complète" vers `/exercises/{slug}`
  - Instructions étape par étape (tutorial_steps résumés)
- Au lieu d'un simple texte compressé dans `instructions`, afficher les steps de façon lisible.

**5. Modifier `Training.tsx` pour exploiter les données enrichies**
- Afficher les instructions détaillées pendant le mode entraînement.

### Fichiers modifiés
| Fichier | Changement |
|---|---|
| `src/lib/planGenerator.ts` | Remapper les IDs, enrichir PlanExercise, ajouter slug/description |
| `src/pages/DayDetail.tsx` | Afficher exercices avec description + lien fiche + steps |
| `src/pages/Training.tsx` | Instructions détaillées en mode entraînement |
| `src/types/index.ts` | Mettre à jour le type Exercise si nécessaire |
| Migration SQL | `DELETE FROM training_plans` |

### Résultat attendu
Quand un utilisateur génère un plan IA, chaque jour contiendra des exercices avec :
- Un nom clair
- Une description vulgarisée de 3-5 phrases
- Des instructions étape par étape
- Un lien vers la fiche complète (avec commandes vocales, positionnement, troubleshooting)
- Des critères de validation précis

