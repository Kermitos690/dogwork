

# Plan : Enrichissement ultra-complet des exercices, images AI, progression verrouillée et finalisation Shelter

## Contexte

L'utilisateur constate que les exercices du plan personnalisé manquent de détails pratiques (quoi dire, comment se tenir, quoi faire en cas de difficulté, critères de validation concrets). Il veut aussi des images/illustrations générées par IA pour chaque tutoriel, une progression chronologique stricte (pas de saut de jour), et la finalisation du compte Shelter avec communication admin.

---

## 1. Enrichissement IA v2 — Prompt ultra-détaillé

**Problème** : Le prompt actuel produit des tutoriels trop génériques (5-8 étapes courtes). Il manque les consignes verbales exactes, le positionnement du corps, la gestion de la laisse, les signaux d'arrêt, et les critères de validation précis.

**Solution** : Réécrire le prompt de `enrich-exercises/index.ts` pour exiger :

- **Consignes vocales exactes** : "Dites 'Assis' d'un ton calme, une seule fois"
- **Position du corps** : "Tenez-vous droit, bras le long du corps, laisse détendue"
- **Gestion de la laisse** : tension, longueur, quand relâcher
- **Que faire si le chien ne réagit pas** : attendre 3 secondes, ne pas répéter, repositionner
- **Que faire si le chien s'énerve** : protocole de désescalade clair
- **Critère de validation précis** : "L'exercice est réussi quand le chien maintient la position 5 secondes sans aide, 3 fois sur 5 tentatives"
- **Signaux d'arrêt** : halètement excessif, détournement de tête, bâillements répétés

Ajout de nouveaux champs au tool schema :
- `voice_commands` : liste des commandes vocales exactes avec ton
- `body_positioning` : posture du maître à chaque étape
- `troubleshooting` : tableau "Si... alors..." pour les cas difficiles
- `validation_protocol` : protocole de validation chiffré

**Migration DB** : Ajouter les colonnes `voice_commands jsonb`, `body_positioning jsonb`, `troubleshooting jsonb`, `validation_protocol text` à la table `exercises`.

---

## 2. Génération d'illustrations AI par exercice

**Problème** : Les fiches affichent un placeholder "Photo tutoriel" vide.

**Solution** : Utiliser le modèle `google/gemini-3.1-flash-image-preview` via l'Edge Function pour générer une illustration par exercice.

- Créer une Edge Function `generate-exercise-image` qui :
  1. Prend un exercise ID
  2. Génère un prompt d'illustration pédagogique (dessin schématique clair, style flat/line-art, fond neutre, sans texte superposé)
  3. Convertit le base64 en fichier et l'upload dans un bucket Storage `exercise-images`
  4. Met à jour `exercises.cover_image` avec l'URL publique

- Créer le bucket Storage `exercise-images` (public)
- Ajouter un bouton "Générer les illustrations" dans AdminDashboard avec boucle batch similaire à l'enrichissement texte
- Style des illustrations : **dessins schématiques ligne claire** montrant la posture humain + chien, sans texte superposé, fond blanc/transparent

**Affichage** dans `ExerciseDetail.tsx` :
- Image responsive avec `object-contain` (jamais de chevauchement)
- Fallback avec icône si pas d'image
- Images dans les étapes du tutoriel si pertinent

---

## 3. Progression chronologique verrouillée

**Problème** : L'utilisateur peut sauter des jours dans le plan.

**Solution** dans `DayDetail.tsx` et `Plan.tsx` :
- Vérifier que le jour précédent est `validated: true` avant de permettre l'accès au jour suivant
- Afficher un cadenas sur les jours non débloqués
- Seul le jour actuel (premier non-validé) et les jours précédents sont accessibles
- Message explicatif si l'utilisateur tente d'accéder à un jour verrouillé

---

## 4. Affichage enrichi dans ExerciseDetail.tsx

Refonte de la page pour afficher les nouveaux champs :
- Section **"Que dire et comment"** : commandes vocales avec ton, volume, timing
- Section **"Position du corps"** : posture à chaque étape
- Section **"En cas de difficulté"** : tableau troubleshooting interactif
- Section **"Validation"** : protocole chiffré clair
- Section **"Signaux d'arrêt"** : critères visuels d'arrêt

Responsive : toutes les sections en `flex-col`, images `w-full max-w-full`, aucun `overflow-hidden` qui cache du contenu.

---

## 5. Finalisation Shelter + Communication Admin

### Navigation Shelter enrichie
Ajouter dans `ShelterNav.tsx` :
- **Messages** (lien vers `/messages`)
- **Profil** (lien vers `/shelter/profile`)

### Communication Shelter ↔ Admin
- Le compte Shelter doit pouvoir envoyer des messages à l'admin via la messagerie existante
- Ajouter un bouton "Contacter l'admin" dans le dashboard Shelter qui ouvre directement une conversation avec le premier admin trouvé
- L'admin voit les messages Shelter dans sa page Messages

### Vérification fonctionnelle
- S'assurer que `ShelterGuard` redirige correctement
- Vérifier que les RLS policies permettent la messagerie cross-rôles (déjà OK via la table `messages`)
- Vérifier que le formulaire d'ajout d'animal fonctionne end-to-end

---

## 6. Responsiveness globale

- Audit de `ExerciseDetail.tsx`, `DayDetail.tsx`, `Training.tsx` : remplacer tout `truncate` inapproprié par `break-words`
- Images : `w-full h-auto max-w-full object-contain` systématique
- Aucun texte sous une image : layout vertical strict
- Tester les breakpoints : 320px (petit Android), 375px (iPhone), 768px (tablette), 1024px+ (desktop)

---

## Ordre d'implémentation

1. Migration DB (nouveaux champs exercises)
2. Mise à jour Edge Function enrichissement v2
3. Bucket Storage + Edge Function génération images
4. Refonte ExerciseDetail.tsx (nouveaux champs + responsive)
5. Verrouillage progression chronologique
6. Navigation Shelter + bouton contact admin
7. Audit responsive global

---

## Fichiers impactés

| Fichier | Modification |
|---|---|
| `supabase/functions/enrich-exercises/index.ts` | Prompt v2 ultra-détaillé |
| `supabase/functions/generate-exercise-image/index.ts` | Nouvelle fonction |
| `src/pages/ExerciseDetail.tsx` | Affichage enrichi + responsive |
| `src/pages/DayDetail.tsx` | Verrouillage progression |
| `src/pages/Plan.tsx` | Cadenas jours non débloqués |
| `src/pages/AdminDashboard.tsx` | Bouton génération images |
| `src/components/ShelterNav.tsx` | Ajout Messages + Profil |
| `src/pages/ShelterDashboard.tsx` | Bouton contact admin |
| Migration SQL | Nouvelles colonnes exercises + bucket |

