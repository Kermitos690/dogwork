import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type CatalogCategory = Record<string, unknown>;
type CatalogExercise = Record<string, unknown>;

type SyncSummary = {
  categories_synced: number;
  exercises_updated: number;
  exercises_inserted: number;
  exercises_failed: number;
  failed_slugs: string[];
};

const respond = (payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const asNullableString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const asInteger = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const asBoolean = (value: unknown): boolean => value === true || value === "true";

const asTextArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null;
  const normalized = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  return normalized.length > 0 ? normalized : null;
};

const asJsonArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const asJsonValue = (value: unknown, fallback: unknown = null): unknown =>
  value === undefined || value === null ? fallback : value;

async function syncCatalogDirectly(
  supabase: ReturnType<typeof createClient>,
  categories: CatalogCategory[],
  exercises: CatalogExercise[],
): Promise<SyncSummary> {
  const categoryRows = categories
    .map((category, index) => {
      const slug = asNullableString(category.slug);
      const name = asNullableString(category.name);

      if (!slug || !name) return null;

      return {
        slug,
        name,
        icon: asNullableString(category.icon),
        color: asNullableString(category.color),
        description: asNullableString(category.description),
        sort_order: asInteger(category.sort_order) ?? index + 1,
        is_professional: asBoolean(category.is_professional),
      };
    })
    .filter(Boolean);

  if (categoryRows.length === 0) {
    throw new Error("Le catalogue ne contient aucune catégorie exploitable.");
  }

  const { error: categoryUpsertError } = await supabase
    .from("exercise_categories")
    .upsert(categoryRows, { onConflict: "slug" });

  if (categoryUpsertError) {
    throw new Error(`Impossible de synchroniser les catégories: ${categoryUpsertError.message}`);
  }

  const categorySlugs = categoryRows.map((category) => category.slug);
  const { data: categoryData, error: categoryReadError } = await supabase
    .from("exercise_categories")
    .select("id, slug")
    .in("slug", categorySlugs);

  if (categoryReadError) {
    throw new Error(`Impossible de relire les catégories: ${categoryReadError.message}`);
  }

  const categoryMap = new Map((categoryData ?? []).map((category) => [category.slug, category.id]));
  const failedSlugs = new Set<string>();

  const exerciseRows = exercises
    .map((exercise, index) => {
      const slug = asNullableString(exercise.slug);
      const categorySlug = asNullableString(exercise.category_slug);
      const name = asNullableString(exercise.name);

      if (!slug || !categorySlug || !name) {
        if (slug) failedSlugs.add(slug);
        return null;
      }

      const categoryId = categoryMap.get(categorySlug);
      if (!categoryId) {
        failedSlugs.add(slug);
        return null;
      }

      return {
        slug,
        name,
        category_id: categoryId,
        short_title: asNullableString(exercise.short_title),
        description: asNullableString(exercise.description),
        objective: asNullableString(exercise.objective),
        dedication: asNullableString(exercise.dedication),
        summary: asNullableString(exercise.summary),
        short_instruction: asNullableString(exercise.short_instruction),
        level: asNullableString(exercise.level) ?? "débutant",
        exercise_type:
          asNullableString(exercise.exercise_type) ??
          asNullableString(exercise.exerciseType) ??
          "fondation",
        difficulty: asInteger(exercise.difficulty),
        duration: asNullableString(exercise.duration),
        repetitions: asNullableString(exercise.repetitions),
        frequency: asNullableString(exercise.frequency),
        environment: asNullableString(exercise.environment),
        intensity_level: asInteger(exercise.intensity_level),
        cognitive_load: asInteger(exercise.cognitive_load),
        physical_load: asInteger(exercise.physical_load),
        steps: asJsonArray(exercise.steps),
        tutorial_steps: asJsonArray(exercise.tutorial_steps),
        mistakes: asJsonArray(exercise.mistakes),
        success_criteria: asNullableString(exercise.success_criteria),
        stop_criteria: asNullableString(exercise.stop_criteria),
        vigilance: asNullableString(exercise.vigilance),
        precautions: asJsonValue(exercise.precautions, []),
        contraindications: asJsonValue(exercise.contraindications, []),
        health_precautions: asJsonValue(exercise.health_precautions, []),
        adaptations: asJsonValue(exercise.adaptations, []),
        progression_next: asNullableString(exercise.progression_next),
        regression_simplified: asNullableString(exercise.regression_simplified),
        age_recommendation: asNullableString(exercise.age_recommendation),
        suitable_profiles: asJsonValue(exercise.suitable_profiles, []),
        compatible_reactivity: asBoolean(exercise.compatible_reactivity),
        compatible_senior: asBoolean(exercise.compatible_senior),
        compatible_puppy: asBoolean(exercise.compatible_puppy),
        compatible_muzzle: asBoolean(exercise.compatible_muzzle),
        is_professional: asBoolean(exercise.is_professional),
        target_breeds: asTextArray(exercise.target_breeds),
        equipment: asTextArray(exercise.equipment),
        tags: asTextArray(exercise.tags),
        priority_axis: asTextArray(exercise.priority_axis),
        target_problems: asTextArray(exercise.target_problems),
        secondary_benefits: asTextArray(exercise.secondary_benefits),
        prerequisites: asTextArray(exercise.prerequisites),
        cover_image: asNullableString(exercise.cover_image),
        sort_order: asInteger(exercise.sort_order) ?? index + 1,
        body_positioning: asJsonArray(exercise.body_positioning),
        troubleshooting: asJsonArray(exercise.troubleshooting),
        validation_protocol: asNullableString(exercise.validation_protocol),
        voice_commands: asJsonArray(exercise.voice_commands),
        min_tier: asNullableString(exercise.min_tier) ?? "starter",
      };
    })
    .filter(Boolean);

  const exerciseSlugs = exerciseRows.map((exercise) => exercise.slug);
  const existingSlugs = new Set<string>();

  if (exerciseSlugs.length > 0) {
    const { data: existingRows, error: existingReadError } = await supabase
      .from("exercises")
      .select("slug")
      .in("slug", exerciseSlugs);

    if (existingReadError) {
      throw new Error(`Impossible de vérifier les exercices existants: ${existingReadError.message}`);
    }

    for (const row of existingRows ?? []) {
      existingSlugs.add(row.slug);
    }
  }

  let exercisesInserted = 0;
  let exercisesUpdated = 0;
  const chunkSize = 50;

  const countSuccess = (slug: string) => {
    if (existingSlugs.has(slug)) {
      exercisesUpdated += 1;
    } else {
      exercisesInserted += 1;
    }
  };

  for (let index = 0; index < exerciseRows.length; index += chunkSize) {
    const chunk = exerciseRows.slice(index, index + chunkSize);
    const { error: chunkError } = await supabase.from("exercises").upsert(chunk, { onConflict: "slug" });

    if (!chunkError) {
      chunk.forEach((exercise) => countSuccess(exercise.slug));
      continue;
    }

    for (const exercise of chunk) {
      const { error: rowError } = await supabase.from("exercises").upsert(exercise, { onConflict: "slug" });
      if (rowError) {
        failedSlugs.add(exercise.slug);
        console.error("sync-enriched-exercises row failure", exercise.slug, rowError.message);
        continue;
      }

      countSuccess(exercise.slug);
    }
  }

  return {
    categories_synced: categoryRows.length,
    exercises_updated: exercisesUpdated,
    exercises_inserted: exercisesInserted,
    exercises_failed: failedSlugs.size,
    failed_slugs: Array.from(failedSlugs).slice(0, 20),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startedAt = Date.now();

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return respond({
        ok: false,
        error: "Configuration serveur incomplète.",
        diagnostics: { stage: "env_missing" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Allow service-role calls (from post-publish-sync or internal triggers)
    const authHeader = req.headers.get("Authorization");
    const serviceKey = req.headers.get("x-service-key");
    const isServiceCall = serviceKey === SERVICE_ROLE_KEY;

    if (!isServiceCall) {
      if (!authHeader?.startsWith("Bearer ")) {
        return respond({
          ok: false,
          error: "Session expirée ou accès non autorisé.",
          diagnostics: { stage: "auth_missing" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser(token);

      if (userError || !user) {
        return respond({
          ok: false,
          error: "Session expirée ou accès non autorisé.",
          diagnostics: { stage: "auth_invalid", details: userError?.message ?? null },
        });
      }

      const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });

      if (roleError) {
        return respond({
          ok: false,
          error: "Impossible de vérifier les droits administrateur.",
          diagnostics: { stage: "role_check", details: roleError.message },
        });
      }

      if (!isAdmin) {
        return respond({
          ok: false,
          error: "Accès réservé à l'administration.",
          diagnostics: { stage: "forbidden" },
        });
      }
    }

    const catalogUrl = `${SUPABASE_URL}/storage/v1/object/public/exercise-images/data/exercise-catalog.json`;
    const catalogRes = await fetch(catalogUrl);

    if (!catalogRes.ok) {
      return respond({
        ok: false,
        error: `Catalogue introuvable (${catalogRes.status}).`,
        diagnostics: { stage: "catalog_fetch", requested_url: catalogUrl },
      });
    }

    const catalog = await catalogRes.json();
    if (!Array.isArray(catalog?.categories) || !Array.isArray(catalog?.exercises)) {
      return respond({
        ok: false,
        error: "Le catalogue est invalide.",
        diagnostics: { stage: "catalog_parse", requested_url: catalogUrl },
      });
    }

    const syncResult = await syncCatalogDirectly(supabase, catalog.categories, catalog.exercises);
    const { data: verification, error: verificationError } = await supabase.rpc("sync_exercise_stats");

    return respond({
      ok: syncResult.exercises_failed === 0,
      ...syncResult,
      verification: verification ?? null,
      message:
        syncResult.exercises_failed === 0
          ? `Synchronisation terminée : ${syncResult.exercises_inserted + syncResult.exercises_updated} exercices traités.`
          : `Synchronisation partielle : ${syncResult.exercises_failed} exercice(s) en échec.`,
      error:
        syncResult.exercises_failed > 0
          ? `${syncResult.exercises_failed} exercice(s) n'ont pas pu être synchronisés.`
          : undefined,
      diagnostics: {
        stage: "completed",
        requested_url: catalogUrl,
        processing_time_ms: Date.now() - startedAt,
        verification_error: verificationError?.message ?? null,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erreur interne";
    console.error("sync-enriched-exercises error:", message);
    return respond({
      ok: false,
      error: message,
      diagnostics: { stage: "exception", processing_time_ms: Date.now() - startedAt },
    });
  }
});
