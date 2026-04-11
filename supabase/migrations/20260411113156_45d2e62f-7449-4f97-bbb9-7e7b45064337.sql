
-- Allow anonymous (public) users to read exercises
CREATE POLICY "Public can view exercises"
ON public.exercises
FOR SELECT
TO anon
USING (true);

-- Allow anonymous (public) users to read exercise categories
CREATE POLICY "Public can view exercise_categories"
ON public.exercise_categories
FOR SELECT
TO anon
USING (true);
