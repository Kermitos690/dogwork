import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bundledCatalog from "../_shared/exercise-catalog.json" with { type: "json" };

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

const isValidCatalog = (catalog: unknown): catalog is { categories: unknown[]; exercises: unknown[] } => {
  return Array.isArray((catalog as { categories?: unknown[] } | null)?.categories)
    && Array.isArray((catalog as { exercises?: unknown[] } | null)?.exercises);
};

async function syncCatalogViaRPC(
  supabase: any,
  catalog: { categories: unknown[]; exercises: unknown[] },
) {
  // Use the SQL function sync_exercises_from_catalog_data which runs entirely
  // inside the database in a single transaction — much faster than REST batches.
  const { data, error } = await supabase.rpc("sync_exercises_from_catalog_data", {
    _catalog: catalog,
  });
  if (error) throw new Error(`RPC sync_exercises_from_catalog_data: ${error.message}`);
  return data as Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Auth: admin JWT, service-role key, or system call (post-publish hook)
    // post-publish-sync is designed to be called automatically after publish
    // All operations use service_role internally - no user data is modified
    const authHeader = req.headers.get("Authorization");
    const serviceKey = req.headers.get("x-service-key");
    const isServiceCall = serviceKey === SERVICE_ROLE_KEY;
    const isSystemCall = !authHeader && !serviceKey; // Lovable post-publish hook

    if (!isServiceCall && !isSystemCall) {
      const token = authHeader?.replace("Bearer ", "") || "";
      if (token) {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
          if (!isAdmin) {
            return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
              status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }
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

    // ─── STEP 3: Upsert ai_credit_packs (full seed with Stripe IDs) ───
    const creditPacks = [
      { slug: "decouverte", label: "Découverte", credits: 80, price_chf: 4.90, sort_order: 1, is_active: true, cost_estimate_usd: 0.40, margin_estimate: 0.92, stripe_price_id: "price_1TL0fHPshPrEibTg37iPRFlP", stripe_product_id: "prod_UJdxPALVKKHt1T", description: "Idéal pour découvrir les fonctionnalités IA" },
      { slug: "standard", label: "Standard", credits: 150, price_chf: 6.90, sort_order: 2, is_active: true, cost_estimate_usd: 0.75, margin_estimate: 0.90, stripe_price_id: "price_1TL0fZPshPrEibTgkFKNzfEh", stripe_product_id: "prod_UJdxJ73vK0TFq7", description: "Pour un usage régulier" },
      { slug: "premium", label: "Premium", credits: 500, price_chf: 19.90, sort_order: 3, is_active: true, cost_estimate_usd: 2.50, margin_estimate: 0.89, stripe_price_id: "price_1TL0fuPshPrEibTgpWNjNblG", stripe_product_id: "prod_UJdxeicxqyPqQm", description: "Meilleur rapport qualité-prix" },
    ];
    const { error: packErr } = await supabase.from("ai_credit_packs").upsert(creditPacks, { onConflict: "slug" });
    steps.push({ step: "upsert_credit_packs", count: creditPacks.length, error: packErr?.message || null });

    // ─── STEP 3b: Upsert ai_feature_catalog (updated costs) ───
    const featureCatalog = [
      { code: "chat", label: "Chat IA", credits_cost: 1, model: "google/gemini-2.5-flash", is_active: true, cost_estimate_avg_usd: 0.002, cost_estimate_min_usd: 0.001, cost_estimate_max_usd: 0.005, margin_target: 3.0, description: "Conversation avec l'assistant IA" },
      { code: "chat_general", label: "Chat IA général", credits_cost: 1, model: "google/gemini-2.5-flash", is_active: true, cost_estimate_avg_usd: 0.002, cost_estimate_min_usd: 0.001, cost_estimate_max_usd: 0.005, margin_target: 3.0, description: "Chat IA généraliste" },
      { code: "plan_generator", label: "Générateur de plan", credits_cost: 3, model: "google/gemini-2.5-pro", is_active: true, cost_estimate_avg_usd: 0.01, cost_estimate_min_usd: 0.005, cost_estimate_max_usd: 0.02, margin_target: 3.0, description: "Génération de plans d'entraînement personnalisés" },
      { code: "education_plan", label: "Plan éducatif IA", credits_cost: 5, model: "google/gemini-2.5-pro", is_active: true, cost_estimate_avg_usd: 0.02, cost_estimate_min_usd: 0.01, cost_estimate_max_usd: 0.04, margin_target: 3.0, description: "Plan éducatif complet généré par IA" },
      { code: "behavior_analysis", label: "Analyse comportementale", credits_cost: 3, model: "google/gemini-2.5-pro", is_active: true, cost_estimate_avg_usd: 0.015, cost_estimate_min_usd: 0.008, cost_estimate_max_usd: 0.03, margin_target: 3.0, description: "Analyse comportementale détaillée" },
      { code: "behavior_summary", label: "Résumé comportemental", credits_cost: 2, model: "google/gemini-2.5-flash", is_active: true, cost_estimate_avg_usd: 0.005, cost_estimate_min_usd: 0.002, cost_estimate_max_usd: 0.01, margin_target: 3.0, description: "Résumé comportemental synthétique" },
      { code: "dog_profile_analysis", label: "Analyse de profil chien", credits_cost: 3, model: "google/gemini-2.5-pro", is_active: true, cost_estimate_avg_usd: 0.01, cost_estimate_min_usd: 0.005, cost_estimate_max_usd: 0.02, margin_target: 3.0, description: "Analyse détaillée du profil d'un chien" },
      { code: "connection_guide", label: "Guide de connexion", credits_cost: 2, model: "google/gemini-2.5-flash", is_active: true, cost_estimate_avg_usd: 0.003, cost_estimate_min_usd: 0.001, cost_estimate_max_usd: 0.006, margin_target: 3.0, description: "Guide personnalisé de connexion chien-humain" },
      { code: "content_rewrite", label: "Reformulation", credits_cost: 1, model: "google/gemini-2.5-flash-lite", is_active: false, cost_estimate_avg_usd: 0.001, cost_estimate_min_usd: 0.0005, cost_estimate_max_usd: 0.002, margin_target: 3.0, description: "Reformulation et amélioration de texte" },
      { code: "exercise_enrich", label: "Enrichissement exercice", credits_cost: 2, model: "google/gemini-2.5-flash", is_active: true, cost_estimate_avg_usd: 0.003, cost_estimate_min_usd: 0.001, cost_estimate_max_usd: 0.006, margin_target: 3.0, description: "Enrichissement de fiche exercice" },
      { code: "marketing_content", label: "Contenu marketing", credits_cost: 2, model: "google/gemini-2.5-flash", is_active: false, cost_estimate_avg_usd: 0.003, cost_estimate_min_usd: 0.001, cost_estimate_max_usd: 0.006, margin_target: 3.0, description: "Génération de contenu marketing" },
      { code: "adoption_plan", label: "Plan de suivi post-adoption IA", credits_cost: 5, model: "google/gemini-2.5-pro", is_active: true, cost_estimate_avg_usd: 0.015, cost_estimate_min_usd: 0.008, cost_estimate_max_usd: 0.03, margin_target: 3.0, description: "Plan de suivi post-adoption généré par IA" },
      { code: "record_enrichment", label: "Enrichissement de fiche", credits_cost: 2, model: "google/gemini-2.5-flash", is_active: true, cost_estimate_avg_usd: 0.005, cost_estimate_min_usd: 0.002, cost_estimate_max_usd: 0.01, margin_target: 3.0, description: "Enrichissement intelligent de fiches" },
    ];
    const { error: featErr } = await supabase.from("ai_feature_catalog").upsert(featureCatalog, { onConflict: "code" });
    steps.push({ step: "upsert_feature_catalog", count: featureCatalog.length, error: featErr?.message || null });

    // ─── STEP 4: Upsert ai_plan_quotas (tightened) ───
    const quotas = [
      { plan_slug: "starter", monthly_credits: 1, discount_percent: 0 },
      { plan_slug: "pro", monthly_credits: 5, discount_percent: 10 },
      { plan_slug: "expert", monthly_credits: 15, discount_percent: 20 },
      { plan_slug: "shelter", monthly_credits: 20, discount_percent: 20 },
      { plan_slug: "educator", monthly_credits: 30, discount_percent: 25 },
    ];
    const { error: quotaErr } = await supabase.from("ai_plan_quotas").upsert(quotas, { onConflict: "plan_slug" });
    steps.push({ step: "upsert_plan_quotas", count: quotas.length, error: quotaErr?.message || null });

    // ─── STEP 5: Sync exercises if incomplete (< 480) ───
    const TARGET_EXERCISES = 480;
    const { count } = await supabase.from("exercises").select("id", { count: "exact", head: true });
    const totalExercises = count || 0;

    if (totalExercises < TARGET_EXERCISES) {
      console.log(`[post-publish-sync] Exercises incomplete: ${totalExercises}/${TARGET_EXERCISES}. Syncing...`);
      const localCatalogUrl = `${SUPABASE_URL}/storage/v1/object/public/exercise-images/data/exercise-catalog.json`;
      const testCatalogUrl = `https://dcwbqsfeouvghcnvhrpj.supabase.co/storage/v1/object/public/exercise-images/data/exercise-catalog.json`;

      let catalog: { categories: unknown[]; exercises: unknown[] } | null = isValidCatalog(bundledCatalog) ? bundledCatalog : null;
      let catalogSource = "bundled";

      if (!catalog) {
        let catalogRes = await fetch(localCatalogUrl);
        catalogSource = "local";
        if (!catalogRes.ok) {
          console.log(`[post-publish-sync] Local catalog unavailable (${catalogRes.status}), trying test instance...`);
          catalogRes = await fetch(testCatalogUrl);
          catalogSource = "test-fallback";
        }

        if (catalogRes.ok) {
          const remoteCatalog = await catalogRes.json();
          if (isValidCatalog(remoteCatalog)) {
            catalog = remoteCatalog;
          }
        }
      }

      if (catalog) {
        console.log(`[post-publish-sync] Catalog loaded from ${catalogSource}: ${catalog.categories.length} cats, ${catalog.exercises.length} exercises. Calling RPC...`);
        const result = await syncCatalogViaRPC(supabase, catalog);
        steps.push({ step: "sync_exercises", source: catalogSource, previous_count: totalExercises, catalog_exercises: catalog.exercises.length, ...result });
      } else {
        steps.push({ step: "sync_exercises", error: "Catalog unavailable or invalid from bundled, local, and test sources" });
      }
    } else {
      steps.push({ step: "sync_exercises", skipped: true, reason: `${totalExercises} exercises already present (>= ${TARGET_EXERCISES})` });
    }

    // ─── STEP 6: Upsert subscription_plans ───
    const subscriptionPlans = [
      { code: "starter", name: "Freemium", max_dogs: 1, base_exercise_limit: 15, monthly_ai_credits: 1, includes_28_day_plans: false, includes_base_exercises: true, is_active: true },
      { code: "pro", name: "Pro", max_dogs: 3, base_exercise_limit: 150, monthly_ai_credits: 5, includes_28_day_plans: true, includes_base_exercises: true, is_active: true },
      { code: "expert", name: "Expert", max_dogs: 999999, base_exercise_limit: 999999, monthly_ai_credits: 15, includes_28_day_plans: true, includes_base_exercises: true, is_active: true },
      { code: "educator", name: "Éducateur", max_dogs: 999999, base_exercise_limit: 999999, monthly_ai_credits: 30, includes_28_day_plans: true, includes_base_exercises: true, is_active: true },
      { code: "shelter", name: "Refuge", max_dogs: 999999, base_exercise_limit: 999999, monthly_ai_credits: 20, includes_28_day_plans: true, includes_base_exercises: true, is_active: true },
    ];
    const { error: planErr } = await supabase.from("subscription_plans").upsert(subscriptionPlans, { onConflict: "code" });
    steps.push({ step: "upsert_subscription_plans", count: subscriptionPlans.length, error: planErr?.message || null });

    // ─── STEP 7: Upsert subscription_plan_prices ───
    const subscriptionPrices = [
      { plan_code: "starter", billing_period: "monthly", price_chf: 0, stripe_price_id: null, stripe_product_id: null, is_public: true },
      { plan_code: "pro", billing_period: "monthly", price_chf: 9.90, stripe_price_id: "price_1TKpFyPshPrEibTgOW98FPOq", stripe_product_id: "prod_U83i1wbeLdd3EI", is_public: true },
      { plan_code: "expert", billing_period: "monthly", price_chf: 19.90, stripe_price_id: "price_1TKpNpPshPrEibTgDiRVEAmV", stripe_product_id: "prod_U83inCbv8JMMgf", is_public: true },
      { plan_code: "educator", billing_period: "yearly", price_chf: 200, stripe_price_id: "price_1T9wXlPshPrEibTgEM0BNrSm", stripe_product_id: "prod_U8CxlV7PMpHAgA", is_public: true },
      { plan_code: "shelter", billing_period: "custom", price_chf: 0, stripe_price_id: "price_1TEtxAPshPrEibTgsDFHr8Nw", stripe_product_id: "prod_UDKcjmnJnM7pBo", is_public: false },
    ];
    const { error: priceErr } = await supabase.from("subscription_plan_prices").upsert(subscriptionPrices, { onConflict: "plan_code,billing_period" });
    steps.push({ step: "upsert_subscription_plan_prices", count: subscriptionPrices.length, error: priceErr?.message || null });

    // ─── STEP 8: Strict Verification ───
    const { count: finalCount } = await supabase.from("exercises").select("id", { count: "exact", head: true });
    const { count: catCount } = await supabase.from("exercise_categories").select("id", { count: "exact", head: true });
    const { count: planCount } = await supabase.from("subscription_plans").select("code", { count: "exact", head: true });
    const { count: priceCount } = await supabase.from("subscription_plan_prices").select("plan_code", { count: "exact", head: true });
    
    const exercisesOk = (finalCount || 0) >= TARGET_EXERCISES;
    const plansOk = (planCount || 0) >= 5;
    const pricesOk = (priceCount || 0) >= 5;
    
    report.verification = { 
      total_exercises: finalCount, 
      total_categories: catCount,
      subscription_plans: planCount,
      subscription_plan_prices: priceCount,
      exercises_target_met: exercisesOk,
      plans_ok: plansOk,
      prices_ok: pricesOk,
      production_ready: exercisesOk && plansOk && pricesOk,
    };
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
