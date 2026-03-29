
-- Fix search_path on tier_meets_minimum
CREATE OR REPLACE FUNCTION public.tier_meets_minimum(_user_tier text, _min_tier text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT (
    CASE _user_tier
      WHEN 'expert' THEN 3
      WHEN 'pro' THEN 2
      WHEN 'starter' THEN 1
      ELSE 1
    END
  ) >= (
    CASE _min_tier
      WHEN 'expert' THEN 3
      WHEN 'pro' THEN 2
      WHEN 'starter' THEN 1
      ELSE 1
    END
  );
$$;
