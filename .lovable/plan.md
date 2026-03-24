

## Plan : Préférences utilisateur — Personnalisation de l'application

### Ce qui sera ajouté

Une nouvelle page **Préférences** accessible depuis Settings et le SlideMenu, permettant à chaque utilisateur de personnaliser son expérience DogWork.

### 1. Nouvelle table `user_preferences`

```sql
CREATE TABLE public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  accent_color text NOT NULL DEFAULT 'blue',
  hide_chatbot boolean NOT NULL DEFAULT false,
  hide_read_aloud boolean NOT NULL DEFAULT false,
  hide_guided_tour boolean NOT NULL DEFAULT false,
  visible_sections jsonb NOT NULL DEFAULT '["journal","stats","exercises","courses","safety","messages"]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
-- RLS: users can read/update/insert their own preferences only
```

Les couleurs d'accent disponibles : `blue` (défaut), `purple`, `cyan`, `pink`, `emerald`, `amber`, `red`.

### 2. Hook `usePreferences`

Nouveau fichier `src/hooks/usePreferences.tsx` :
- Lit les préférences via React Query (clé `["user_preferences", userId]`)
- Fournit `updatePreference(key, value)` avec mutation optimiste
- Expose les valeurs par défaut si pas encore de row en base
- Fournit un `PreferencesProvider` qui applique la couleur d'accent en injectant un CSS class sur `<body>` (ex: `.accent-purple`)

### 3. Application des couleurs d'accent

Dans `src/index.css`, ajouter des classes de thème d'accent :

```css
.accent-purple { --primary: 270 80% 65%; --ring: 270 80% 65%; --neon-blue: 270 80% 65%; }
.accent-cyan   { --primary: 185 85% 55%; --ring: 185 85% 55%; --neon-blue: 185 85% 55%; }
.accent-pink   { --primary: 330 80% 60%; --ring: 330 80% 60%; --neon-blue: 330 80% 60%; }
.accent-emerald { --primary: 160 65% 45%; --ring: 160 65% 45%; --neon-blue: 160 65% 45%; }
.accent-amber  { --primary: 38 92% 55%;  --ring: 38 92% 55%;  --neon-blue: 38 92% 55%; }
.accent-red    { --primary: 0 72% 55%;   --ring: 0 72% 55%;   --neon-blue: 0 72% 55%; }
```

Ces classes n'interfèrent PAS avec les thèmes de rôle (`.theme-coach`, `.theme-admin`, `.theme-shelter`) car ils ne s'appliquent que quand on est dans l'espace utilisateur standard.

### 4. Application de la visibilité

- `AIChatBot.tsx` : vérifie `preferences.hide_chatbot` avant de rendre
- `FloatingReadAloud.tsx` : vérifie `preferences.hide_read_aloud`
- `SlideMenu.tsx` : filtre les sections selon `preferences.visible_sections`
- `AppLayout.tsx` : ne change pas (la nav bottom reste toujours visible)

### 5. Nouvelle page `src/pages/Preferences.tsx`

Interface avec 3 sections dans des cartes :

**🎨 Couleur d'accent**
- Grille de 7 cercles colorés cliquables (blue, purple, cyan, pink, emerald, amber, red)
- Le cercle sélectionné a un anneau + check

**👁️ Visibilité des modules**
- Liste de toggles (Switch) pour masquer/afficher : Journal, Statistiques, Exercices, Cours IRL, Sécurité, Messages
- Ces toggles contrôlent l'affichage dans le SlideMenu

**⚙️ Fonctionnalités**
- Toggle : Chatbot IA
- Toggle : Lecture à voix haute
- Toggle : Visite guidée automatique

### 6. Intégration dans le routing et la navigation

| Fichier | Changement |
|---|---|
| `src/App.tsx` | Ajouter route `/preferences` |
| `src/pages/Settings.tsx` | Ajouter carte "Préférences" avec lien vers `/preferences` |
| `src/components/SlideMenu.tsx` | Ajouter "Préférences" dans la section Compte |

### Fichiers créés/modifiés

| Fichier | Action |
|---|---|
| Migration SQL | Créer table `user_preferences` + RLS |
| `src/hooks/usePreferences.tsx` | **Créer** — hook + provider |
| `src/pages/Preferences.tsx` | **Créer** — page complète |
| `src/index.css` | Ajouter classes `.accent-*` |
| `src/App.tsx` | Ajouter route + wrap PreferencesProvider |
| `src/pages/Settings.tsx` | Ajouter lien Préférences |
| `src/components/SlideMenu.tsx` | Ajouter lien + filtrer sections |
| `src/components/AIChatBot.tsx` | Conditionner rendu sur préférences |
| `src/components/FloatingReadAloud.tsx` | Conditionner rendu sur préférences |

### Ce qui ne change PAS
- Les thèmes par rôle (coach, admin, shelter) restent prioritaires
- La barre de navigation bottom reste toujours visible
- Aucune modification des tables existantes
- L'export de données et la déconnexion restent dans Settings

