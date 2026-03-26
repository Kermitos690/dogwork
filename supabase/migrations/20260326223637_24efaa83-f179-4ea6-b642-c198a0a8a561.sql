
-- Table adopter_links : lie un adoptant (owner) à un refuge après adoption
CREATE TABLE public.adopter_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adopter_user_id uuid NOT NULL,
  shelter_user_id uuid NOT NULL,
  animal_id uuid NOT NULL REFERENCES public.shelter_animals(id) ON DELETE CASCADE,
  animal_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index pour lookups rapides
CREATE INDEX idx_adopter_links_adopter ON public.adopter_links(adopter_user_id);
CREATE INDEX idx_adopter_links_shelter ON public.adopter_links(shelter_user_id);
CREATE UNIQUE INDEX idx_adopter_links_unique ON public.adopter_links(adopter_user_id, animal_id);

-- Enable RLS
ALTER TABLE public.adopter_links ENABLE ROW LEVEL SECURITY;

-- Adoptant voit ses propres liens
CREATE POLICY "Adopters can view own links"
ON public.adopter_links FOR SELECT TO authenticated
USING (auth.uid() = adopter_user_id);

-- Shelter voit ses adoptants
CREATE POLICY "Shelters can view own adopters"
ON public.adopter_links FOR SELECT TO authenticated
USING (auth.uid() = shelter_user_id AND is_shelter());

-- Shelter peut insérer des liens
CREATE POLICY "Shelters can insert adopter links"
ON public.adopter_links FOR INSERT TO authenticated
WITH CHECK (auth.uid() = shelter_user_id AND is_shelter());

-- Admin voit tout
CREATE POLICY "Admin full access select"
ON public.adopter_links FOR SELECT TO authenticated
USING (is_admin());

CREATE POLICY "Admin full access insert"
ON public.adopter_links FOR INSERT TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Admin full access delete"
ON public.adopter_links FOR DELETE TO authenticated
USING (is_admin());

CREATE POLICY "Admin full access update"
ON public.adopter_links FOR UPDATE TO authenticated
USING (is_admin());

-- Shelter peut supprimer ses liens
CREATE POLICY "Shelters can delete own adopter links"
ON public.adopter_links FOR DELETE TO authenticated
USING (auth.uid() = shelter_user_id AND is_shelter());
