
Objectif: faire un audit complet (logique, routes, rôles, génération de plans, sécurité) puis corriger sans casse, par lots sûrs et testables.

1) Constats critiques déjà vérifiés
- Blocage “Impossible de valider l’exercice” confirmé par logs:
  - erreur SQL `23505 duplicate key` sur `day_progress_dog_id_day_id_key`.
- Répétition des exercices:
  - générateur encore basé sur des listes de slugs hardcodées (pool limité), donc répétitions rapides malgré 480 fiches enrichies.
- Implémentation abonnements incomplète:
  - 15 templates Free présents, 0 template Pro en base, frontend non branché sur `is_template/template_tier`.
- Conflits rôles/routes:
  - `useDogs()` charge tous les chiens visibles (admin voit tout), puis les écrans owner écrivent sur ces chiens -> collisions de progression.
- Audit sécurité:
  - `coach_profiles` expose des données sensibles (exposition de `stripe_account_id` via SELECT large).
  - éducateurs ne peuvent pas mettre à jour les bookings (gap fonctionnel/politiques).

2) Lot A — Stabilisation immédiate (bloquant utilisateur)
- `Training.tsx` + `DayDetail.tsx`
  - remplacer logique insert/update fragile par `upsert` sur `day_progress` (clé `dog_id, day_id`) avec mise à jour atomique.
  - gérer explicitement les erreurs DB (toast précis), et éviter doubles insert concurents.
- `useDogs.tsx`
  - scoper la query au propriétaire (`eq("user_id", user.id)`) pour les parcours owner.
- `App.tsx` (routing racine)
  - corriger redirection admin par défaut vers `/admin` pour éviter qu’un compte admin “tombe” dans le flux owner avec des données globales.
- Vérification post-correctif:
  - valider un exercice + valider un jour + reprise séance incomplète sans erreur SQL.

3) Lot B — Variété réelle des plans (fin des répétitions)
- `planGenerator.ts`
  - abandonner la dépendance principale aux tableaux de slugs statiques.
  - construire des pools dynamiques depuis la base (tags, `priority_axis`, `target_problems`, niveau, compatibilités profil).
  - introduire un anti-répétition multi-jours:
    - mémoire glissante (N derniers jours),
    - cooldown par slug,
    - couverture minimale avant réutilisation.
  - fallback intelligent si pool faible (sans dupliquer dans la même journée).
- `Plan.tsx`
  - régénération: invalider proprement l’ancien plan actif et recréer avec nouvelle logique.
- Migration de données:
  - script de régénération des plans actifs impactés par répétition (option ciblée par chien).

4) Lot C — Brancher correctement les tiers (Free/Pro/Expert)
- Backend data:
  - compléter les templates Pro manquants (50 attendus), vérifier cohérence `template_tier`, `template_category`, `total_days`.
- Frontend:
  - `Plan.tsx` + hooks subscription:
    - Free: accès catalogue 15 templates.
    - Pro/Intermédiaire: accès 50 templates.
    - Expert: génération IA améliorée (personnalisation avancée + adaptation continue).
- UX:
  - séparation claire “Plan préconstruit” vs “Plan IA Expert”.
  - garde-fous quand un tier n’a pas accès à une action.

5) Lot D — Routes, guards et permissions inter-comptes
- Audit et correction des guards (`AdminGuard`, `CoachGuard`, `ShelterGuard`) pour éviter routes ambiguës.
- Vérifier toutes les pages qui utilisent des données “globales” sans filtre utilisateur.
- Normaliser les query keys React Query pour éviter collisions cache entre rôles/contexte (owner/coach/shelter/admin).

6) Lot E — Sécurité/RLS sans régression produit
- `coach_profiles`
  - retirer l’exposition sensible:
    - soit policy SELECT restreinte,
    - soit split des colonnes sensibles vers table privée.
- `course_bookings`
  - ajouter policy UPDATE éducateur limitée à ses propres cours (pas globale).
- Repasser linter + scan sécurité après correctifs.

7) QA non-régression (obligatoire avant clôture)
- Parcours E2E à rejouer:
  - Owner: onboarding -> plan -> training -> validation jour -> stats.
  - Admin: dashboard admin + aucune écriture involontaire dans flux owner.
  - Coach: gestion bookings + notes.
  - Shelter: ajout éducateur + employés.
- Tests spécifiques bug actuel:
  - plus aucune erreur `duplicate key day_progress` au clic “Terminer”.
  - variation visible des exercices sur plusieurs jours.
- Contrôles data:
  - intégrité `day_progress` (1 ligne par `dog_id/day_id`),
  - cohérence plans actifs/templates par tier.

Détails techniques (implémentation)
- Fichiers principaux:
  - `src/pages/Training.tsx`
  - `src/pages/DayDetail.tsx`
  - `src/hooks/useDogs.tsx`
  - `src/App.tsx`
  - `src/lib/planGenerator.ts`
  - `src/pages/Plan.tsx`
  - migrations SQL RLS (coach_profiles, course_bookings)
- Stratégie anti-casse:
  - livrer par lots A->E,
  - vérifier chaque lot en preview avant suivant,
  - ne pas modifier les fichiers auto-générés d’intégration backend.

Résultat attendu
- Validation d’exercice fiable (plus d’erreur rouge).
- Plans réellement variés, exploitant les 480 exercices enrichis.
- Tiers Free/Pro/Expert appliqués correctement.
- Routes/rôles sécurisés et cohérents.
- Aucun conflit RLS bloquant sur les flux métier.
