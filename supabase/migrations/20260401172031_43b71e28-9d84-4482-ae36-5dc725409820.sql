CREATE OR REPLACE FUNCTION public.sync_exercises_from_catalog_data(_catalog jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ex jsonb;
  cat jsonb;
  live_cat_id uuid;
  existing_cat_id uuid;
  ex_updated int := 0;
  ex_failed int := 0;
  cat_synced int := 0;
  cat_slug_val text;
  ex_slug_val text;
  cat_map jsonb := '{}'::jsonb;
BEGIN
  -- Sync categories
  FOR cat IN SELECT * FROM jsonb_array_elements(_catalog->'categories')
  LOOP
    cat_slug_val := cat->>'slug';
    SELECT id INTO existing_cat_id FROM exercise_categories WHERE slug = cat_slug_val;
    IF existing_cat_id IS NOT NULL THEN
      UPDATE exercise_categories SET
        name = COALESCE(NULLIF(cat->>'name',''), name),
        icon = COALESCE(NULLIF(cat->>'icon',''), icon),
        color = COALESCE(NULLIF(cat->>'color',''), color),
        description = COALESCE(NULLIF(cat->>'description',''), description),
        sort_order = COALESCE((cat->>'sort_order')::int, sort_order),
        is_professional = COALESCE((cat->>'is_professional')::boolean, is_professional)
      WHERE id = existing_cat_id;
      cat_map := cat_map || jsonb_build_object(cat_slug_val, existing_cat_id::text);
    ELSE
      INSERT INTO exercise_categories (slug, name, icon, color, description, sort_order, is_professional)
      VALUES (cat_slug_val, cat->>'name', cat->>'icon', cat->>'color', cat->>'description',
              (cat->>'sort_order')::int, COALESCE((cat->>'is_professional')::boolean, false))
      RETURNING id INTO existing_cat_id;
      cat_map := cat_map || jsonb_build_object(cat_slug_val, existing_cat_id::text);
    END IF;
    cat_synced := cat_synced + 1;
  END LOOP;

  -- Sync exercises
  FOR ex IN SELECT * FROM jsonb_array_elements(_catalog->'exercises')
  LOOP
    ex_slug_val := ex->>'slug';
    cat_slug_val := ex->>'category_slug';
    live_cat_id := (cat_map->>cat_slug_val)::uuid;
    IF live_cat_id IS NULL THEN
      SELECT id INTO live_cat_id FROM exercise_categories WHERE slug = cat_slug_val;
    END IF;
    IF live_cat_id IS NULL THEN
      ex_failed := ex_failed + 1;
      CONTINUE;
    END IF;
    BEGIN
      UPDATE exercises SET
        category_id = live_cat_id,
        -- Text fields: catalog wins over empty
        name = COALESCE(NULLIF(ex->>'name',''), name),
        description = COALESCE(NULLIF(ex->>'description',''), NULLIF(description,'')),
        summary = COALESCE(NULLIF(ex->>'summary',''), NULLIF(summary,'')),
        short_instruction = COALESCE(NULLIF(ex->>'short_instruction',''), NULLIF(short_instruction,'')),
        short_title = COALESCE(NULLIF(ex->>'short_title',''), NULLIF(short_title,'')),
        objective = COALESCE(NULLIF(ex->>'objective',''), NULLIF(objective,'')),
        dedication = COALESCE(NULLIF(ex->>'dedication',''), NULLIF(dedication,'')),
        duration = COALESCE(NULLIF(ex->>'duration',''), NULLIF(duration,'')),
        repetitions = COALESCE(NULLIF(ex->>'repetitions',''), NULLIF(repetitions,'')),
        frequency = COALESCE(NULLIF(ex->>'frequency',''), NULLIF(frequency,'')),
        environment = COALESCE(NULLIF(ex->>'environment',''), NULLIF(environment,'')),
        success_criteria = COALESCE(NULLIF(ex->>'success_criteria',''), NULLIF(success_criteria,'')),
        stop_criteria = COALESCE(NULLIF(ex->>'stop_criteria',''), NULLIF(stop_criteria,'')),
        validation_protocol = COALESCE(NULLIF(ex->>'validation_protocol',''), NULLIF(validation_protocol,'')),
        vigilance = COALESCE(NULLIF(ex->>'vigilance',''), NULLIF(vigilance,'')),
        progression_next = COALESCE(NULLIF(ex->>'progression_next',''), NULLIF(progression_next,'')),
        regression_simplified = COALESCE(NULLIF(ex->>'regression_simplified',''), NULLIF(regression_simplified,'')),
        age_recommendation = COALESCE(NULLIF(ex->>'age_recommendation',''), NULLIF(age_recommendation,'')),
        -- Cover image: catalog wins over empty/null
        cover_image = COALESCE(NULLIF(ex->>'cover_image',''), NULLIF(cover_image,'')),
        -- Integer fields
        intensity_level = COALESCE((ex->>'intensity_level')::int, intensity_level),
        cognitive_load = COALESCE((ex->>'cognitive_load')::int, cognitive_load),
        physical_load = COALESCE((ex->>'physical_load')::int, physical_load),
        difficulty = COALESCE((ex->>'difficulty')::int, difficulty),
        -- JSONB fields: catalog wins over empty arrays/null
        tutorial_steps = CASE
          WHEN ex->'tutorial_steps' IS NOT NULL AND ex->'tutorial_steps' != '[]'::jsonb AND ex->'tutorial_steps' != 'null'::jsonb
          THEN ex->'tutorial_steps'
          ELSE COALESCE(tutorial_steps, '[]'::jsonb)
        END,
        voice_commands = CASE
          WHEN ex->'voice_commands' IS NOT NULL AND ex->'voice_commands' != '[]'::jsonb AND ex->'voice_commands' != 'null'::jsonb
          THEN ex->'voice_commands'
          ELSE COALESCE(voice_commands, '[]'::jsonb)
        END,
        body_positioning = CASE
          WHEN ex->'body_positioning' IS NOT NULL AND ex->'body_positioning' != 'null'::jsonb
          THEN ex->'body_positioning'
          ELSE body_positioning
        END,
        troubleshooting = CASE
          WHEN ex->'troubleshooting' IS NOT NULL AND ex->'troubleshooting' != '[]'::jsonb AND ex->'troubleshooting' != 'null'::jsonb
          THEN ex->'troubleshooting'
          ELSE COALESCE(troubleshooting, '[]'::jsonb)
        END,
        mistakes = CASE
          WHEN ex->'mistakes' IS NOT NULL AND ex->'mistakes' != '[]'::jsonb AND ex->'mistakes' != 'null'::jsonb
          THEN ex->'mistakes'
          ELSE COALESCE(mistakes, '[]'::jsonb)
        END,
        adaptations = CASE
          WHEN ex->'adaptations' IS NOT NULL AND ex->'adaptations' != 'null'::jsonb
          THEN ex->'adaptations'
          ELSE adaptations
        END,
        suitable_profiles = CASE
          WHEN ex->'suitable_profiles' IS NOT NULL AND ex->'suitable_profiles' != 'null'::jsonb
          THEN ex->'suitable_profiles'
          ELSE suitable_profiles
        END,
        contraindications = CASE
          WHEN ex->'contraindications' IS NOT NULL AND ex->'contraindications' != 'null'::jsonb
          THEN ex->'contraindications'
          ELSE contraindications
        END,
        precautions = CASE
          WHEN ex->'precautions' IS NOT NULL AND ex->'precautions' != 'null'::jsonb
          THEN ex->'precautions'
          ELSE precautions
        END,
        health_precautions = CASE
          WHEN ex->'health_precautions' IS NOT NULL AND ex->'health_precautions' != 'null'::jsonb
          THEN ex->'health_precautions'
          ELSE health_precautions
        END,
        steps = CASE
          WHEN ex->'steps' IS NOT NULL AND ex->'steps' != '[]'::jsonb AND ex->'steps' != 'null'::jsonb
          THEN ex->'steps'
          ELSE COALESCE(steps, '[]'::jsonb)
        END,
        -- Array fields
        equipment = CASE
          WHEN ex->'equipment' IS NOT NULL AND ex->'equipment' != '[]'::jsonb
          THEN ARRAY(SELECT jsonb_array_elements_text(ex->'equipment'))
          ELSE equipment
        END,
        tags = CASE
          WHEN ex->'tags' IS NOT NULL AND ex->'tags' != '[]'::jsonb
          THEN ARRAY(SELECT jsonb_array_elements_text(ex->'tags'))
          ELSE tags
        END,
        prerequisites = CASE
          WHEN ex->'prerequisites' IS NOT NULL AND ex->'prerequisites' != '[]'::jsonb
          THEN ARRAY(SELECT jsonb_array_elements_text(ex->'prerequisites'))
          ELSE prerequisites
        END,
        priority_axis = CASE
          WHEN ex->'priority_axis' IS NOT NULL AND ex->'priority_axis' != '[]'::jsonb
          THEN ARRAY(SELECT jsonb_array_elements_text(ex->'priority_axis'))
          ELSE priority_axis
        END,
        secondary_benefits = CASE
          WHEN ex->'secondary_benefits' IS NOT NULL AND ex->'secondary_benefits' != '[]'::jsonb
          THEN ARRAY(SELECT jsonb_array_elements_text(ex->'secondary_benefits'))
          ELSE secondary_benefits
        END,
        target_breeds = CASE
          WHEN ex->'target_breeds' IS NOT NULL AND ex->'target_breeds' != '[]'::jsonb
          THEN ARRAY(SELECT jsonb_array_elements_text(ex->'target_breeds'))
          ELSE target_breeds
        END,
        target_problems = CASE
          WHEN ex->'target_problems' IS NOT NULL AND ex->'target_problems' != '[]'::jsonb
          THEN ARRAY(SELECT jsonb_array_elements_text(ex->'target_problems'))
          ELSE target_problems
        END,
        -- Boolean fields
        compatible_muzzle = COALESCE((ex->>'compatible_muzzle')::boolean, compatible_muzzle),
        compatible_puppy = COALESCE((ex->>'compatible_puppy')::boolean, compatible_puppy),
        compatible_reactivity = COALESCE((ex->>'compatible_reactivity')::boolean, compatible_reactivity),
        compatible_senior = COALESCE((ex->>'compatible_senior')::boolean, compatible_senior),
        is_professional = COALESCE((ex->>'is_professional')::boolean, is_professional)
      WHERE slug = ex_slug_val;
      IF FOUND THEN
        ex_updated := ex_updated + 1;
      ELSE
        ex_failed := ex_failed + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      ex_failed := ex_failed + 1;
      RAISE NOTICE 'Failed slug %: %', ex_slug_val, SQLERRM;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'categories_synced', cat_synced,
    'exercises_updated', ex_updated,
    'exercises_failed', ex_failed
  );
END;
$function$