

# Plan : Refonte complète de l'architecture Coach/Admin/User + Calendrier + Avis + Emails

## Problemes identifiés

1. **Coach: navigation cassée** — Le `CoachDashboard` utilise `AppLayout` (BottomNav utilisateur) au lieu d'un layout coach dédié avec `CoachNav`. Le coach voit l'interface utilisateur standard.
2. **Admin non protégé** — La route `/admin` n'a pas de guard (ligne 102 de App.tsx), n'importe qui peut y accéder.
3. **Admin/Coach sans accès premium** — Le chatbot IA et le plan personnalisé sont bloqués par l'abonnement pour admin et coach.
4. **Pas de vue calendrier coach** — Manque une page `/coach/calendar` avec toutes les sessions et réservations.
5. **Pas de système d'avis** — Aucune table `course_reviews` ni page pour noter les éducateurs après un cours.
6. **Pas de notifications email** — Aucun email envoyé lors de la création de cours, approbation, ou réservation.
7. **Devises incohérentes** — CoachCourses affiche "€" au lieu de "CHF".
8. **Coach profiles RLS** — `coach_profiles` n'est lisible que par le coach lui-même, mais la page Courses publique essaie de lire les profils des éducateurs → les noms ne s'affichent pas.

## Plan d'implémentation

### 1. Créer un layout dédié Coach
- Créer `CoachLayout.tsx` qui wrap les enfants avec `CoachNav` (pas `AppLayout`/`BottomNav`)
- Remplacer `AppLayout` par `CoachLayout` dans toutes les pages coach (`CoachDashboard`, `CoachCourses`, `CoachClients`, etc.)
- Ajouter "Calendrier" dans `CoachNav`

### 2. Protéger la route Admin + bypass abonnement
- Wraper `/admin` avec un `AdminGuard` (vérifie `is_admin()`)
- Modifier `useHasFeature` pour retourner `true` si l'utilisateur a le rôle `admin` ou `educator` (bypass abonnement)
- Cela donne automatiquement accès au chatbot IA et plan personnalisé aux comptes admin et coach

### 3. Base de données : nouvelles tables + corrections

**Migration SQL :**
```sql
-- Table d'avis/notation des cours
CREATE TABLE public.course_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  educator_user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(course_id, user_id)
);
ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;

-- RLS: utilisateurs voient leurs propres avis, tous peuvent lire les avis approuvés
CREATE POLICY "Users can insert own reviews" ON public.course_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can view reviews" ON public.course_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own reviews" ON public.course_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Permettre la lecture publique des coach_profiles (pour afficher les noms)
CREATE POLICY "Anyone can view coach profiles" ON public.coach_profiles FOR SELECT TO authenticated USING (true);
-- Supprimer l'ancienne policy restrictive
DROP POLICY IF EXISTS "Coaches can view own profile" ON public.coach_profiles;
```

### 4. Vue Calendrier Coach (`/coach/calendar`)
- Nouvelle page `CoachCalendar.tsx`
- Affiche les cours et réservations du coach sous forme de calendrier mensuel
- Utilise le composant `Calendar` existant avec des marqueurs sur les jours ayant des sessions
- Liste détaillée des sessions du jour sélectionné avec nombre d'inscrits

### 5. Système d'avis et notation
- Nouvelle page ou section dans `/courses` permettant aux utilisateurs ayant un booking "confirmed" + "paid" de laisser un avis (1-5 étoiles + commentaire)
- Affichage de la note moyenne et des avis sur chaque carte de cours public
- Les éducateurs voient les avis reçus dans leur espace coach

### 6. Notifications email (transactional)
- Créer une edge function `send-notification-email` utilisant le système d'emails Lovable
- Déclencher un email dans les cas suivants :
  - **Cours créé par un coach** → email à l'admin (teba.gaetan@gmail.com) pour validation
  - **Cours approuvé/refusé** → email au coach
  - **Réservation confirmée** → email à l'utilisateur + au coach
- Appels ajoutés dans les mutations existantes (création cours, approbation, confirmation paiement)

### 7. Corrections diverses
- Remplacer "€" par "CHF" dans `CoachCourses.tsx`
- Ajouter la route `/coach/calendar` dans `App.tsx` avec `CoachGuard`
- Ajouter un lien "Calendrier" dans le `CoachNav`

### Fichiers à créer
- `src/components/CoachLayout.tsx`
- `src/components/AdminGuard.tsx`
- `src/pages/CoachCalendar.tsx`
- `supabase/functions/send-notification-email/index.ts`

### Fichiers à modifier
- `src/App.tsx` — AdminGuard, route calendrier
- `src/hooks/useSubscription.tsx` — bypass pour admin/educator
- `src/components/CoachNav.tsx` — ajout Calendrier
- `src/pages/CoachDashboard.tsx` — utiliser CoachLayout
- `src/pages/CoachCourses.tsx` — CoachLayout + CHF + appel email
- `src/pages/CoachClients.tsx`, `CoachDogs.tsx`, `CoachNotes.tsx`, `CoachStats.tsx`, `CoachDogDetail.tsx` — CoachLayout
- `src/pages/AdminDashboard.tsx` — appel email à l'approbation
- `src/pages/Courses.tsx` — affichage avis + formulaire d'avis
- Migration SQL pour `course_reviews` + fix RLS `coach_profiles`

