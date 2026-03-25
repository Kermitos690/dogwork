
-- Pre-adoption behavioral evaluations by educators linked to shelters
CREATE TABLE public.shelter_animal_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid NOT NULL REFERENCES public.shelter_animals(id) ON DELETE CASCADE,
  shelter_user_id uuid NOT NULL,
  coach_user_id uuid NOT NULL,
  -- Behavioral assessment
  sociability_dogs integer DEFAULT 5,
  sociability_humans integer DEFAULT 5,
  reactivity_level integer DEFAULT 5,
  fear_level integer DEFAULT 5,
  energy_level integer DEFAULT 5,
  bite_risk text DEFAULT 'faible',
  leash_behavior text DEFAULT '',
  obedience_basics text DEFAULT '',
  resource_guarding text DEFAULT 'aucun',
  separation_anxiety text DEFAULT 'non évalué',
  -- Recommendations
  adoption_ready boolean DEFAULT false,
  recommended_profile text DEFAULT '',
  special_needs text DEFAULT '',
  training_notes text DEFAULT '',
  general_notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shelter_animal_evaluations ENABLE ROW LEVEL SECURITY;

-- Educators linked to shelter can CRUD evaluations
CREATE POLICY "Coach can insert evaluations for linked shelters"
  ON public.shelter_animal_evaluations FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = coach_user_id AND is_educator() AND
    EXISTS (
      SELECT 1 FROM public.shelter_coaches
      WHERE shelter_coaches.shelter_user_id = shelter_animal_evaluations.shelter_user_id
        AND shelter_coaches.coach_user_id = auth.uid()
        AND shelter_coaches.status = 'active'
    )
  );

CREATE POLICY "Coach can update own evaluations"
  ON public.shelter_animal_evaluations FOR UPDATE TO authenticated
  USING (auth.uid() = coach_user_id AND is_educator());

CREATE POLICY "Coach can view evaluations for linked shelters"
  ON public.shelter_animal_evaluations FOR SELECT TO authenticated
  USING (
    (auth.uid() = coach_user_id AND is_educator()) OR
    (auth.uid() = shelter_user_id AND is_shelter()) OR
    is_admin()
  );

CREATE POLICY "Coach can delete own evaluations"
  ON public.shelter_animal_evaluations FOR DELETE TO authenticated
  USING (auth.uid() = coach_user_id AND is_educator());

-- Trigger for updated_at
CREATE TRIGGER update_shelter_animal_evaluations_updated_at
  BEFORE UPDATE ON public.shelter_animal_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
