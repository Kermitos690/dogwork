CREATE UNIQUE INDEX IF NOT EXISTS adopter_links_adopter_user_animal_unique
ON public.adopter_links (adopter_user_id, animal_id);