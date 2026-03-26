
-- Trigger function: auto-send message to shelter when evaluation is submitted
CREATE OR REPLACE FUNCTION public.notify_shelter_on_evaluation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  animal_name text;
  coach_name text;
BEGIN
  -- Get the animal name
  SELECT name INTO animal_name
  FROM public.shelter_animals
  WHERE id = NEW.animal_id;

  -- Get the coach display name
  SELECT COALESCE(cp.display_name, p.display_name, 'Un éducateur')
  INTO coach_name
  FROM public.profiles p
  LEFT JOIN public.coach_profiles cp ON cp.user_id = p.user_id
  WHERE p.user_id = NEW.coach_user_id
  LIMIT 1;

  -- Insert a message from the coach to the shelter
  INSERT INTO public.messages (sender_id, recipient_id, content)
  VALUES (
    NEW.coach_user_id,
    NEW.shelter_user_id,
    '📋 Nouvelle évaluation comportementale soumise pour **' || COALESCE(animal_name, 'un animal') || '** par ' || coach_name || '.' ||
    CASE WHEN NEW.adoption_ready = true THEN ' ✅ Animal jugé prêt pour l''adoption.' ELSE '' END ||
    CASE WHEN NEW.recommended_profile IS NOT NULL AND NEW.recommended_profile != '' THEN ' Profil recommandé : ' || NEW.recommended_profile || '.' ELSE '' END
  );

  RETURN NEW;
END;
$$;

-- Create trigger on shelter_animal_evaluations
CREATE TRIGGER trigger_notify_shelter_on_evaluation
AFTER INSERT ON public.shelter_animal_evaluations
FOR EACH ROW
EXECUTE FUNCTION public.notify_shelter_on_evaluation();
