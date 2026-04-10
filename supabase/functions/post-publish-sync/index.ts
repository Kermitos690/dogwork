import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Auth: admin JWT or service_role key required
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    
    // Allow service_role key (used by internal tools / curl_edge_functions)
    const isServiceRole = token === SERVICE_ROLE_KEY;
    
    if (!isServiceRole) {
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
    }

    const report: Record<string, any> = { started_at: new Date().toISOString(), steps: [] };

    // ─── STEP 1: Fix cover image URLs ───
    // Cover images exist in the current instance's storage but URLs may point to an old instance
    const instanceHost = new URL(SUPABASE_URL).host; // e.g. dcwbqsfeouvghcnvhrpj.supabase.co
    const correctPrefix = `${SUPABASE_URL}/storage/v1/object/public/exercise-images/`;

    // Find exercises with cover_image pointing to wrong instance
    const { data: badUrls, error: badUrlErr } = await supabase
      .from("exercises")
      .select("id, slug, cover_image")
      .not("cover_image", "is", null)
      .neq("cover_image", "");

    let urlsFixed = 0;
    if (badUrls && !badUrlErr) {
      for (const ex of badUrls) {
        if (ex.cover_image && !ex.cover_image.includes(instanceHost)) {
          // Extract filename from URL (last part after /covers/)
          const match = ex.cover_image.match(/covers\/(.+)$/);
          if (match) {
            const newUrl = `${correctPrefix}covers/${match[1]}`;
            const { error: upErr } = await supabase
              .from("exercises")
              .update({ cover_image: newUrl })
              .eq("id", ex.id);
            if (!upErr) urlsFixed++;
          }
        }
      }
    }
    report.steps.push({ step: "fix_cover_urls", urls_checked: badUrls?.length || 0, urls_fixed: urlsFixed });

    // ─── STEP 2: Upsert ai_pricing_config (validated values) ───
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
    report.steps.push({ step: "upsert_pricing_config", count: pricingConfig.length, error: configErr?.message || null });

    // ─── STEP 3: Update ai_credit_packs cost estimates ───
    // Based on ai_feature_catalog avg costs: weighted avg ~$0.005/credit
    const packUpdates = [
      { slug: "decouverte", cost_estimate_usd: 0.40, margin_estimate: 0.92 },   // 80 credits × $0.005 = $0.40, margin = (4.90 - 0.40×0.88)/4.90 = 92%
      { slug: "standard", cost_estimate_usd: 0.75, margin_estimate: 0.90 },     // 150 × $0.005 = $0.75, margin = (6.90 - 0.66)/6.90 = 90%
      { slug: "premium", cost_estimate_usd: 2.50, margin_estimate: 0.89 },      // 500 × $0.005 = $2.50, margin = (19.90 - 2.20)/19.90 = 89%
    ];

    let packsUpdated = 0;
    for (const p of packUpdates) {
      const { error: pErr } = await supabase
        .from("ai_credit_packs")
        .update({ cost_estimate_usd: p.cost_estimate_usd, margin_estimate: p.margin_estimate })
        .eq("slug", p.slug);
      if (!pErr) packsUpdated++;
    }
    report.steps.push({ step: "update_pack_costs", packs_updated: packsUpdated });

    // ─── STEP 4: Upsert ai_plan_quotas (validated values) ───
    const quotas = [
      { plan_slug: "starter", monthly_credits: 5, discount_percent: 0 },
      { plan_slug: "pro", monthly_credits: 30, discount_percent: 10 },
      { plan_slug: "expert", monthly_credits: 100, discount_percent: 20 },
      { plan_slug: "shelter", monthly_credits: 150, discount_percent: 20 },
      { plan_slug: "educator", monthly_credits: 200, discount_percent: 25 },
    ];
    const { error: quotaErr } = await supabase.from("ai_plan_quotas").upsert(quotas, { onConflict: "plan_slug" });
    report.steps.push({ step: "upsert_plan_quotas", count: quotas.length, error: quotaErr?.message || null });

    // ─── STEP 5: Sync exercises from catalog (if exists) ───
    // Try multiple known paths for the catalog
    const catalogPaths = [
      "catalog/enriched-catalog.json",
      "data/exercise-catalog.json",
    ];
    let exerciseSync: any = { catalog_exists: false };
    try {
      let catalog: any = null;
      for (const path of catalogPaths) {
        const url = `${SUPABASE_URL}/storage/v1/object/public/exercise-images/${path}`;
        const res = await fetch(url);
        if (res.ok) {
          catalog = await res.json();
          exerciseSync.catalog_path = path;
          break;
        }
      }

      if (catalog) {
        exerciseSync.catalog_exists = true;
        exerciseSync.categories_count = catalog.categories?.length || 0;
        exerciseSync.exercises_count = catalog.exercises?.length || 0;

        // Process in batches of 30 to avoid timeouts
        const BATCH_SIZE = 30;
        const exercises = catalog.exercises || [];
        let totalUpdated = 0;
        let totalFailed = 0;
        const batchResults: any[] = [];

        // First batch includes categories
        for (let i = 0; i < exercises.length; i += BATCH_SIZE) {
          const batch = exercises.slice(i, i + BATCH_SIZE);
          const batchCatalog = {
            categories: i === 0 ? (catalog.categories || []) : [],
            exercises: batch,
          };

          const { data: syncResult, error: syncErr } = await supabase.rpc(
            "sync_exercises_from_catalog_data",
            { _catalog: batchCatalog }
          );

          if (syncErr) {
            batchResults.push({ batch: i / BATCH_SIZE, error: syncErr.message });
            totalFailed += batch.length;
          } else {
            totalUpdated += syncResult?.exercises_updated || 0;
            totalFailed += syncResult?.exercises_failed || 0;
            batchResults.push({ batch: i / BATCH_SIZE, ...syncResult });
          }
        }

        exerciseSync.sync_result = {
          total_updated: totalUpdated,
          total_failed: totalFailed,
          batches: batchResults.length,
          categories_synced: batchResults[0]?.categories_synced || 0,
        };
      } else {
        exerciseSync.note = "Catalog JSON not found in storage. Tried paths: " + catalogPaths.join(", ");
      }
    } catch (e: unknown) {
      exerciseSync.error = e instanceof Error ? e.message : "Unknown error";
    }
    report.steps.push({ step: "exercise_catalog_sync", ...exerciseSync });

    // ─── STEP 6: Verification ───
    const { data: stats } = await supabase.rpc("sync_exercise_stats");
    const { data: packCheck } = await supabase
      .from("ai_credit_packs")
      .select("slug, credits, price_chf, cost_estimate_usd, margin_estimate")
      .order("sort_order");
    const { data: walletCount } = await supabase.from("ai_credit_wallets").select("id", { count: "exact", head: true });
    const { data: configCheck } = await supabase.from("ai_pricing_config").select("key, value").order("key");

    report.verification = {
      exercise_stats: stats,
      credit_packs: packCheck,
      wallet_count: walletCount,
      pricing_config: configCheck,
    };

    // Tables explicitly excluded from sync (transactional data)
    report.excluded_tables = [
      "ai_credit_wallets", "ai_credit_ledger", "billing_events",
      "stripe_customers", "profiles", "user_roles", "dogs",
      "day_progress", "journal_entries", "exercise_sessions",
      "behavior_logs", "messages", "support_tickets",
      "course_bookings", "adoption_checkins", "adoption_plan_entries",
    ];

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
