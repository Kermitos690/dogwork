
-- Create is_shelter_employee function for RLS
CREATE OR REPLACE FUNCTION public.is_shelter_employee()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'shelter_employee'
  )
$$;

-- Function to get shelter_user_id for a shelter employee
CREATE OR REPLACE FUNCTION public.get_employee_shelter_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT shelter_user_id FROM public.shelter_employees
  WHERE auth_user_id = _user_id AND is_active = true
  LIMIT 1
$$;
