
-- Add metadata columns for addon marketplace
ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS is_addon boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS addon_label text,
  ADD COLUMN IF NOT EXISTS tagline text;

-- Default add-on pricing grid (cohérente avec la structure commerciale existante)
UPDATE public.modules
SET pricing_type = 'addon',
    is_addon = true,
    monthly_price_chf = 4.90,
    yearly_price_chf = 49.00,
    addon_label = 'Branding personnalisé',
    tagline = 'Logo, couleurs et page publique à votre image.'
WHERE slug = 'branding';

UPDATE public.modules
SET pricing_type = 'addon',
    is_addon = true,
    monthly_price_chf = 6.90,
    yearly_price_chf = 69.00,
    addon_label = 'Planning & rendez-vous',
    tagline = 'Agenda partagé, créneaux, rappels automatiques.'
WHERE slug = 'planning';

UPDATE public.modules
SET pricing_type = 'addon',
    is_addon = true,
    monthly_price_chf = 7.90,
    yearly_price_chf = 79.00,
    addon_label = 'Équipe & permissions',
    tagline = 'Invitez vos collaborateurs avec des rôles fins.'
WHERE slug = 'team_permissions';

UPDATE public.modules
SET pricing_type = 'addon',
    is_addon = true,
    monthly_price_chf = 3.90,
    yearly_price_chf = 39.00,
    addon_label = 'Statistiques avancées',
    tagline = 'Tendances comportementales, focus, récupération.'
WHERE slug = 'behavior_stats';

UPDATE public.modules
SET pricing_type = 'addon',
    is_addon = true,
    monthly_price_chf = 5.90,
    yearly_price_chf = 59.00,
    addon_label = 'Adoption & post-adoption',
    tagline = 'Suivi structuré des adoptants et plans post-adoption.'
WHERE slug = 'adoption_followup';

-- Belt & braces: ensure non-addons stay free
UPDATE public.modules
SET is_addon = false,
    pricing_type = 'included',
    monthly_price_chf = 0,
    yearly_price_chf = 0
WHERE slug NOT IN ('branding','planning','team_permissions','behavior_stats','adoption_followup');

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_modules_is_addon ON public.modules(is_addon) WHERE is_addon = true;
