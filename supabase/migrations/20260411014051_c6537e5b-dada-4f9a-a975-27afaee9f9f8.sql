
-- Trigger function: auto-create adopter_link when animal status changes to 'adopté'
CREATE OR REPLACE FUNCTION public.auto_create_adopter_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  adopter_uid uuid;
BEGIN
  -- Only fire when status changes TO 'adopté'
  IF NEW.status = 'adopté' AND (OLD.status IS DISTINCT FROM 'adopté') THEN
    -- Find matching user by adopter_email
    IF NEW.adopter_email IS NOT NULL AND NEW.adopter_email <> '' THEN
      SELECT id INTO adopter_uid
      FROM auth.users
      WHERE lower(email) = lower(trim(NEW.adopter_email))
      LIMIT 1;

      IF adopter_uid IS NOT NULL THEN
        -- Insert adopter_link (anti-doublon via unique index)
        INSERT INTO public.adopter_links (adopter_user_id, shelter_user_id, animal_id, animal_name)
        VALUES (adopter_uid, NEW.user_id, NEW.id, NEW.name)
        ON CONFLICT (adopter_user_id, animal_id) DO NOTHING;

        -- Log the action in shelter_activity_log
        INSERT INTO public.shelter_activity_log (shelter_user_id, animal_id, action_type, description, employee_name, employee_role)
        VALUES (
          NEW.user_id,
          NEW.id,
          'adoption',
          'Lien adoptant créé automatiquement pour ' || COALESCE(NEW.adopter_name, NEW.adopter_email) || ' — animal : ' || NEW.name,
          'Système',
          'system'
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger on shelter_animals
CREATE TRIGGER trg_auto_adopter_link
  AFTER UPDATE ON public.shelter_animals
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_adopter_link();
