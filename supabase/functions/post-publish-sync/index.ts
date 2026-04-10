import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Auth: admin only
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden: admin only" }, 403);

    const report: Record<string, unknown> = { started_at: new Date().toISOString(), steps: [] };
    const steps: Array<{ name: string; status: string; detail?: unknown }> = [];

    // ─── STEP 1: Upsert ai_pricing_config ───
    try {
      const configRows = [
        { key: "chf_per_credit", value: 0.10, label: "Prix public par crédit (CHF)", description: "Prix facturé à l'utilisateur par crédit consommé" },
        { key: "usd_per_credit_cost", value: 0.005, label: "Coût moyen fournisseur par crédit (USD)", description: "Coût moyen payé au fournisseur IA par crédit consommé" },
        { key: "target_margin_percent", value: 90, label: "Marge cible (%)", description: "Objectif de marge brute sur les crédits IA" },
        { key: "welcome_bonus_credits", value: 10, label: "Bonus de bienvenue (crédits)", description: "Crédits offerts à la création du wallet" },
        { key: "chf_usd_rate", value: 0.92, label: "Taux CHF/USD", description: "Taux de change utilisé pour les calculs de marge" },
      ];
      for (const row of configRows) {
        await supabase.from("ai_pricing_config").upsert(row, { onConflict: "key" });
      }
      steps.push({ name: "ai_pricing_config", status: "ok", detail: `${configRows.length} rows upserted` });
    } catch (e: unknown) {
      steps.push({ name: "ai_pricing_config", status: "error", detail: e instanceof Error ? e.message : String(e) });
    }

    // ─── STEP 2: Upsert ai_credit_packs economics ───
    try {
      const packs = [
        { slug: "starter", cost_estimate_usd: 0.25, margin_estimate: 95.0 },
        { slug: "popular", cost_estimate_usd: 1.00, margin_estimate: 93.3 },
        { slug: "pro", cost_estimate_usd: 2.50, margin_estimate: 92.1 },
      ];
      let updated = 0;
      for (const p of packs) {
        const { error } = await supabase
          .from("ai_credit_packs")
          .update({ cost_estimate_usd: p.cost_estimate_usd, margin_estimate: p.margin_estimate })
          .eq("slug", p.slug);
        if (!error) updated++;
      }
      steps.push({ name: "ai_credit_packs", status: "ok", detail: `${updated} packs updated` });
    } catch (e: unknown) {
      steps.push({ name: "ai_credit_packs", status: "error", detail: e instanceof Error ? e.message : String(e) });
    }

    // ─── STEP 3: Upsert ai_plan_quotas ───
    try {
      const quotas = [
        { plan_slug: "starter", monthly_credits: 0, discount_percent: 0 },
        { plan_slug: "pro", monthly_credits: 30, discount_percent: 10 },
        { plan_slug: "expert", monthly_credits: 100, discount_percent: 20 },
      ];
      for (const q of quotas) {
        await supabase.from("ai_plan_quotas").upsert(q, { onConflict: "plan_slug" });
      }
      steps.push({ name: "ai_plan_quotas", status: "ok", detail: `${quotas.length} quotas upserted` });
    } catch (e: unknown) {
      steps.push({ name: "ai_plan_quotas", status: "error", detail: e instanceof Error ? e.message : String(e) });
    }

    // ─── STEP 4: Sync enriched exercises from catalog ───
    try {
      const catalogUrl = `${SUPABASE_URL}/storage/v1/object/public/exercise-images/data/exercise-catalog.json`;
      const catalogRes = await fetch(catalogUrl);
      if (!catalogRes.ok) {
        steps.push({ name: "exercises_sync", status: "skipped", detail: `Catalog not found (${catalogRes.status}). Upload exercise-catalog.json to storage first.` });
      } else {
        const catalog = await catalogRes.json();
        const { data: syncResult, error: syncError } = await supabase.rpc("sync_exercises_from_catalog_data", { _catalog: catalog });
        if (syncError) throw syncError;
        steps.push({ name: "exercises_sync", status: "ok", detail: syncResult });
      }
    } catch (e: unknown) {
      steps.push({ name: "exercises_sync", status: "error", detail: e instanceof Error ? e.message : String(e) });
    }

    // ─── STEP 5: Verification report ───
    try {
      const { data: exerciseStats } = await supabase.rpc("sync_exercise_stats");

      const { count: totalPacks } = await supabase.from("ai_credit_packs").select("*", { count: "exact", head: true }).eq("is_active", true);
      const { data: packsWithCost } = await supabase.from("ai_credit_packs").select("slug, cost_estimate_usd, margin_estimate").eq("is_active", true);

      const { count: totalFeatures } = await supabase.from("ai_feature_catalog").select("*", { count: "exact", head: true }).eq("is_active", true);

      const { count: totalWallets } = await supabase.from("ai_credit_wallets").select("*", { count: "exact", head: true });

      const { count: billingCount } = await supabase.from("billing_events").select("*", { count: "exact", head: true });

      const { count: stripeCustomers } = await supabase.from("stripe_customers").select("*", { count: "exact", head: true });

      const verification = {
        exercises: exerciseStats,
        ai_economy: {
          active_packs: totalPacks,
          packs_detail: packsWithCost,
          active_features: totalFeatures,
          total_wallets: totalWallets,
        },
        stripe: {
          billing_events: billingCount,
          stripe_customers: stripeCustomers,
        },
      };

      // Identify gaps
      const gaps: string[] = [];
      if (exerciseStats) {
        const es = exerciseStats as Record<string, number>;
        if (es.with_description < es.total_exercises * 0.9) gaps.push(`Exercises missing descriptions: ${es.total_exercises - es.with_description}`);
        if (es.with_cover_image < es.total_exercises * 0.5) gaps.push(`Exercises missing cover images: ${es.total_exercises - es.with_cover_image}`);
      }
      if (packsWithCost?.some((p: any) => !p.cost_estimate_usd)) gaps.push("Some credit packs missing cost estimates");

      steps.push({ name: "verification", status: gaps.length === 0 ? "ok" : "warnings", detail: { verification, gaps } });
    } catch (e: unknown) {
      steps.push({ name: "verification", status: "error", detail: e instanceof Error ? e.message : String(e) });
    }

    report.steps = steps;
    report.completed_at = new Date().toISOString();
    report.overall_status = steps.every(s => s.status === "ok" || s.status === "skipped") ? "success" : "completed_with_issues";

    return json(report);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    console.error("post-publish-sync error:", message);
    return json({ error: message }, 500);
  }
});
