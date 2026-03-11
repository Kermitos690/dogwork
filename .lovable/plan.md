

# Alignement des données et libellés sur la structure demandée

## Changements identifiés

### 1. `src/data/program.ts` — Aligner les 28 jours sur le format exact
- **Durées** : `"15-20 min"` → `"15 à 20 min"`, `"10-15 min"` → `"10 à 15 min"`, etc.
- **Fonctions** en minuscules : `["Focus", "Tapis", "Observation"]` → `["focus", "tapis", "observation"]`
- **Instructions** : reformuler pour coller au texte fourni (ex: "Prononcer le nom une fois. Récompenser dès que le chien regarde." au lieu de "Appelez le nom du chien et récompensez dès qu'il vous regarde.")
- **timerSuggested** : passer de `null` à des valeurs concrètes (`60`, `90`) comme dans l'exemple fourni
- **Jour 1** : retirer l'exercice `"1-4" (Note de départ)` qui n'est pas dans la spec utilisateur
- **Objectifs et vigilance** : utiliser les formulations exactes avec ponctuation (ex: ajout de points finaux)
- Appliquer ces corrections sur les 28 jours

### 2. `src/pages/Index.tsx` — Titres et sous-titres
- Titre principal : `"Mon défi 28 jours"` (au lieu de `"Défi Canin 28 Jours"`)
- Sous-titre : ajouter un des sous-titres demandés (ex: `"Reste sous seuil. Travaille proprement."`)
- Libellés : `"Jour actuel"`, `"Progression globale"`, `"Reprendre aujourd'hui"`, `"Voir le programme"`
- Bouton CTA : `"Reprendre aujourd'hui"` (déjà correct)

### 3. `src/pages/Program.tsx` — Titre
- `"Programme 28 jours"` → `"Programme"` avec sous-titre `"Neutralité, contrôle, progression."`

### 4. `src/pages/Training.tsx` — Libellés boutons
- `"Chronomètre"` → `"Démarrer le chronomètre"`
- `"Répétitions"` → `"Compteur de répétitions"`
- Bouton : `"Terminer et suivant"` → `"Terminer l'exercice"` / `"Passer au suivant"` séparés
- Titre : `"Mode entraînement"` en header

### 5. `src/pages/BehaviorLog.tsx` — Libellés
- Titre : `"Suivi comportemental"` (déjà correct)
- Labels : vérifier concordance exacte (`"Saut sur humain"`, `"Aboiement"`, `"Écoute du stop"`, `"Écoute du non"`, `"Focus sur moi"`, `"Marche en laisse"`, `"Niveau de tension"`, `"Réaction aux chiens"`, `"Distance de confort"`, `"Récupération"`, `"Commentaires"`)
- Bouton : `"Enregistrer"` (déjà correct)

### 6. `src/pages/Stats.tsx` — Libellés
- `"Progression"` → `"Score de progression"`
- `"Tension moyenne"` → `"Moyenne tension"`
- `"Réactivité moy."` → `"Moyenne réactivité"`

### 7. `src/pages/Settings.tsx` — Libellés boutons
- `"Remettre à zéro"` → `"Réinitialiser les données"` / `"Remettre le programme à zéro"`
- `"Exporter en JSON"` → `"Exporter"`
- Labels : `"Exporter mes données"`, `"Réinitialiser"`

### 8. `src/pages/DayDetail.tsx` — Libellés
- `"Mode entraînement"` (bouton, déjà correct)
- `"Marquer en cours"` (déjà correct)
- `"Valider ce jour"` (déjà correct)
- `"Enregistrer mes notes"` (déjà correct)

### 9. `src/components/BottomNav.tsx` — Labels navigation
- Déjà correct : `"Accueil"`, `"Programme"`, `"Entraînement"`, `"Suivi"`, `"Stats"`

## Détails techniques

| Fichier | Nature des changements |
|---|---|
| `src/data/program.ts` | Reformulation des 28 jours (durées, instructions, timerSuggested, fonctions minuscules) |
| `src/pages/Index.tsx` | Titres et sous-titres |
| `src/pages/Program.tsx` | Titre et sous-titre |
| `src/pages/Training.tsx` | Labels chronomètre, répétitions, boutons |
| `src/pages/Stats.tsx` | Labels statistiques |
| `src/pages/Settings.tsx` | Labels boutons export/reset |

