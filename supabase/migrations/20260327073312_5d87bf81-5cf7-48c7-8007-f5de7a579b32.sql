
-- Fix SECURITY DEFINER views by setting them to SECURITY INVOKER
ALTER VIEW public.shelter_employees_safe SET (security_invoker = on);
ALTER VIEW public.shelter_animals_safe SET (security_invoker = on);
