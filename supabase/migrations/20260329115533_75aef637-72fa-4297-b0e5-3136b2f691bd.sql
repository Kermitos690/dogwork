
-- 1. Add current_tier to stripe_customers for backend enforcement
ALTER TABLE public.stripe_customers 
  ADD COLUMN IF NOT EXISTS current_tier text NOT NULL DEFAULT 'starter';

-- 2. Create a SECURITY DEFINER function to get effective user tier
-- Checks admin_subscriptions override first, then stripe_customers, defaults to 'starter'
CREATE OR REPLACE FUNCTION public.get_user_tier(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- Check admin override first
    (SELECT tier FROM public.admin_subscriptions 
     WHERE user_id = _user_id AND is_active = true
     ORDER BY CASE tier 
       WHEN 'shelter' THEN 0 WHEN 'educator' THEN 1 WHEN 'expert' THEN 2 WHEN 'pro' THEN 3 
     END
     LIMIT 1),
    -- Then check stripe_customers
    (SELECT current_tier FROM public.stripe_customers 
     WHERE user_id = _user_id
     LIMIT 1),
    -- Default
    'starter'
  );
$$;

-- 3. Helper to check if tier meets minimum requirement
CREATE OR REPLACE FUNCTION public.tier_meets_minimum(_user_tier text, _min_tier text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
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

-- 4. Trigger to enforce dog creation limit
CREATE OR REPLACE FUNCTION public.enforce_dog_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_tier text;
  dog_count integer;
  max_dogs integer;
BEGIN
  -- Admins and educators bypass
  IF public.has_role(NEW.user_id, 'admin') OR public.has_role(NEW.user_id, 'educator') THEN
    RETURN NEW;
  END IF;

  user_tier := public.get_user_tier(NEW.user_id);
  
  SELECT COUNT(*) INTO dog_count FROM public.dogs WHERE user_id = NEW.user_id;
  
  max_dogs := CASE user_tier
    WHEN 'expert' THEN 999999
    WHEN 'pro' THEN 3
    ELSE 1
  END;

  IF dog_count >= max_dogs THEN
    RAISE EXCEPTION 'Limite de chiens atteinte pour le plan %. Passez au plan supérieur.', user_tier;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_dog_limit_trigger ON public.dogs;
CREATE TRIGGER enforce_dog_limit_trigger
  BEFORE INSERT ON public.dogs
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_dog_limit();

-- 5. Trigger to enforce behavior_evaluation (Pro+ only)
CREATE OR REPLACE FUNCTION public.enforce_evaluation_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_tier text;
BEGIN
  IF public.has_role(NEW.user_id, 'admin') OR public.has_role(NEW.user_id, 'educator') THEN
    RETURN NEW;
  END IF;

  user_tier := public.get_user_tier(NEW.user_id);
  
  IF NOT public.tier_meets_minimum(user_tier, 'pro') THEN
    RAISE EXCEPTION 'L''évaluation comportementale nécessite le plan Pro ou supérieur.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_evaluation_tier_trigger ON public.dog_evaluations;
CREATE TRIGGER enforce_evaluation_tier_trigger
  BEFORE INSERT ON public.dog_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_evaluation_tier();

-- 6. Trigger to enforce advanced objectives (Pro+ only)
CREATE OR REPLACE FUNCTION public.enforce_objectives_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_tier text;
BEGIN
  IF public.has_role(NEW.user_id, 'admin') OR public.has_role(NEW.user_id, 'educator') THEN
    RETURN NEW;
  END IF;

  user_tier := public.get_user_tier(NEW.user_id);
  
  IF NOT public.tier_meets_minimum(user_tier, 'pro') THEN
    RAISE EXCEPTION 'Les objectifs avancés nécessitent le plan Pro ou supérieur.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_objectives_tier_trigger ON public.dog_objectives;
CREATE TRIGGER enforce_objectives_tier_trigger
  BEFORE INSERT ON public.dog_objectives
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_objectives_tier();

-- 7. Trigger to enforce problems (Pro+ only)
CREATE OR REPLACE FUNCTION public.enforce_problems_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_tier text;
BEGIN
  IF public.has_role(NEW.user_id, 'admin') OR public.has_role(NEW.user_id, 'educator') THEN
    RETURN NEW;
  END IF;

  user_tier := public.get_user_tier(NEW.user_id);
  
  IF NOT public.tier_meets_minimum(user_tier, 'pro') THEN
    RAISE EXCEPTION 'La gestion des problèmes nécessite le plan Pro ou supérieur.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_problems_tier_trigger ON public.dog_problems;
CREATE TRIGGER enforce_problems_tier_trigger
  BEFORE INSERT ON public.dog_problems
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_problems_tier();

-- 8. RPC to get exercise detail with tier enforcement
-- Returns NULL for premium content fields if user doesn't have access
CREATE OR REPLACE FUNCTION public.get_exercise_for_user(_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  exercise_row exercises%ROWTYPE;
  user_tier text;
  result jsonb;
BEGIN
  SELECT * INTO exercise_row FROM public.exercises WHERE slug = _slug;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Admins and educators get full access
  IF public.is_admin() OR public.is_educator() THEN
    SELECT to_jsonb(e.*) || jsonb_build_object(
      'category_name', ec.name, 'category_icon', ec.icon, 'category_slug', ec.slug
    )
    INTO result
    FROM public.exercises e
    JOIN public.exercise_categories ec ON ec.id = e.category_id
    WHERE e.slug = _slug;
    RETURN result;
  END IF;

  user_tier := public.get_user_tier(auth.uid());

  -- If user doesn't meet the min_tier, return only basic info (name, category, locked state)
  IF NOT public.tier_meets_minimum(user_tier, exercise_row.min_tier) THEN
    SELECT jsonb_build_object(
      'id', e.id, 'slug', e.slug, 'name', e.name, 'min_tier', e.min_tier,
      'cover_image', e.cover_image, 'level', e.level, 'objective', e.objective,
      'category_name', ec.name, 'category_icon', ec.icon, 'category_slug', ec.slug,
      'locked', true
    )
    INTO result
    FROM public.exercises e
    JOIN public.exercise_categories ec ON ec.id = e.category_id
    WHERE e.slug = _slug;
    RETURN result;
  END IF;

  -- Full access
  SELECT to_jsonb(e.*) || jsonb_build_object(
    'category_name', ec.name, 'category_icon', ec.icon, 'category_slug', ec.slug,
    'locked', false
  )
  INTO result
  FROM public.exercises e
  JOIN public.exercise_categories ec ON ec.id = e.category_id
  WHERE e.slug = _slug;
  RETURN result;
END;
$$;
