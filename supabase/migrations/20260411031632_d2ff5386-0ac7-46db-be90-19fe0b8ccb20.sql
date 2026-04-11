
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
  ex_inserted int := 0;
  ex_failed int := 0;
  cat_synced int := 0;
  cat_slug_val text;
  ex_slug_val text;
  cat_map jsonb := '{}'::jsonb;
BEGIN
  -- Sync categories (upsert)
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

  -- Sync exercises (upsert: update existing, INSERT missing)
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
      -- Try UPDATE first
      UPDATE exercises SET
        category_id = live_cat_id,
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
        cover_image = COALESCE(NULLIF(ex->>'cover_image',''), NULLIF(cover_image,'')),
        level = COALESCE(NULLIF(ex->>'level',''), level),
        exercise_type = COALESCE(NULLIF(ex->>'exercise_type',''), exercise_type),
        min_tier = COALESCE(NULLIF(ex->>'min_tier',''), min_tier),
        sort_order = COALESCE((ex->>'sort_order')::int, sort_order),
        intensity_level = COALESCE((ex->>'intensity_level')::int, intensity_level),
        cognitive_load = COALESCE((ex->>'cognitive_load')::int, cognitive_load),
        physical_load = COALESCE((ex->>'physical_load')::int, physical_load),
        difficulty = COALESCE((ex->>'difficulty')::int, difficulty),
        tutorial_steps = CASE
          WHEN ex->'tutorial_steps' IS NOT NULL AND ex->'tutorial_steps' != 'null'::jsonb AND ex->'tutorial_steps' != '[]'::jsonb
          THEN ex->'tutorial_steps' ELSE COALESCE(tutorial_steps, '[]'::jsonb) END,
        voice_commands = CASE
          WHEN ex->'voice_commands' IS NOT NULL AND ex->'voice_commands' != 'null'::jsonb AND ex->'voice_commands' != '[]'::jsonb
          THEN ex->'voice_commands' ELSE COALESCE(voice_commands, '[]'::jsonb) END,
        body_positioning = CASE
          WHEN ex->'body_positioning' IS NOT NULL AND ex->'body_positioning' != 'null'::jsonb
          THEN ex->'body_positioning' ELSE body_positioning END,
        troubleshooting = CASE
          WHEN ex->'troubleshooting' IS NOT NULL AND ex->'troubleshooting' != 'null'::jsonb AND ex->'troubleshooting' != '[]'::jsonb
          THEN ex->'troubleshooting' ELSE COALESCE(troubleshooting, '[]'::jsonb) END,
        mistakes = CASE
          WHEN ex->'mistakes' IS NOT NULL AND ex->'mistakes' != 'null'::jsonb AND ex->'mistakes' != '[]'::jsonb
          THEN ex->'mistakes' ELSE COALESCE(mistakes, '[]'::jsonb) END,
        adaptations = CASE
          WHEN ex->'adaptations' IS NOT NULL AND ex->'adaptations' != 'null'::jsonb
          THEN ex->'adaptations' ELSE adaptations END,
        suitable_profiles = CASE
          WHEN ex->'suitable_profiles' IS NOT NULL AND ex->'suitable_profiles' != 'null'::jsonb
          THEN ex->'suitable_profiles' ELSE suitable_profiles END,
        contraindications = CASE
          WHEN ex->'contraindications' IS NOT NULL AND ex->'contraindications' != 'null'::jsonb
          THEN ex->'contraindications' ELSE contraindications END,
        precautions = CASE
          WHEN ex->'precautions' IS NOT NULL AND ex->'precautions' != 'null'::jsonb
          THEN ex->'precautions' ELSE precautions END,
        health_precautions = CASE
          WHEN ex->'health_precautions' IS NOT NULL AND ex->'health_precautions' != 'null'::jsonb
          THEN ex->'health_precautions' ELSE health_precautions END,
        steps = CASE
          WHEN ex->'steps' IS NOT NULL AND ex->'steps' != 'null'::jsonb AND ex->'steps' != '[]'::jsonb
          THEN ex->'steps' ELSE COALESCE(steps, '[]'::jsonb) END,
        equipment = CASE
          WHEN jsonb_typeof(ex->'equipment') = 'array' AND jsonb_array_length(ex->'equipment') > 0
          THEN ARRAY(SELECT jsonb_array_elements_text(ex->'equipment')) ELSE equipment END,
        tags = CASE
          WHEN jsonb_typeof(ex->'tags') = 'array' AND jsonb_array_length(ex->'tags') > 0
          THEN ARRAY(SELECT jsonb_array_elements_text(ex->'tags')) ELSE tags END,
        prerequisites = CASE
          WHEN jsonb_typeof(ex->'prerequisites') = 'array' AND jsonb_array_length(ex->'prerequisites') > 0
          THEN ARRAY(SELECT jsonb_array_elements_text(ex->'prerequisites')) ELSE prerequisites END,
        priority_axis = CASE
          WHEN jsonb_typeof(ex->'priority_axis') = 'array' AND jsonb_array_length(ex->'priority_axis') > 0
          THEN ARRAY(SELECT jsonb_array_elements_text(ex->'priority_axis')) ELSE priority_axis END,
        secondary_benefits = CASE
          WHEN jsonb_typeof(ex->'secondary_benefits') = 'array' AND jsonb_array_length(ex->'secondary_benefits') > 0
          THEN ARRAY(SELECT jsonb_array_elements_text(ex->'secondary_benefits')) ELSE secondary_benefits END,
        target_breeds = CASE
          WHEN jsonb_typeof(ex->'target_breeds') = 'array' AND jsonb_array_length(ex->'target_breeds') > 0
          THEN ARRAY(SELECT jsonb_array_elements_text(ex->'target_breeds')) ELSE target_breeds END,
        target_problems = CASE
          WHEN jsonb_typeof(ex->'target_problems') = 'array' AND jsonb_array_length(ex->'target_problems') > 0
          THEN ARRAY(SELECT jsonb_array_elements_text(ex->'target_problems')) ELSE target_problems END,
        compatible_muzzle = COALESCE((ex->>'compatible_muzzle')::boolean, compatible_muzzle),
        compatible_puppy = COALESCE((ex->>'compatible_puppy')::boolean, compatible_puppy),
        compatible_reactivity = COALESCE((ex->>'compatible_reactivity')::boolean, compatible_reactivity),
        compatible_senior = COALESCE((ex->>'compatible_senior')::boolean, compatible_senior),
        is_professional = COALESCE((ex->>'is_professional')::boolean, is_professional)
      WHERE slug = ex_slug_val;

      IF FOUND THEN
        ex_updated := ex_updated + 1;
      ELSE
        -- INSERT the missing exercise
        INSERT INTO exercises (
          slug, name, category_id, description, summary, short_instruction, short_title,
          objective, dedication, duration, repetitions, frequency, environment,
          success_criteria, stop_criteria, validation_protocol, vigilance,
          progression_next, regression_simplified, age_recommendation, cover_image,
          level, exercise_type, min_tier, sort_order,
          intensity_level, cognitive_load, physical_load, difficulty,
          tutorial_steps, voice_commands, body_positioning, troubleshooting,
          mistakes, adaptations, suitable_profiles, contraindications, precautions,
          health_precautions, steps, equipment, tags, prerequisites, priority_axis,
          secondary_benefits, target_breeds, target_problems,
          compatible_muzzle, compatible_puppy, compatible_reactivity, compatible_senior, is_professional
        ) VALUES (
          ex_slug_val,
          COALESCE(ex->>'name', ex_slug_val),
          live_cat_id,
          ex->>'description',
          ex->>'summary',
          ex->>'short_instruction',
          ex->>'short_title',
          ex->>'objective',
          ex->>'dedication',
          ex->>'duration',
          ex->>'repetitions',
          ex->>'frequency',
          ex->>'environment',
          ex->>'success_criteria',
          ex->>'stop_criteria',
          ex->>'validation_protocol',
          ex->>'vigilance',
          ex->>'progression_next',
          ex->>'regression_simplified',
          ex->>'age_recommendation',
          ex->>'cover_image',
          COALESCE(ex->>'level', 'beginner'),
          ex->>'exercise_type',
          COALESCE(ex->>'min_tier', 'starter'),
          (ex->>'sort_order')::int,
          (ex->>'intensity_level')::int,
          (ex->>'cognitive_load')::int,
          (ex->>'physical_load')::int,
          (ex->>'difficulty')::int,
          COALESCE(ex->'tutorial_steps', '[]'::jsonb),
          COALESCE(ex->'voice_commands', '[]'::jsonb),
          ex->'body_positioning',
          COALESCE(ex->'troubleshooting', '[]'::jsonb),
          COALESCE(ex->'mistakes', '[]'::jsonb),
          ex->'adaptations',
          ex->'suitable_profiles',
          ex->'contraindications',
          ex->'precautions',
          ex->'health_precautions',
          COALESCE(ex->'steps', '[]'::jsonb),
          CASE WHEN jsonb_typeof(ex->'equipment') = 'array' THEN ARRAY(SELECT jsonb_array_elements_text(ex->'equipment')) ELSE NULL END,
          CASE WHEN jsonb_typeof(ex->'tags') = 'array' THEN ARRAY(SELECT jsonb_array_elements_text(ex->'tags')) ELSE NULL END,
          CASE WHEN jsonb_typeof(ex->'prerequisites') = 'array' THEN ARRAY(SELECT jsonb_array_elements_text(ex->'prerequisites')) ELSE NULL END,
          CASE WHEN jsonb_typeof(ex->'priority_axis') = 'array' THEN ARRAY(SELECT jsonb_array_elements_text(ex->'priority_axis')) ELSE NULL END,
          CASE WHEN jsonb_typeof(ex->'secondary_benefits') = 'array' THEN ARRAY(SELECT jsonb_array_elements_text(ex->'secondary_benefits')) ELSE NULL END,
          CASE WHEN jsonb_typeof(ex->'target_breeds') = 'array' THEN ARRAY(SELECT jsonb_array_elements_text(ex->'target_breeds')) ELSE NULL END,
          CASE WHEN jsonb_typeof(ex->'target_problems') = 'array' THEN ARRAY(SELECT jsonb_array_elements_text(ex->'target_problems')) ELSE NULL END,
          COALESCE((ex->>'compatible_muzzle')::boolean, false),
          COALESCE((ex->>'compatible_puppy')::boolean, false),
          COALESCE((ex->>'compatible_reactivity')::boolean, false),
          COALESCE((ex->>'compatible_senior')::boolean, false),
          COALESCE((ex->>'is_professional')::boolean, false)
        );
        ex_inserted := ex_inserted + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      ex_failed := ex_failed + 1;
      RAISE NOTICE 'Failed slug %: %', ex_slug_val, SQLERRM;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'categories_synced', cat_synced,
    'exercises_updated', ex_updated,
    'exercises_inserted', ex_inserted,
    'exercises_failed', ex_failed
  );
END;
$function$;
