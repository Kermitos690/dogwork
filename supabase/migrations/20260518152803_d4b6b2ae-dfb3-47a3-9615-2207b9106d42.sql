
-- Helper: confirme qu'un dog_id appartient à un client lié au coach courant (lien actif)
CREATE OR REPLACE FUNCTION public.coach_can_access_dog(_dog_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.dogs d
    JOIN public.client_links cl
      ON cl.client_user_id = d.user_id
     AND cl.coach_user_id = auth.uid()
     AND cl.status = 'active'
    WHERE d.id = _dog_id
  );
$$;

-- dog_walks : SELECT
DROP POLICY IF EXISTS "Coaches read walks of client dogs" ON public.dog_walks;
CREATE POLICY "Coaches read walks of client dogs"
ON public.dog_walks FOR SELECT
TO authenticated
USING (public.coach_can_access_dog(dog_id));

-- dog_walks : INSERT
DROP POLICY IF EXISTS "Coaches insert walks for client dogs" ON public.dog_walks;
CREATE POLICY "Coaches insert walks for client dogs"
ON public.dog_walks FOR INSERT
TO authenticated
WITH CHECK (public.coach_can_access_dog(dog_id));

-- dog_walks : UPDATE
DROP POLICY IF EXISTS "Coaches update walks of client dogs" ON public.dog_walks;
CREATE POLICY "Coaches update walks of client dogs"
ON public.dog_walks FOR UPDATE
TO authenticated
USING (public.coach_can_access_dog(dog_id))
WITH CHECK (public.coach_can_access_dog(dog_id));

-- dog_walks : DELETE
DROP POLICY IF EXISTS "Coaches delete walks of client dogs" ON public.dog_walks;
CREATE POLICY "Coaches delete walks of client dogs"
ON public.dog_walks FOR DELETE
TO authenticated
USING (public.coach_can_access_dog(dog_id));

-- dog_walk_points : SELECT
DROP POLICY IF EXISTS "Coaches read points of client walks" ON public.dog_walk_points;
CREATE POLICY "Coaches read points of client walks"
ON public.dog_walk_points FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.dog_walks w
    WHERE w.id = dog_walk_points.walk_id
      AND public.coach_can_access_dog(w.dog_id)
  )
);

-- dog_walk_points : INSERT
DROP POLICY IF EXISTS "Coaches insert points for client walks" ON public.dog_walk_points;
CREATE POLICY "Coaches insert points for client walks"
ON public.dog_walk_points FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.dog_walks w
    WHERE w.id = dog_walk_points.walk_id
      AND public.coach_can_access_dog(w.dog_id)
  )
);

-- dog_walk_points : DELETE (pour annulation propre)
DROP POLICY IF EXISTS "Coaches delete points of client walks" ON public.dog_walk_points;
CREATE POLICY "Coaches delete points of client walks"
ON public.dog_walk_points FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.dog_walks w
    WHERE w.id = dog_walk_points.walk_id
      AND public.coach_can_access_dog(w.dog_id)
  )
);
