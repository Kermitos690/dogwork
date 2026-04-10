import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Production maintenance function.
 * Ensures pricing configs, credit packs, and exercise cover URLs are correct.
 * Can optionally re-sync exercises from a catalog JSON stored in this instance's storage.
 * This function operates exclusively on the current (production) database.
 */
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

    const report: Record<string, any> = { started_at: new Date().toISOString(), steps: [] };

    // ─── STEP 1: Fix cover image URLs pointing to wrong instance ───
    const instanceHost = new URL(SUPABASE_URL).host;
    const correctPrefix = `${SUPABASE_URL}/storage/v1/object/public/exercise-images/`;

    const { data: badUrls, error: badUrlErr } = await supabase
      .from("exercises")
      .select("id, slug, cover_image")
      .not("cover_image", "is", null)
      .neq("cover_image", "");

    let urlsFixed = 0;
    if (badUrls && !badUrlErr) {
      for (const ex of badUrls) {
        if (ex.cover_image && !ex.cover_image.includes(instanceHost)) {
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
    report.steps.push({ step: "upsert_pricing_config", count: pricingConfig.length, error: configErr?.message || null });

    // ─── STEP 3: Update ai_credit_packs cost estimates ───
    const packUpdates = [
      { slug: "decouverte", cost_estimate_usd: 0.40, margin_estimate: 0.92 },
      { slug: "standard", cost_estimate_usd: 0.75, margin_estimate: 0.90 },
      { slug: "premium", cost_estimate_usd: 2.50, margin_estimate: 0.89 },
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

    // ─── STEP 4: Upsert ai_plan_quotas ───
    const quotas = [
      { plan_slug: "starter", monthly_credits: 5, discount_percent: 0 },
      { plan_slug: "pro", monthly_credits: 30, discount_percent: 10 },
      { plan_slug: "expert", monthly_credits: 100, discount_percent: 20 },
      { plan_slug: "shelter", monthly_credits: 150, discount_percent: 20 },
      { plan_slug: "educator", monthly_credits: 200, discount_percent: 25 },
    ];
    const { error: quotaErr } = await supabase.from("ai_plan_quotas").upsert(quotas, { onConflict: "plan_slug" });
    report.steps.push({ step: "upsert_plan_quotas", count: quotas.length, error: quotaErr?.message || null });

    // ─── STEP 5: Verification ───
    const { data: stats } = await supabase.rpc("sync_exercise_stats");
    const { data: packCheck } = await supabase
      .from("ai_credit_packs")
      .select("slug, credits, price_chf, cost_estimate_usd, margin_estimate")
      .order("sort_order");

    report.verification = {
      exercise_stats: stats,
      credit_packs: packCheck,
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
