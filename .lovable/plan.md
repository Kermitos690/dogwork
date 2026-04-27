## Audit des modules par rôle

### État actuel en base (15 modules)

| Module | Rôles autorisés | Catégorie |
|---|---|---|
| animal_management | owner, adopter, educator, shelter | éducation |
| exercise_library | owner, educator, shelter | éducation |
| ai_plans | owner, educator, shelter | ia |
| ai_chatbot | owner, educator, shelter, adopter | ia |
| progress_journal | owner, educator, shelter | suivi |
| behavior_stats | owner, educator, shelter | suivi |
| educator_crm | educator | professionnel |
| planning | educator, shelter | professionnel |
| payments_marketplace | educator | commerce |
| shelter_management | shelter | refuge |
| adoption_followup | shelter, adopter | adoption |
| team_permissions | educator, shelter | organisation |
| pdf_exports | owner, educator, shelter | documents |
| branding | educator, shelter | image |
| messaging | owner, educator, shelter, adopter | communication |

### Incohérences détectées

**1. Le rôle `shelter_employee` n'apparaît dans AUCUN module.**
Or `EmployeeNav`, `EmployeeDashboard`, `EmployeeAnimals`, `EmployeeActivity`, `EmployeeProfile` existent. Un employé refuge devrait au minimum avoir accès à : `animal_management`, `progress_journal`, `messaging` (en lecture/contribution selon RLS).

**2. Le rôle `adopter` reçoit `animal_management` complet** alors qu'un adoptant ne crée pas de fiches : il consulte la fiche de SON chien adopté + son suivi post-adoption. C'est trop large.

**3. `exercise_library` exclut `adopter`** alors que la doctrine adoption prévoit que l'adoptant suit un plan post-adoption (qui s'appuie sur des exercices). Incohérent avec `ai_plans` et le suivi post-adoption.

**4. `pdf_exports` exclut `adopter`** : un adoptant devrait pouvoir exporter le carnet/dossier de son chien adopté.

**5. `branding` est ouvert à `educator` ET `shelter`** : OK, mais aucune distinction de niveau (page publique educator ≠ page publique refuge). C'est plus un point de feature gating dans le module que de rôle — acceptable en l'état.

**6. `planning` ouvert à `educator` + `shelter`** : OK pour shelter (RDV adoption, visites), mais à confirmer si le refuge a vraiment un module planning fonctionnel aujourd'hui. Si ce n'est pas livré côté UI shelter, le module ne devrait pas apparaître pour eux (faux marketing).

**7. Aucun module spécifique adoption pour l'owner** : un owner devenu adoptant devrait basculer naturellement, mais la séparation `owner` vs `adopter` n'est pas explicite dans `useAuth` ni dans les guards (à vérifier — probablement même rôle techniquement).

### Corrections proposées (migration unique)

UPDATE des `available_for_roles` :

```sql
-- 1. Ajouter shelter_employee là où c'est légitime (lecture des animaux du refuge)
UPDATE modules SET available_for_roles = ARRAY['owner','adopter','educator','shelter','shelter_employee']
  WHERE slug = 'animal_management';
UPDATE modules SET available_for_roles = ARRAY['owner','educator','shelter','shelter_employee']
  WHERE slug = 'progress_journal';
UPDATE modules SET available_for_roles = ARRAY['owner','educator','shelter','adopter','shelter_employee']
  WHERE slug = 'messaging';
UPDATE modules SET available_for_roles = ARRAY['shelter','shelter_employee']
  WHERE slug = 'shelter_management';

-- 2. Élargir aux adoptants ce qui est cohérent avec le suivi post-adoption
UPDATE modules SET available_for_roles = ARRAY['owner','educator','shelter','adopter']
  WHERE slug = 'exercise_library';
UPDATE modules SET available_for_roles = ARRAY['owner','educator','shelter','adopter']
  WHERE slug = 'pdf_exports';

-- 3. (Optionnel — à confirmer) Restreindre planning au seul educator si shelter n'a pas l'UI
-- À NE PAS faire si /shelter dispose d'un planning RDV adoption fonctionnel.
```

### Vérifications complémentaires (lecture seule)

- Vérifier que `useAuth` / les guards reconnaissent bien `shelter_employee` comme rôle distinct
- Vérifier que `get_my_active_modules` (RPC) retourne bien les modules selon le rôle de l'utilisateur (et pas seulement selon les `user_modules` provisionnés)
- Vérifier que `plan_modules` (provisioning par plan) attribue cohéremment ces modules par rôle

### Livrables

1. **Migration SQL** : 6 UPDATE ci-dessus + commentaires
2. **Note** : si `planning` côté shelter n'existe pas dans l'UI, ajouter un 7e UPDATE pour le retirer
3. **Aucun changement frontend nécessaire** — `Modules.tsx` lit `available_for_roles` dynamiquement

### Points de décision

- **Question 1** : Faut-il ajouter `shelter_employee` aux modules listés (animal_management, progress_journal, messaging, shelter_management) ? **Recommandé : oui**.
- **Question 2** : Faut-il ouvrir `exercise_library` + `pdf_exports` aux adoptants ? **Recommandé : oui** (cohérent avec adoption_followup).
- **Question 3** : Le module `planning` est-il réellement implémenté côté `/shelter` ? Si non, le retirer de `shelter`.
