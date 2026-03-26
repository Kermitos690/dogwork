-- Lot 4: Create a view that hides stripe_account_id from coach_profiles for non-owners
-- Instead of a view, we'll fix the RLS policy to exclude sensitive columns
-- Actually, RLS cannot filter columns — we need to drop the existing overly-broad policy 
-- and create a restricted one using a security definer function

-- Create a function that returns coach profile data without stripe info
CREATE OR REPLACE FUNCTION public.get_coach_profile_safe(target_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  display_name text,
  specialty text,
  bio text,
  created_at timestamptz,
  updated_at timestamptz,
  stripe_onboarding_complete boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    cp.id, cp.user_id, cp.display_name, cp.specialty, cp.bio,
    cp.created_at, cp.updated_at, cp.stripe_onboarding_complete
  FROM public.coach_profiles cp
  WHERE cp.user_id = target_user_id;
$$;

-- Lot 4: Stop storing pin_code in clear — we'll hash it
-- First, add a hashed_pin column
ALTER TABLE public.shelter_employees ADD COLUMN IF NOT EXISTS hashed_pin text;
