-- Strict DB-level fix for shelter_animals adopter PII exposure.
-- Approach: column-level REVOKE on the base table + private companion table for writes,
-- with the safe view rewritten to JOIN the private table (RLS-protected).

-- 1. Private companion table for adopter PII.
CREATE TABLE IF NOT EXISTS public.shelter_animal_adopter_info (
  animal_id uuid PRIMARY KEY REFERENCES public.shelter_animals(id) ON DELETE CASCADE,
  shelter_user_id uuid NOT NULL,
  adopter_email text,
  adopter_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shelter_animal_adopter_info ENABLE ROW LEVEL SECURITY;

-- Only the shelter owner (or admin) can read/write adopter PII.
DROP POLICY IF EXISTS "Owner shelter can read adopter info" ON public.shelter_animal_adopter_info;
CREATE POLICY "Owner shelter can read adopter info"
  ON public.shelter_animal_adopter_info FOR SELECT
  TO authenticated
  USING ((auth.uid() = shelter_user_id) OR is_admin());

DROP POLICY IF EXISTS "Owner shelter can insert adopter info" ON public.shelter_animal_adopter_info;
CREATE POLICY "Owner shelter can insert adopter info"
  ON public.shelter_animal_adopter_info FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = shelter_user_id) OR is_admin());

DROP POLICY IF EXISTS "Owner shelter can update adopter info" ON public.shelter_animal_adopter_info;
CREATE POLICY "Owner shelter can update adopter info"
  ON public.shelter_animal_adopter_info FOR UPDATE
  TO authenticated
  USING ((auth.uid() = shelter_user_id) OR is_admin())
  WITH CHECK ((auth.uid() = shelter_user_id) OR is_admin());

DROP POLICY IF EXISTS "Owner shelter can delete adopter info" ON public.shelter_animal_adopter_info;
CREATE POLICY "Owner shelter can delete adopter info"
  ON public.shelter_animal_adopter_info FOR DELETE
  TO authenticated
  USING ((auth.uid() = shelter_user_id) OR is_admin());

-- 2. Backfill from existing base table data.
INSERT INTO public.shelter_animal_adopter_info (animal_id, shelter_user_id, adopter_email, adopter_name)
SELECT id, user_id, adopter_email, adopter_name
FROM public.shelter_animals
WHERE adopter_email IS NOT NULL OR adopter_name IS NOT NULL
ON CONFLICT (animal_id) DO NOTHING;

-- 3. SECURITY DEFINER sync trigger: keep the private table updated when the base
-- table is written, AND wipe the PII columns on the base table so they can never
-- be read again (defense in depth — column REVOKE below is the primary control).
CREATE OR REPLACE FUNCTION public.sync_adopter_info_from_base()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.adopter_email IS NOT NULL OR NEW.adopter_name IS NOT NULL THEN
    INSERT INTO public.shelter_animal_adopter_info (animal_id, shelter_user_id, adopter_email, adopter_name)
    VALUES (NEW.id, NEW.user_id, NEW.adopter_email, NEW.adopter_name)
    ON CONFLICT (animal_id) DO UPDATE
      SET adopter_email = EXCLUDED.adopter_email,
          adopter_name  = EXCLUDED.adopter_name,
          shelter_user_id = EXCLUDED.shelter_user_id,
          updated_at    = now();
  END IF;
  -- Always wipe sensitive columns from base table (PII lives only in private table).
  NEW.adopter_email := NULL;
  NEW.adopter_name  := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_adopter_info_ins ON public.shelter_animals;
CREATE TRIGGER trg_sync_adopter_info_ins
  BEFORE INSERT ON public.shelter_animals
  FOR EACH ROW EXECUTE FUNCTION public.sync_adopter_info_from_base();

DROP TRIGGER IF EXISTS trg_sync_adopter_info_upd ON public.shelter_animals;
CREATE TRIGGER trg_sync_adopter_info_upd
  BEFORE UPDATE OF adopter_email, adopter_name ON public.shelter_animals
  FOR EACH ROW EXECUTE FUNCTION public.sync_adopter_info_from_base();

-- 4. Wipe existing PII from base table now that it's safely stored in the private table.
UPDATE public.shelter_animals
SET adopter_email = NULL, adopter_name = NULL
WHERE adopter_email IS NOT NULL OR adopter_name IS NOT NULL;

-- 5. STRICT column-level REVOKE — primary database-level enforcement.
-- Even if RLS allowed SELECT, these specific columns cannot be read by any client role.
REVOKE SELECT (adopter_email, adopter_name) ON public.shelter_animals FROM authenticated, anon, PUBLIC;

-- 6. Rewrite shelter_animals_safe to JOIN the RLS-protected private table.
-- The view is SECURITY INVOKER (per project standard) so the JOIN inherits the
-- caller's RLS — non-owners simply receive NULL via the LEFT JOIN.
DROP VIEW IF EXISTS public.shelter_animals_safe;
CREATE VIEW public.shelter_animals_safe
WITH (security_invoker = true)
AS
SELECT
  sa.id,
  sa.user_id,
  sa.name,
  sa.species,
  sa.breed,
  sa.sex,
  sa.estimated_age,
  sa.weight_kg,
  sa.status,
  sa.photo_url,
  sa.description,
  sa.chip_id,
  sa.arrival_date,
  sa.departure_date,
  sa.departure_reason,
  sa.is_sterilized,
  sa.health_notes,
  sa.behavior_notes,
  sa.created_at,
  sa.updated_at,
  ai.adopter_email,
  ai.adopter_name
FROM public.shelter_animals sa
LEFT JOIN public.shelter_animal_adopter_info ai ON ai.animal_id = sa.id;

GRANT SELECT ON public.shelter_animals_safe TO authenticated;

COMMENT ON COLUMN public.shelter_animals.adopter_email IS
  'DEPRECATED column. SELECT is REVOKED at the column level. Adopter PII is stored in public.shelter_animal_adopter_info (RLS-protected, owner/admin only). Writes here are auto-synced and wiped by trg_sync_adopter_info_ins/upd.';
COMMENT ON COLUMN public.shelter_animals.adopter_name IS
  'DEPRECATED column. SELECT is REVOKED at the column level. See shelter_animal_adopter_info.';
COMMENT ON TABLE public.shelter_animal_adopter_info IS
  'Private adopter PII. Strict RLS: only owner shelter + admin can read/write. Joined via public.shelter_animals_safe.';