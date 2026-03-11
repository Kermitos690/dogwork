
-- Table d'avis/notation des cours
CREATE TABLE public.course_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  educator_user_id uuid NOT NULL,
  rating integer NOT NULL,
  comment text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(course_id, user_id)
);

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_review_rating()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_review_rating
  BEFORE INSERT OR UPDATE ON public.course_reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_review_rating();

ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own reviews" ON public.course_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can view reviews" ON public.course_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own reviews" ON public.course_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Fix coach_profiles: allow public read for course display
DROP POLICY IF EXISTS "Coaches can view own profile" ON public.coach_profiles;
CREATE POLICY "Anyone can view coach profiles" ON public.coach_profiles FOR SELECT TO authenticated USING (true);

-- Allow educators to read profiles of their clients (for coach features)
DROP POLICY IF EXISTS "Educators can view client profiles" ON public.profiles;
CREATE POLICY "Educators can view client profiles" ON public.profiles FOR SELECT TO authenticated USING (
  is_educator() OR is_admin() OR auth.uid() = user_id
);
