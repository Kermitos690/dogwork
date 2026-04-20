-- Tighten shelter_observations insert policy: restrict from {public} to {authenticated}
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'shelter_observations'
      AND policyname = 'Shelter employees can insert observations'
  ) THEN
    EXECUTE 'DROP POLICY "Shelter employees can insert observations" ON public.shelter_observations';
  END IF;
END $$;

CREATE POLICY "Shelter employees can insert observations"
ON public.shelter_observations
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_shelter_employee()
  AND author_id = auth.uid()
);