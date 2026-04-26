ALTER TABLE public.shelter_animals
  ADD COLUMN IF NOT EXISTS adopter_email text,
  ADD COLUMN IF NOT EXISTS adopter_name text;

CREATE INDEX IF NOT EXISTS shelter_animals_adopter_email_idx
  ON public.shelter_animals (lower(adopter_email))
  WHERE adopter_email IS NOT NULL AND adopter_email <> '';