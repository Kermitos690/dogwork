import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const asNullableString = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
};
const asInteger = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v.trim()) { const p = Number.parseInt(v, 10); return Number.isNaN(p) ? null : p; }
  return null;
};
const asBoolean = (v: unknown): boolean => v === true || v === "true";
const asTextArray = (v: unknown): string[] | null => {
  if (!Array.isArray(v)) return null;
  const n = v.map((i) => (typeof i === "string" ? i.trim() : "")).filter(Boolean);
  return n.length > 0 ? n : null;
};
const asJsonArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const asJsonValue = (v: unknown, fb: unknown = null): unknown => v === undefined || v === null ? fb : v;

async function syncCatalogDirectly(
  supabase: ReturnType<typeof createClient>,
  categories: Record<string, unknown>[],
  exercises: Record<string, unknown>[],
) {
  // Upsert categories
  const categoryRows = categories.map((c, i) => {
    const slug = asNullableString(c.slug);
    const name = asNullableString(c.name);
    if (!slug || !name) return null;
    return { slug, name, icon: asNullableString(c.icon), color: asNullableString(c.color), description: asNullableString(c.description), sort_order: asInteger(c.sort_order) ?? i + 1, is_professional: asBoolean(c.is_professional) };
  }).filter(Boolean);

  if (categoryRows.length === 0) throw new Error("Aucune catégorie exploitable.");
  const { error: catErr } = await supabase.from("exercise_categories").upsert(categoryRows, { onConflict: "slug" });
  if (catErr) throw new Error(`Catégories: ${catErr.message}`);

  const { data: catData } = await supabase.from("exercise_categories").select("id, slug").in("slug", categoryRows.map((c) => c.slug));
  const catMap = new Map((catData ?? []).map((c: { slug: string; id: string }) => [c.slug, c.id]));

  // Map exercises
  const exerciseRows = exercises.map((e, i) => {
    const slug = asNullableString(e.slug);
    const catSlug = asNullableString(e.category_slug);
    const name = asNullableString(e.name);
    if (!slug || !catSlug || !name) return null;
    const categoryId = catMap.get(catSlug);
    if (!categoryId) return null;
    return {
      slug, name, category_id: categoryId,
      short_title: asNullableString(e.short_title), description: asNullableString(e.description),
      objective: asNullableString(e.objective), dedication: asNullableString(e.dedication),
      summary: asNullableString(e.summary), short_instruction: asNullableString(e.short_instruction),
      level: asNullableString(e.level) ?? "débutant",
      exercise_type: asNullableString(e.exercise_type) ?? asNullableString(e.exerciseType) ?? "fondation",
      difficulty: asInteger(e.difficulty), duration: asNullableString(e.duration),
      repetitions: asNullableString(e.repetitions), frequency: asNullableString(e.frequency),
      environment: asNullableString(e.environment), intensity_level: asInteger(e.intensity_level),
      cognitive_load: asInteger(e.cognitive_load), physical_load: asInteger(e.physical_load),
      steps: asJsonArray(e.steps), tutorial_steps: asJsonArray(e.tutorial_steps), mistakes: asJsonArray(e.mistakes),
      success_criteria: asNullableString(e.success_criteria), stop_criteria: asNullableString(e.stop_criteria),
      vigilance: asNullableString(e.vigilance), precautions: asJsonValue(e.precautions, []),
      contraindications: asJsonValue(e.contraindications, []), health_precautions: asJsonValue(e.health_precautions, []),
      adaptations: asJsonValue(e.adaptations, []), progression_next: asNullableString(e.progression_next),
      regression_simplified: asNullableString(e.regression_simplified), age_recommendation: asNullableString(e.age_recommendation),
      suitable_profiles: asJsonValue(e.suitable_profiles, []),
      compatible_reactivity: asBoolean(e.compatible_reactivity), compatible_senior: asBoolean(e.compatible_senior),
      compatible_puppy: asBoolean(e.compatible_puppy), compatible_muzzle: asBoolean(e.compatible_muzzle),
      is_professional: asBoolean(e.is_professional), target_breeds: asTextArray(e.target_breeds),
      equipment: asTextArray(e.equipment), tags: asTextArray(e.tags),
      priority_axis: asTextArray(e.priority_axis), target_problems: asTextArray(e.target_problems),
      secondary_benefits: asTextArray(e.secondary_benefits), prerequisites: asTextArray(e.prerequisites),
      cover_image: asNullableString(e.cover_image), sort_order: asInteger(e.sort_order) ?? i + 1,
      body_positioning: asJsonArray(e.body_positioning), troubleshooting: asJsonArray(e.troubleshooting),
      validation_protocol: asNullableString(e.validation_protocol), voice_commands: asJsonArray(e.voice_commands),
      min_tier: asNullableString(e.min_tier) ?? "starter",
    };
  }).filter(Boolean);

  let inserted = 0, failed = 0;
  const chunkSize = 50;
  for (let i = 0; i < exerciseRows.length; i += chunkSize) {
    const chunk = exerciseRows.slice(i, i + chunkSize);
    const { error } = await supabase.from("exercises").upsert(chunk, { onConflict: "slug" });
    if (!error) { inserted += chunk.length; continue; }
    for (const ex of chunk) {
      const { error: rowErr } = await supabase.from("exercises").upsert(ex, { onConflict: "slug" });
      if (rowErr) { failed++; console.error("row fail", ex.slug, rowErr.message); } else { inserted++; }
    }
  }
  return { categories_synced: categoryRows.length, exercises_synced: inserted, exercises_failed: failed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Auth: admin JWT required
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") || "";
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const report: Record<string, unknown> = { started_at: new Date().toISOString(), steps: [] };
    const steps = report.steps as Record<string, unknown>[];

    // ─── STEP 1: Fix cover image URLs ───
    const instanceHost = new URL(SUPABASE_URL).host;
    const correctPrefix = `${SUPABASE_URL}/storage/v1/object/public/exercise-images/`;
    const { data: badUrls } = await supabase.from("exercises").select("id, slug, cover_image").not("cover_image", "is", null).neq("cover_image", "");
    let urlsFixed = 0;
    if (badUrls) {
      for (const ex of badUrls) {
        if (ex.cover_image && !ex.cover_image.includes(instanceHost)) {
          const match = ex.cover_image.match(/covers\/(.+)$/);
          if (match) {
            const { error: upErr } = await supabase.from("exercises").update({ cover_image: `${correctPrefix}covers/${match[1]}` }).eq("id", ex.id);
            if (!upErr) urlsFixed++;
          }
        }
      }
    }
    steps.push({ step: "fix_cover_urls", urls_fixed: urlsFixed });

    // ─── STEP 2: Upsert ai_pricing_config ───
    const pricingConfig = [
      { key: "chf_per_credit", value: 0.05, label: "Prix CHF par crédit", description: "Valeur de revenu par crédit consommé" },
      { key: "credit_value_chf", value: 0.05, label: "Valeur CHF crédit", description: "Valeur unitaire d'un crédit" },
      { key: "usd_to_chf", value: 0.88, label: "Taux USD→CHF", description: "Taux de conversion pour calcul marge" },
      { key: "usd_eur_rate", value: 0.92, label: "Taux USD→EUR", description: "Taux de conversion secondaire" },
      { key: "safety_buffer", value: 1.2, label: "Buffer sécurité", description: "Multiplicateur sécurité coût estimé" },
      { key: "margin_standard", value: 3.5, label: "Marge standard", description: "Multiplicateur marge standard" },
      { key: "margin_prudent", value: 2.5, label: "Marge prudente", description: "Multiplicateur marge prudente" },
      { key: "margin_aggressive", value: 5.0, label: "Marge agressive", description: "Multiplicateur marge agressive" },
      { key: "min_credits_per_action", value: 1, label: "Min crédits/action", description: "Minimum de crédits par action IA" },
      { key: "welcome_bonus_credits", value: 10, label: "Bonus bienvenue", description: "Crédits offerts à la création du wallet" },
    ];
    const { error: configErr } = await supabase.from("ai_pricing_config").upsert(pricingConfig, { onConflict: "key" });
    steps.push({ step: "upsert_pricing_config", count: pricingConfig.length, error: configErr?.message || null });

    // ─── STEP 3: Update ai_credit_packs ───
    const packUpdates = [
      { slug: "decouverte", cost_estimate_usd: 0.40, margin_estimate: 0.92 },
      { slug: "standard", cost_estimate_usd: 0.75, margin_estimate: 0.90 },
      { slug: "premium", cost_estimate_usd: 2.50, margin_estimate: 0.89 },
    ];
    let packsUpdated = 0;
    for (const p of packUpdates) {
      const { error: pErr } = await supabase.from("ai_credit_packs").update({ cost_estimate_usd: p.cost_estimate_usd, margin_estimate: p.margin_estimate }).eq("slug", p.slug);
      if (!pErr) packsUpdated++;
    }
    steps.push({ step: "update_pack_costs", packs_updated: packsUpdated });

    // ─── STEP 4: Upsert ai_plan_quotas ───
    const quotas = [
      { plan_slug: "starter", monthly_credits: 5, discount_percent: 0 },
      { plan_slug: "pro", monthly_credits: 30, discount_percent: 10 },
      { plan_slug: "expert", monthly_credits: 100, discount_percent: 20 },
      { plan_slug: "shelter", monthly_credits: 150, discount_percent: 20 },
      { plan_slug: "educator", monthly_credits: 200, discount_percent: 25 },
    ];
    const { error: quotaErr } = await supabase.from("ai_plan_quotas").upsert(quotas, { onConflict: "plan_slug" });
    steps.push({ step: "upsert_plan_quotas", count: quotas.length, error: quotaErr?.message || null });

    // ─── STEP 5: Auto-seed exercises if empty ───
    const { count } = await supabase.from("exercises").select("id", { count: "exact", head: true });
    const totalExercises = count || 0;

    if (totalExercises === 0) {
      const catalogUrl = `${SUPABASE_URL}/storage/v1/object/public/exercise-images/data/exercise-catalog.json`;
      const catalogRes = await fetch(catalogUrl);
      if (catalogRes.ok) {
        const catalog = await catalogRes.json();
        if (Array.isArray(catalog?.categories) && Array.isArray(catalog?.exercises)) {
          const result = await syncCatalogDirectly(supabase, catalog.categories, catalog.exercises);
          steps.push({ step: "auto_seed_exercises", ...result });
        } else {
          steps.push({ step: "auto_seed_exercises", error: "Invalid catalog format" });
        }
      } else {
        steps.push({ step: "auto_seed_exercises", error: `Catalog fetch failed: ${catalogRes.status}` });
      }
    } else {
      steps.push({ step: "auto_seed_exercises", skipped: true, reason: `${totalExercises} exercises already present` });
    }

    // ─── STEP 6: Verification ───
    const { count: finalCount } = await supabase.from("exercises").select("id", { count: "exact", head: true });
    const { count: catCount } = await supabase.from("exercise_categories").select("id", { count: "exact", head: true });
    report.verification = { total_exercises: finalCount, total_categories: catCount };
    report.completed_at = new Date().toISOString();

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    console.error("post-publish-sync error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
