import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Local (production) client
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Source instance (Preview/Test - has the 480 exercises)
    const SOURCE_URL = "https://dcwbqsfeouvghcnvhrpj.supabase.co";
    const SOURCE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjd2Jxc2Zlb3V2Z2hjbnZocnBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzkxMDcsImV4cCI6MjA4ODgxNTEwN30.wF0VlmMKVqeJOo2q3GlWVzl1-EyYMd3-i2YDhYBKfog";
    const sourceClient = createClient(SOURCE_URL, SOURCE_ANON);

    const steps: Record<string, unknown>[] = [];

    // Check current production count
    const { count: prodCount } = await supabase.from("exercises").select("id", { count: "exact", head: true });
    steps.push({ step: "check_prod", exercises: prodCount });

    if ((prodCount || 0) >= 480) {
      return new Response(JSON.stringify({ message: "Production already has 480+ exercises", steps }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read categories from Test
    const { data: sourceCats, error: catErr } = await sourceClient.from("exercise_categories").select("*");
    if (catErr) throw new Error(`Read source categories: ${catErr.message}`);
    steps.push({ step: "read_source_categories", count: sourceCats?.length });

    // Read exercises from Test in batches (limit 1000 per query)
    const allExercises: unknown[] = [];
    let offset = 0;
    const BATCH = 500;
    while (true) {
      const { data: batch, error: exErr } = await sourceClient
        .from("exercises")
        .select("*, exercise_categories!inner(slug)")
        .range(offset, offset + BATCH - 1)
        .order("slug");
      if (exErr) throw new Error(`Read source exercises at offset ${offset}: ${exErr.message}`);
      if (!batch || batch.length === 0) break;
      allExercises.push(...batch);
      offset += batch.length;
      if (batch.length < BATCH) break;
    }
    steps.push({ step: "read_source_exercises", count: allExercises.length });

    // Build catalog format for RPC
    const categories = (sourceCats || []).map((c: Record<string, unknown>) => ({
      slug: c.slug,
      name: c.name,
      icon: c.icon,
      color: c.color,
      description: c.description,
      sort_order: c.sort_order,
      is_professional: c.is_professional,
    }));

    const exercises = (allExercises as Record<string, unknown>[]).map((e) => {
      const catInfo = e.exercise_categories as Record<string, unknown> | null;
      return {
        slug: e.slug,
        category_slug: catInfo?.slug || "",
        name: e.name,
        description: e.description,
        summary: e.summary,
        short_instruction: e.short_instruction,
        short_title: e.short_title,
        objective: e.objective,
        dedication: e.dedication,
        duration: e.duration,
        repetitions: e.repetitions,
        frequency: e.frequency,
        environment: e.environment,
        success_criteria: e.success_criteria,
        stop_criteria: e.stop_criteria,
        validation_protocol: e.validation_protocol,
        vigilance: e.vigilance,
        progression_next: e.progression_next,
        regression_simplified: e.regression_simplified,
        age_recommendation: e.age_recommendation,
        cover_image: e.cover_image,
        level: e.level,
        exercise_type: e.exercise_type,
        min_tier: e.min_tier,
        sort_order: e.sort_order,
        intensity_level: e.intensity_level,
        cognitive_load: e.cognitive_load,
        physical_load: e.physical_load,
        difficulty: e.difficulty,
        is_professional: e.is_professional,
        compatible_puppy: e.compatible_puppy,
        compatible_senior: e.compatible_senior,
        compatible_reactivity: e.compatible_reactivity,
        compatible_muzzle: e.compatible_muzzle,
        equipment: e.equipment,
        tags: e.tags,
        target_problems: e.target_problems,
        target_breeds: e.target_breeds,
        priority_axis: e.priority_axis,
        secondary_benefits: e.secondary_benefits,
        prerequisites: e.prerequisites,
        steps: e.steps,
        tutorial_steps: e.tutorial_steps,
        mistakes: e.mistakes,
        precautions: e.precautions,
        troubleshooting: e.troubleshooting,
        voice_commands: e.voice_commands,
        body_positioning: e.body_positioning,
        adaptations: e.adaptations,
        contraindications: e.contraindications,
        health_precautions: e.health_precautions,
        suitable_profiles: e.suitable_profiles,
      };
    });

    steps.push({ step: "catalog_built", categories: categories.length, exercises: exercises.length });

    // Call RPC
    const { data: rpcResult, error: rpcErr } = await supabase.rpc("sync_exercises_from_catalog_data", {
      _catalog: { categories, exercises },
    });
    if (rpcErr) throw new Error(`RPC sync: ${rpcErr.message}`);
    steps.push({ step: "rpc_sync", result: rpcResult });

    // Verify
    const { count: finalCount } = await supabase.from("exercises").select("id", { count: "exact", head: true });
    steps.push({ step: "verify", final_count: finalCount, target: 480, success: (finalCount || 0) >= 480 });

    return new Response(JSON.stringify({ success: true, steps }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    console.error("sync-from-test error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
