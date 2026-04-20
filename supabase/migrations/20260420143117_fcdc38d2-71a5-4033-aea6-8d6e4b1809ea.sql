-- Clean legacy duplicates: keep only the most recent active override per user
WITH ranked AS (
  SELECT id,
         user_id,
         row_number() OVER (
           PARTITION BY user_id
           ORDER BY updated_at DESC, created_at DESC, id DESC
         ) AS rn
  FROM public.admin_subscriptions
  WHERE is_active = true
)
UPDATE public.admin_subscriptions s
SET is_active = false,
    updated_at = now(),
    notes = CASE
      WHEN coalesce(s.notes, '') = '' THEN 'Auto-disabled legacy duplicate override'
      ELSE s.notes || ' · Auto-disabled legacy duplicate override'
    END
FROM ranked r
WHERE s.id = r.id
  AND r.rn > 1;

-- Enforce at most one active override per user
DROP INDEX IF EXISTS public.admin_subscriptions_one_active_per_user_idx;
CREATE UNIQUE INDEX admin_subscriptions_one_active_per_user_idx
ON public.admin_subscriptions (user_id)
WHERE is_active = true;

-- Server-side tier resolution must use the current override, not the highest historical tier
CREATE OR REPLACE FUNCTION public.get_user_tier(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT s.tier
      FROM public.admin_subscriptions s
      WHERE s.user_id = _user_id
        AND s.is_active = true
      ORDER BY s.updated_at DESC, s.created_at DESC, s.id DESC
      LIMIT 1
    ),
    (
      SELECT sc.current_tier
      FROM public.stripe_customers sc
      WHERE sc.user_id = _user_id
      LIMIT 1
    ),
    'starter'
  )
$$;