
CREATE OR REPLACE VIEW public.public_profile_boosts_public
WITH (security_invoker = on)
AS
SELECT
  id,
  profile_kind,
  boost_type,
  starts_at,
  expires_at,
  created_at
FROM public.public_profile_boosts
WHERE expires_at > now();

GRANT SELECT ON public.public_profile_boosts_public TO anon, authenticated;
