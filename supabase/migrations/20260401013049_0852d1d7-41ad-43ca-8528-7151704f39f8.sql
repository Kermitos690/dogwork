
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
        intensity_level = COALESCE((ex->>'intensity_level')::int, intensity_level),
        cognitive_load = COALESCE((ex->>'cognitive_load')::int, cognitive_load),
        physical_load = COALESCE((ex->>'physical_load')::int, physical_load),
        success_criteria = COALESCE(NULLIF(ex->>'success_criteria',''), NULLIF(success_criteria,'')),
        stop_criteria = COALESCE(NULLIF(ex->>'stop_criteria',''), NULLIF(stop_criteria,'')),
        validation_protocol = COALESCE(NULLIF(ex->>'validation_protocol',''), NULLIF(validation_protocol,'')),
        vigilance = COALESCE(NULLIF(ex->>'vigilance',''), NULLIF(vigilance,'')),
        progression_next = COALESCE(NULLIF(ex->>'progression_next',''), NULLIF(progression_next,'')),
        regression_simplified = COALESCE(NULLIF(ex->>'regression_simplified',''), NULLIF(regression_simplified,'')),
        age_recommendation = COALESCE(NULLIF(ex->>'age_recommendation',''), NULLIF(age_recommendation,'')),
        tutorial_steps = COALESCE(ex->'tutorial_steps', tutorial_steps),
        voice_commands = COALESCE(ex->'voice_commands', voice_commands),
        body_positioning = COALESCE(ex->'body_positioning', body_positioning),
        troubleshooting = COALESCE(ex->'troubleshooting', troubleshooting),
        mistakes = COALESCE(ex->'mistakes', mistakes),
        adaptations = COALESCE(ex->'adaptations', adaptations),
        suitable_profiles = COALESCE(ex->'suitable_profiles', suitable_profiles),
        contraindications = COALESCE(ex->'contraindications', contraindications),
        precautions = COALESCE(ex->'precautions', precautions),
        health_precautions = COALESCE(ex->'health_precautions', health_precautions)
      WHERE slug = ex_slug_val;
      ex_updated := ex_updated + 1;
    EXCEPTION WHEN OTHERS THEN
      ex_failed := ex_failed + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'categories_synced', cat_synced,
    'exercises_updated', ex_updated,
    'exercises_failed', ex_failed
  );
END;
$function$;
