ALTER TABLE public.shelter_animals
  ADD COLUMN IF NOT EXISTS adopter_email text,
  ADD COLUMN IF NOT EXISTS adopter_name text;

CREATE INDEX IF NOT EXISTS idx_shelter_animals_adopter_email
  ON public.shelter_animals (lower(adopter_email))
  WHERE adopter_email IS NOT NULL;

COMMENT ON COLUMN public.shelter_animals.adopter_email IS 'Adopter email used only for controlled adoption linking flows; do not expose in employee/public views.';
COMMENT ON COLUMN public.shelter_animals.adopter_name IS 'Adopter display name used only for controlled adoption linking flows; do not expose in employee/public views.';