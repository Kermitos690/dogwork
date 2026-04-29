-- ============================================================
-- 1. SLUG + PUBLISH FLAGS sur coach_profiles
-- ============================================================
ALTER TABLE public.coach_profiles
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS public_email TEXT,
  ADD COLUMN IF NOT EXISTS public_phone TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS coach_profiles_slug_uniq ON public.coach_profiles (slug) WHERE slug IS NOT NULL;

-- ============================================================
-- 2. SLUG + PUBLISH FLAGS sur shelter_profiles
-- ============================================================
ALTER TABLE public.shelter_profiles
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS video_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS shelter_profiles_slug_uniq ON public.shelter_profiles (slug) WHERE slug IS NOT NULL;

-- ============================================================
-- 3. TABLE public_profile_boosts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.public_profile_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  profile_kind TEXT NOT NULL CHECK (profile_kind IN ('coach','shelter')),
  boost_type TEXT NOT NULL CHECK (boost_type IN ('directory_featured','banner_gallery','badge_video')),
  credits_spent INTEGER NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS public_profile_boosts_active_idx
  ON public.public_profile_boosts (user_id, profile_kind, boost_type, expires_at);

ALTER TABLE public.public_profile_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own boosts"
  ON public.public_profile_boosts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin reads all boosts"
  ON public.public_profile_boosts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can read active boosts (anonymized)"
  ON public.public_profile_boosts FOR SELECT TO anon, authenticated
  USING (expires_at > now());

-- ============================================================
-- 4. VUES PUBLIQUES (coachs & refuges publiés)
--    security_invoker=on → RLS du caller s'applique sur tables sources
-- ============================================================
DROP VIEW IF EXISTS public.coach_profiles_public CASCADE;
CREATE VIEW public.coach_profiles_public
WITH (security_invoker = on) AS
SELECT
  cp.user_id,
  cp.slug,
  cp.display_name,
  cp.specialty,
  cp.bio,
  cp.avatar_url,
  cp.banner_url,
  cp.gallery_urls,
  cp.video_url,
  cp.public_email,
  cp.public_phone,
  cp.website,
  cp.city,
  cp.updated_at,
  EXISTS (
    SELECT 1 FROM public.public_profile_boosts b
    WHERE b.user_id = cp.user_id
      AND b.profile_kind = 'coach'
      AND b.boost_type = 'directory_featured'
      AND b.expires_at > now()
  ) AS is_featured,
  EXISTS (
    SELECT 1 FROM public.public_profile_boosts b
    WHERE b.user_id = cp.user_id
      AND b.profile_kind = 'coach'
      AND b.boost_type = 'badge_video'
      AND b.expires_at > now()
  ) AS has_badge_video
FROM public.coach_profiles cp
WHERE cp.is_published = true AND cp.slug IS NOT NULL;

DROP VIEW IF EXISTS public.shelter_profiles_public_v2 CASCADE;
CREATE VIEW public.shelter_profiles_public_v2
WITH (security_invoker = on) AS
SELECT
  sp.user_id,
  sp.slug,
  sp.name,
  sp.mission,
  sp.description,
  sp.organization_type,
  sp.logo_url,
  sp.banner_url,
  sp.gallery_urls,
  sp.video_url,
  sp.email_public,
  sp.website,
  sp.city,
  sp.country,
  sp.opening_hours,
  sp.since_year,
  sp.updated_at,
  EXISTS (
    SELECT 1 FROM public.public_profile_boosts b
    WHERE b.user_id = sp.user_id
      AND b.profile_kind = 'shelter'
      AND b.boost_type = 'directory_featured'
      AND b.expires_at > now()
  ) AS is_featured,
  EXISTS (
    SELECT 1 FROM public.public_profile_boosts b
    WHERE b.user_id = sp.user_id
      AND b.profile_kind = 'shelter'
      AND b.boost_type = 'badge_video'
      AND b.expires_at > now()
  ) AS has_badge_video
FROM public.shelter_profiles sp
WHERE sp.is_published = true AND sp.slug IS NOT NULL;

-- Public read on base tables limited to published rows (so security_invoker views work for anon)
DROP POLICY IF EXISTS "Public reads published coaches" ON public.coach_profiles;
CREATE POLICY "Public reads published coaches"
  ON public.coach_profiles FOR SELECT TO anon, authenticated
  USING (is_published = true AND slug IS NOT NULL);

DROP POLICY IF EXISTS "Public reads published shelters" ON public.shelter_profiles;
CREATE POLICY "Public reads published shelters"
  ON public.shelter_profiles FOR SELECT TO anon, authenticated
  USING (is_published = true AND slug IS NOT NULL);

GRANT SELECT ON public.coach_profiles_public TO anon, authenticated;
GRANT SELECT ON public.shelter_profiles_public_v2 TO anon, authenticated;

-- ============================================================
-- 5. FEATURE COSTS (canonical for debit_dogwork_credits)
-- ============================================================
INSERT INTO public.feature_credit_costs (feature_key, label, credit_cost, module_slug, is_active)
VALUES
  ('boost_directory_featured', 'Mise en avant annuaire 30 jours', 50, 'branding', true),
  ('boost_banner_gallery',     'Bannière personnalisée + galerie 30 jours', 30, 'branding', true),
  ('boost_badge_video',        'Badge "Profil enrichi" + vidéo 30 jours', 40, 'branding', true)
ON CONFLICT (feature_key) DO UPDATE
  SET label = EXCLUDED.label,
      credit_cost = EXCLUDED.credit_cost,
      module_slug = EXCLUDED.module_slug,
      is_active = true;

-- Mirror into ai_feature_catalog for unified pricing display (Tarifs page + landing check)
INSERT INTO public.ai_feature_catalog (code, label, credits_cost, model, is_active)
VALUES
  ('boost_directory_featured', 'Mise en avant annuaire (30 j)', 50, 'none', true),
  ('boost_banner_gallery',     'Bannière + galerie (30 j)',     30, 'none', true),
  ('boost_badge_video',        'Badge enrichi + vidéo (30 j)',  40, 'none', true)
ON CONFLICT (code) DO UPDATE
  SET label = EXCLUDED.label,
      credits_cost = EXCLUDED.credits_cost,
      is_active = true;

-- ============================================================
-- 6. RPC purchase_public_boost
-- ============================================================
CREATE OR REPLACE FUNCTION public.purchase_public_boost(
  _profile_kind TEXT,
  _boost_type TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _feature_key TEXT;
  _debit JSONB;
  _cost INTEGER;
  _expires TIMESTAMPTZ := now() + INTERVAL '30 days';
  _boost_id UUID;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF _profile_kind NOT IN ('coach','shelter') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_profile_kind');
  END IF;
  IF _boost_type NOT IN ('directory_featured','banner_gallery','badge_video') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_boost_type');
  END IF;

  _feature_key := 'boost_' || _boost_type;

  -- Délègue tout le contrôle de solde + débit + ledger à la mécanique canonique
  _debit := public.debit_dogwork_credits(_uid, NULL, _feature_key, 'branding', NULL);

  IF (_debit->>'success')::BOOLEAN IS NOT TRUE THEN
    RETURN _debit;
  END IF;

  _cost := (_debit->>'cost')::INTEGER;

  INSERT INTO public.public_profile_boosts
    (user_id, profile_kind, boost_type, credits_spent, expires_at)
  VALUES
    (_uid, _profile_kind, _boost_type, _cost, _expires)
  RETURNING id INTO _boost_id;

  RETURN jsonb_build_object(
    'success', true,
    'boost_id', _boost_id,
    'expires_at', _expires,
    'balance', _debit->'balance',
    'cost', _cost
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_public_boost(TEXT, TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.purchase_public_boost(TEXT, TEXT) TO authenticated;

-- ============================================================
-- 7. STORAGE BUCKET pour bannières / galeries / vidéos publiques
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('public-profile-media', 'public-profile-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Lecture publique
DROP POLICY IF EXISTS "Public read profile media" ON storage.objects;
CREATE POLICY "Public read profile media"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'public-profile-media');

-- Écriture limitée au dossier {auth.uid()}/...
DROP POLICY IF EXISTS "Owners write own profile media" ON storage.objects;
CREATE POLICY "Owners write own profile media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'public-profile-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Owners update own profile media" ON storage.objects;
CREATE POLICY "Owners update own profile media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'public-profile-media' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Owners delete own profile media" ON storage.objects;
CREATE POLICY "Owners delete own profile media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'public-profile-media' AND auth.uid()::text = (storage.foldername(name))[1]);