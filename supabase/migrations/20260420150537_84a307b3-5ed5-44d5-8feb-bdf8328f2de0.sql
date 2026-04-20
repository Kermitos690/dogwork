-- Étendre tier_meets_minimum aux paliers educator/shelter (>= expert)
CREATE OR REPLACE FUNCTION public.tier_meets_minimum(_user_tier text, _min_tier text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT (
    CASE _user_tier
      WHEN 'shelter'  THEN 5
      WHEN 'educator' THEN 4
      WHEN 'expert'   THEN 3
      WHEN 'pro'      THEN 2
      WHEN 'starter'  THEN 1
      ELSE 1
    END
  ) >= (
    CASE _min_tier
      WHEN 'shelter'  THEN 5
      WHEN 'educator' THEN 4
      WHEN 'expert'   THEN 3
      WHEN 'pro'      THEN 2
      WHEN 'starter'  THEN 1
      ELSE 1
    END
  );
$function$;

-- Aligner enforce_dog_limit avec PLANS officiels (Pro=1, Expert/Educator/Shelter illimité)
CREATE OR REPLACE FUNCTION public.enforce_dog_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_tier text;
  dog_count integer;
  max_dogs integer;
BEGIN
  -- Admins et educators bypass
  IF public.has_role(NEW.user_id, 'admin') OR public.has_role(NEW.user_id, 'educator') THEN
    RETURN NEW;
  END IF;

  user_tier := public.get_user_tier(NEW.user_id);

  SELECT COUNT(*) INTO dog_count FROM public.dogs WHERE user_id = NEW.user_id;

  max_dogs := CASE user_tier
    WHEN 'shelter'  THEN 999999
    WHEN 'educator' THEN 999999
    WHEN 'expert'   THEN 999999
    WHEN 'pro'      THEN 1
    ELSE 1
  END;

  IF dog_count >= max_dogs THEN
    RAISE EXCEPTION 'Limite de chiens atteinte pour le plan %. Passez au plan supérieur.', user_tier;
  END IF;

  RETURN NEW;
END;
$function$;