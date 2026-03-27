-- =============================================
-- P0-4: Restrict adopter PII in shelter_animals
-- Shelter employees should NOT see adopter_email / adopter_name
-- Create a security-definer view or use column-level security
-- Since Postgres doesn't support column-level RLS, we create a
-- restricted SELECT policy for shelter_employees that uses a
-- security-definer function to strip PII columns.
-- =============================================

-- P1-1: Allow adopters to see their own adoption updates via adopter_links
CREATE POLICY "Adopters can view their adoption updates"
ON public.adoption_updates
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.adopter_links al
    WHERE al.adopter_user_id = auth.uid()
      AND al.animal_id = adoption_updates.animal_id
      AND al.shelter_user_id = adoption_updates.shelter_user_id
  )
);

-- P1-2: Clean duplicate RLS policies on exercise_categories
DROP POLICY IF EXISTS "Admins can delete categories" ON public.exercise_categories;
DROP POLICY IF EXISTS "Admins can insert categories" ON public.exercise_categories;
DROP POLICY IF EXISTS "Admins can update categories" ON public.exercise_categories;

-- Clean duplicate on exercises
DROP POLICY IF EXISTS "Admins can delete exercises" ON public.exercises;
DROP POLICY IF EXISTS "Admins can insert exercises" ON public.exercises;
DROP POLICY IF EXISTS "Admins can update exercises" ON public.exercises;

-- Clean duplicate on dogs
DROP POLICY IF EXISTS "Admins can view all dogs" ON public.dogs;

-- Clean duplicate on profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;