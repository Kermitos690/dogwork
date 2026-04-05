-- Fix SECURITY DEFINER view: shelter_profiles_public
-- Recreate with security_invoker = on so RLS of the querying user applies
CREATE OR REPLACE VIEW public.shelter_profiles_public
WITH (security_invoker = on)
AS
SELECT id,
    user_id,
    name,
    description,
    organization_type
FROM shelter_profiles;