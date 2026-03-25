

# Plan : Audit complet et upgrade du système Refuge

## Problemes identifiés

1. **Auth headers manquants** — Les appels `create-educator` et `create-shelter` depuis AdminDashboard n'envoient PAS le header `Authorization`, donc les edge functions rejettent avec "Non autorisé"
2. **config.toml incomplet** — `generate-exercise-images` n'est pas déclaré (pas de `verify_jwt = false`)
3. **GuidedTour** — Warning `ref` avec framer-motion (cosmétique mais visible en console)
4. **Observations sans nom d'auteur** — Les observations refuge affichent une date mais pas le nom de l'employé qui l'a créée
5. **Admin ne voit pas la liste des refuges** — Pas de section listant les refuges existants
6. **Shelter n'a pas de hiérarchie admin** — Actuellement un seul niveau : le shelter user gère tout. Pas de distinction admin-refuge vs employé

## Plan d'implémentation

### Phase 1 : Corrections urgentes (bugs bloquants)

**A. Fix des appels Edge Functions dans AdminDashboard**
- `handleCreateEducator` : ajouter `headers: { Authorization: Bearer ${session.access_token} }` à `supabase.functions.invoke("create-educator")`
- `handleCreateShelter` : idem pour `create-shelter`
- Récupérer la session avant l'appel avec `supabase.auth.getSession()`

**B. config.toml** — ajouter :
```toml
[functions.generate-exercise-images]
verify_jwt = false
```

**C. Fix GuidedTour** — Wrapper le composant enfant de `AnimatePresence` avec `forwardRef`

### Phase 2 : Enrichir le dashboard Admin

- Ajouter une section collapsible "Refuges" listant tous les `shelter_profiles` avec nom, type, date de création
- Afficher le nombre d'employés par refuge
- Lien vers une vue détaillée (optionnel, phase ultérieure)

### Phase 3 : Hiérarchie Shelter + Horodatage

**A. Migration DB — Nouvelles tables et colonnes**

```sql
-- 1. Ajouter shelter_id aux employés pour permettre des comptes employés par refuge
ALTER TABLE shelter_employees ADD COLUMN IF NOT EXISTS job_title text DEFAULT '';

-- 2. Table de log d'actions horodatées par employé
CREATE TABLE shelter_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shelter_user_id uuid NOT NULL,
  employee_id uuid REFERENCES shelter_employees(id),
  animal_id uuid REFERENCES shelter_animals(id),
  action_type text NOT NULL DEFAULT 'observation',
  description text NOT NULL DEFAULT '',
  employee_name text NOT NULL DEFAULT '',
  employee_role text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE shelter_activity_log ENABLE ROW LEVEL SECURITY;
-- RLS: shelter voit ses propres logs, admin voit tout

-- 3. Table des espaces/boxes du refuge
CREATE TABLE shelter_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shelter_user_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  space_type text NOT NULL DEFAULT 'box',
  capacity integer DEFAULT 1,
  current_animal_id uuid REFERENCES shelter_animals(id),
  position_x integer DEFAULT 0,
  position_y integer DEFAULT 0,
  width integer DEFAULT 1,
  height integer DEFAULT 1,
  color text DEFAULT '#94a3b8',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE shelter_spaces ENABLE ROW LEVEL SECURITY;
```

**B. Mise à jour shelter_observations** — Ajouter `employee_id` et `employee_name` pour tracer qui a créé chaque observation

**C. Page Espaces du Refuge (`/shelter/spaces`)**
- Grille 2D interactive (pas 3D car trop lourd/complexe pour un MVP — la 3D sera une évolution future)
- Drag-and-drop d'animaux dans les boxes
- Chaque box affiche : nom de l'espace, animal assigné, statut
- Types d'espaces : box, enclos, infirmerie, quarantaine, promenade

**D. Mise à jour ShelterEmployees**
- Enrichir le formulaire avec un