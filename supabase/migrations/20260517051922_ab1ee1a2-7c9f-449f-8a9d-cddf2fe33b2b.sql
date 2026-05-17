
-- =========================================================================
-- 1. EXTENSION NON DESTRUCTIVE DE shelter_spaces
-- =========================================================================
ALTER TABLE public.shelter_spaces
  ADD COLUMN IF NOT EXISTS organization_id uuid,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS risk_level text NOT NULL DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS indoor_outdoor text NOT NULL DEFAULT 'indoor',
  ADD COLUMN IF NOT EXISTS building text,
  ADD COLUMN IF NOT EXISTS floor text,
  ADD COLUMN IF NOT EXISTS zone_label text,
  ADD COLUMN IF NOT EXISTS capacity_recommended integer,
  ADD COLUMN IF NOT EXISTS surface_m2 numeric,
  ADD COLUMN IF NOT EXISTS noise_level text,
  ADD COLUMN IF NOT EXISTS stimulation_level text,
  ADD COLUMN IF NOT EXISTS isolation_level text,
  ADD COLUMN IF NOT EXISTS supervision_level text,
  ADD COLUMN IF NOT EXISTS is_reservable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS requires_staff_validation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_public_for_adopters boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS compatibility_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS restrictions jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS protocols jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS schedule_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS visual_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS main_photo_url text,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid;

CREATE INDEX IF NOT EXISTS idx_shelter_spaces_status ON public.shelter_spaces(status);
CREATE INDEX IF NOT EXISTS idx_shelter_spaces_risk_level ON public.shelter_spaces(risk_level);
CREATE INDEX IF NOT EXISTS idx_shelter_spaces_space_type ON public.shelter_spaces(space_type);
CREATE INDEX IF NOT EXISTS idx_shelter_spaces_organization_id ON public.shelter_spaces(organization_id);
CREATE INDEX IF NOT EXISTS idx_shelter_spaces_is_active ON public.shelter_spaces(is_active);

-- =========================================================================
-- 2. TABLES ANNEXES
-- =========================================================================

-- 2.1 ÉQUIPEMENTS
CREATE TABLE IF NOT EXISTS public.shelter_space_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.shelter_spaces(id) ON DELETE CASCADE,
  shelter_user_id uuid NOT NULL,
  name text NOT NULL,
  equipment_type text,
  quantity integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'ok',
  last_checked_at timestamptz,
  next_check_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sse_space_id ON public.shelter_space_equipment(space_id);
CREATE INDEX IF NOT EXISTS idx_sse_shelter_user_id ON public.shelter_space_equipment(shelter_user_id);
ALTER TABLE public.shelter_space_equipment ENABLE ROW LEVEL SECURITY;

-- 2.2 ASSIGNATIONS
CREATE TABLE IF NOT EXISTS public.shelter_space_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.shelter_spaces(id) ON DELETE CASCADE,
  shelter_user_id uuid NOT NULL,
  animal_id uuid,
  assigned_to_user_id uuid,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  reason text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ssa_space_id ON public.shelter_space_assignments(space_id);
CREATE INDEX IF NOT EXISTS idx_ssa_shelter_user_id ON public.shelter_space_assignments(shelter_user_id);
CREATE INDEX IF NOT EXISTS idx_ssa_animal_id ON public.shelter_space_assignments(animal_id);
ALTER TABLE public.shelter_space_assignments ENABLE ROW LEVEL SECURITY;

-- 2.3 NETTOYAGE
CREATE TABLE IF NOT EXISTS public.shelter_space_cleaning_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.shelter_spaces(id) ON DELETE CASCADE,
  shelter_user_id uuid NOT NULL,
  cleaned_by uuid,
  cleaned_at timestamptz NOT NULL DEFAULT now(),
  cleaning_level text,
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  next_cleaning_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sscl_space_id ON public.shelter_space_cleaning_logs(space_id);
CREATE INDEX IF NOT EXISTS idx_sscl_shelter_user_id ON public.shelter_space_cleaning_logs(shelter_user_id);
ALTER TABLE public.shelter_space_cleaning_logs ENABLE ROW LEVEL SECURITY;

-- 2.4 MAINTENANCE
CREATE TABLE IF NOT EXISTS public.shelter_space_maintenance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.shelter_spaces(id) ON DELETE CASCADE,
  shelter_user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  reported_by uuid,
  assigned_to uuid,
  due_at timestamptz,
  resolved_at timestamptz,
  estimated_cost numeric,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ssml_space_id ON public.shelter_space_maintenance_logs(space_id);
CREATE INDEX IF NOT EXISTS idx_ssml_shelter_user_id ON public.shelter_space_maintenance_logs(shelter_user_id);
CREATE INDEX IF NOT EXISTS idx_ssml_status ON public.shelter_space_maintenance_logs(status);
ALTER TABLE public.shelter_space_maintenance_logs ENABLE ROW LEVEL SECURITY;

-- 2.5 INCIDENTS
CREATE TABLE IF NOT EXISTS public.shelter_space_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.shelter_spaces(id) ON DELETE CASCADE,
  shelter_user_id uuid NOT NULL,
  incident_type text,
  severity text NOT NULL DEFAULT 'low',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  dogs_involved jsonb NOT NULL DEFAULT '[]'::jsonb,
  users_involved jsonb NOT NULL DEFAULT '[]'::jsonb,
  description text,
  action_taken text,
  follow_up_required boolean NOT NULL DEFAULT false,
  space_closed boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ssi_space_id ON public.shelter_space_incidents(space_id);
CREATE INDEX IF NOT EXISTS idx_ssi_shelter_user_id ON public.shelter_space_incidents(shelter_user_id);
CREATE INDEX IF NOT EXISTS idx_ssi_severity ON public.shelter_space_incidents(severity);
ALTER TABLE public.shelter_space_incidents ENABLE ROW LEVEL SECURITY;

-- 2.6 NOTES STAFF
CREATE TABLE IF NOT EXISTS public.shelter_space_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.shelter_spaces(id) ON DELETE CASCADE,
  shelter_user_id uuid NOT NULL,
  author_id uuid,
  note text NOT NULL,
  visibility text NOT NULL DEFAULT 'staff',
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ssn_space_id ON public.shelter_space_notes(space_id);
CREATE INDEX IF NOT EXISTS idx_ssn_shelter_user_id ON public.shelter_space_notes(shelter_user_id);
ALTER TABLE public.shelter_space_notes ENABLE ROW LEVEL SECURITY;

-- 2.7 DOCUMENTS
CREATE TABLE IF NOT EXISTS public.shelter_space_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.shelter_spaces(id) ON DELETE CASCADE,
  shelter_user_id uuid NOT NULL,
  title text,
  file_url text,
  file_type text,
  document_type text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ssd_space_id ON public.shelter_space_documents(space_id);
CREATE INDEX IF NOT EXISTS idx_ssd_shelter_user_id ON public.shelter_space_documents(shelter_user_id);
ALTER TABLE public.shelter_space_documents ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 3. POLICIES RLS (même modèle que shelter_spaces existant)
-- =========================================================================
-- Helper macro reproduced inline for each table : admin OR (shelter owner) OR (shelter_employee of that shelter)

-- 3.1 EQUIPMENT
CREATE POLICY "ssp_equipment_select" ON public.shelter_space_equipment
  FOR SELECT TO authenticated USING (
    is_admin()
    OR (auth.uid() = shelter_user_id AND is_shelter())
    OR (is_shelter_employee() AND shelter_user_id = get_employee_shelter_id(auth.uid()))
  );
CREATE POLICY "ssp_equipment_insert" ON public.shelter_space_equipment
  FOR INSERT TO authenticated WITH CHECK (
    is_admin()
    OR (auth.uid() = shelter_user_id AND is_shelter())
    OR (is_shelter_employee() AND shelter_user_id = get_employee_shelter_id(auth.uid()))
  );
CREATE POLICY "ssp_equipment_update" ON public.shelter_space_equipment
  FOR UPDATE TO authenticated USING (
    is_admin()
    OR (auth.uid() = shelter_user_id AND is_shelter())
    OR (is_shelter_employee() AND shelter_user_id = get_employee_shelter_id(auth.uid()))
  );
CREATE POLICY "ssp_equipment_delete" ON public.shelter_space_equipment
  FOR DELETE TO authenticated USING (
    is_admin() OR (auth.uid() = shelter_user_id AND is_shelter())
  );

-- 3.2 ASSIGNMENTS
CREATE POLICY "ssp_assignments_select" ON public.shelter_space_assignments
  FOR SELECT TO authenticated USING (
    is_admin()
    OR (auth.uid() = shelter_user_id AND is_shelter())
    OR (is_shelter_employee() AND shelter_user_id = get_employee_shelter_id(auth.uid()))
  );
CREATE POLICY "ssp_assignments_insert" ON public.shelter_space_assignments
  FOR INSERT TO authenticated WITH CHECK (
    is_admin()
    OR (auth.uid() = shelter_user_id AND is_shelter())
    OR (is_shelter_employee() AND shelter_user_id = get_employee_shelter_id(auth.uid()))
  );
CREATE POLICY "ssp_assignments_update" ON public.shelter_space_assignments
  FOR UPDATE TO authenticated USING (
    is_admin()
    OR (auth.uid() = shelter_user_id AND is_shelter())
    OR (is_shelter_employee() AND shelter_user_id = get_employee_shelter_id(auth.uid()))
  );
CREATE POLICY "ssp_assignments_delete" ON public.shelter_space_assignments
  FOR DELETE TO authenticated USING (
    is_admin() OR (auth.uid() = shelter_user_id AND is_shelter())
  );

-- 3.3 CLEANING
CREATE POLICY "ssp_cleaning_select" ON public.shelter_space_cleaning_logs
  FOR SELECT TO authenticated USING (
    is_admin()
    OR (auth.uid() = shelter_user_id AND is_shelter())
    OR (is_shelter_employee() AND shelter_user_id = get_employee_shelter_id(auth.uid()))
  );
CREATE POLICY "ssp_cleaning_insert" ON public.shelter_space_cleaning_logs
  FOR INSERT TO authenticated WITH CHECK (
    is_admin()
    OR (auth.uid() = shelter_user_id AND is_shelter())
    OR (is_shelter_employee() AND shelter_user_id = get_employee_shelter_id(auth.uid()))
  );
CREATE POLICY "ssp_cleaning_update" ON public.shelter_space_cleaning_logs
  FOR UPDATE TO authenticated USING (
    is_admin() OR (auth.uid() = shelter_user_id AND is_shelter())
  );
CREATE POLICY "ssp_cleaning_delete" ON public.shelter_space_cleaning_logs
  FOR DELETE TO authenticated USING (
    is_admin() OR (auth.uid() = shelter_user_id AND is_shelter())
  );

-- 3.4 MAINTENANCE
CREATE POLICY "ssp_maintenance_select" ON public.shelter_space_maintenance_logs
  FOR SELECT TO authenticated USING (
    is_admin()
    OR (auth.uid() = shelter_user_id AND is_shelter())
    OR (is_shelter_employee() AND shelter_user_id = get_employee_shelter_id(auth.uid()))
  );
CREATE POLICY "ssp_maintenance_insert" ON public.shelter_space_maintenance_logs
  FOR INSERT TO authenticated WITH CHECK (
    is_admin()
    OR (auth.uid() = shelter_user_id AND is_shelter())
    OR (is_shelter_employee() AND shelter_user_id = get_employee_shelter_id(auth.uid()))
  );
CREATE POLICY "ssp_maintenance_update" ON public.shelter_space_maintenance_logs
  FOR UPDATE TO authenticated USING (
    is_admin()
    OR (auth.uid() = shelter_user_id AND is_shelter())
    OR (is_shelter_employee() AND shelter_user_id = get_employee_shelter_id(auth.uid()))
  );
CREATE POLICY "ssp_maintenance_delete" ON public.shelter_space_maintenance_logs
  FOR DELETE TO authenticated USING (
    is_admin() OR (auth.uid() = shelter_user_id AND is_shelter())
  );

-- 3.5 INCIDENTS
CREATE POLICY "ssp_incidents_select" ON public.shelter_space_incidents
  FOR SELECT TO authenticated USING (
    is_admin()
    OR (auth.uid() = shelter_user_id AND is_shelter())
    OR (is_shelter_employee() AND shelter_user_id = get_employee_shelter_id(auth.uid()))
  );
CREATE POLICY "ssp_incidents_insert" ON public.shelter_space_incidents
  FOR INSERT TO authenticated WITH CHECK (
    is_admin()
    OR (auth.uid() = shelter_user_id AND is_shelter())
    OR (is_shelter_employee() AND shelter_user_id = get_employee_shelter_id(auth.uid()))
  );
CREATE POLICY "ssp_incidents_update" ON public.shelter_space_incidents
  FOR UPDATE TO authenticated USING (
    is_admin() OR (auth.uid() = shelter_user_id AND is_shelter())
  );
CREATE POLICY "ssp_incidents_delete" ON public.shelter_space_incidents
  FOR DELETE TO authenticated USING (
    is_admin() OR (auth.uid() = shelter_user_id AND is_shelter())
  );

-- 3.6 NOTES
CREATE POLICY "ssp_notes_select" ON public.shelter_space_notes
  FOR SELECT TO authenticated USING (
    is_admin()
    OR (auth.uid() = shelter_user_id AND is_shelter())
    OR (is_shelter_employee() AND shelter_user_id = get_employee_shelter_id(auth.uid()))
  );
CREATE POLICY "ssp_notes_insert" ON public.shelter_space_notes
  FOR INSERT TO authenticated WITH CHECK (
    is_admin()
    OR (auth.uid() = shelter_user_id AND is_shelter())
    OR (is_shelter_employee() AND shelter_user_id = get_employee_shelter_id(auth.uid()))
  );
CREATE POLICY "ssp_notes_update" ON public.shelter_space_notes
  FOR UPDATE TO authenticated USING (
    is_admin()
    OR (auth.uid() = shelter_user_id AND is_shelter())
    OR (is_shelter_employee() AND author_id = auth.uid() AND shelter_user_id = get_employee_shelter_id(auth.uid()))
  );
CREATE POLICY "ssp_notes_delete" ON public.shelter_space_notes
  FOR DELETE TO authenticated USING (
    is_admin() OR (auth.uid() = shelter_user_id AND is_shelter())
  );

-- 3.7 DOCUMENTS
CREATE POLICY "ssp_documents_select" ON public.shelter_space_documents
  FOR SELECT TO authenticated USING (
    is_admin()
    OR (auth.uid() = shelter_user_id AND is_shelter())
    OR (is_shelter_employee() AND shelter_user_id = get_employee_shelter_id(auth.uid()))
  );
CREATE POLICY "ssp_documents_insert" ON public.shelter_space_documents
  FOR INSERT TO authenticated WITH CHECK (
    is_admin()
    OR (auth.uid() = shelter_user_id AND is_shelter())
    OR (is_shelter_employee() AND shelter_user_id = get_employee_shelter_id(auth.uid()))
  );
CREATE POLICY "ssp_documents_update" ON public.shelter_space_documents
  FOR UPDATE TO authenticated USING (
    is_admin() OR (auth.uid() = shelter_user_id AND is_shelter())
  );
CREATE POLICY "ssp_documents_delete" ON public.shelter_space_documents
  FOR DELETE TO authenticated USING (
    is_admin() OR (auth.uid() = shelter_user_id AND is_shelter())
  );

-- =========================================================================
-- 4. TRIGGER updated_at sur les tables ayant un updated_at
-- =========================================================================
CREATE OR REPLACE FUNCTION public.tg_shelter_spaces_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sse_touch_updated_at ON public.shelter_space_equipment;
CREATE TRIGGER trg_sse_touch_updated_at BEFORE UPDATE ON public.shelter_space_equipment
  FOR EACH ROW EXECUTE FUNCTION public.tg_shelter_spaces_touch_updated_at();

DROP TRIGGER IF EXISTS trg_ssml_touch_updated_at ON public.shelter_space_maintenance_logs;
CREATE TRIGGER trg_ssml_touch_updated_at BEFORE UPDATE ON public.shelter_space_maintenance_logs
  FOR EACH ROW EXECUTE FUNCTION public.tg_shelter_spaces_touch_updated_at();
