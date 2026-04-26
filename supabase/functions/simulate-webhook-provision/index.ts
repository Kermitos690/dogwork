// Admin-only: simule l'effet du webhook Stripe pour activer modules + créditer crédits inclus
// sans passer par Stripe. Réutilise EXACTEMENT la logique du switch dogwork_module
// du webhook (provision-modules + credit_ai_wallet).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  target_user_id?: string;
  organization_id?: string | null;
  plan_slug?: string | null;
  module_slugs?: string[];
  mode?: "payment" | "subscription";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: u } = await userClient.auth.getUser();
    if (!u.user) {
      return new Response(JSON.stringify({ error: "Session invalide" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin-only
    const { data: isAdminRow } = await admin
      .from("user_roles").select("role")
      .eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!isAdminRow) {
      return new Response(JSON.stringify({ error: "Réservé aux administrateurs" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    const targetUserId = body.target_user_id || u.user.id;
    const orgId = body.organization_id ?? null;
    const planSlug = body.plan_slug ?? null;
    const explicitSlugs = Array.isArray(body.module_slugs) ? body.module_slugs : [];
    const mode = body.mode ?? "subscription";

    // 1. Résolution modules (plan + explicite)
    let moduleSlugs = [...explicitSlugs];
    if (planSlug) {
      const { data: pm } = await admin
        .from("plan_modules").select("module_slug")
        .eq("plan_slug", planSlug).eq("included", true);
      moduleSlugs = Array.from(new Set([...moduleSlugs, ...((pm ?? []).map((r: any) => r.module_slug))]));
    }
    if (moduleSlugs.length === 0) {
      return new Response(JSON.stringify({ error: "Aucun module à provisionner (plan_slug ou module_slugs requis)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Snapshot AVANT
    const { data: balanceBefore } = await admin.rpc("get_ai_balance", { _user_id: targetUserId });
    const { data: modulesBefore } = await admin
      .from(orgId ? "organization_modules" : "user_modules")
      .select("module_slug, status, activated_at, source")
      .eq(orgId ? "organization_id" : "user_id", orgId || targetUserId);

    // 3. Provisionne
    const provisioned: string[] = [];
    for (const slug of moduleSlugs) {
      const row = {
        module_slug: slug, status: "active",
        source: mode === "subscription" ? "subscription" : "addon",
        activated_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      let err;
      if (orgId) {
        ({ error: err } = await admin.from("organization_modules").upsert(
          { ...row, organization_id: orgId }, { onConflict: "organization_id,module_slug" }));
      } else {
        ({ error: err } = await admin.from("user_modules").upsert(
          { ...row, user_id: targetUserId }, { onConflict: "user_id,module_slug" }));
      }
      if (!err) provisioned.push(slug);
    }

    // 4. Crédite si plan
    let creditsGranted = 0;
    if (planSlug) {
      const { data: plan } = await admin
        .from("plans").select("included_credits").eq("slug", planSlug).maybeSingle();
      if (plan?.included_credits && plan.included_credits > 0) {
        await admin.rpc("credit_ai_wallet", {
          _user_id: targetUserId,
          _credits: plan.included_credits,
          _operation_type: "monthly_grant",
          _description: `[SIMULATION] Crédits inclus plan ${planSlug}`,
          _stripe_payment_id: null,
          _public_price_chf: null,
          _metadata: { plan_slug: planSlug, source: "webhook_simulation", simulated_by: u.user.id },
        });
        creditsGranted = plan.included_credits;
      }
    }

    // 5. Snapshot APRES
    const { data: balanceAfter } = await admin.rpc("get_ai_balance", { _user_id: targetUserId });
    const { data: modulesAfter } = await admin
      .from(orgId ? "organization_modules" : "user_modules")
      .select("module_slug, status, activated_at, source")
      .eq(orgId ? "organization_id" : "user_id", orgId || targetUserId);

    return new Response(JSON.stringify({
      success: true,
      simulation: true,
      target: { user_id: targetUserId, organization_id: orgId },
      input: { plan_slug: planSlug, module_slugs: explicitSlugs, mode },
      resolved_modules: moduleSlugs,
      provisioned,
      credits: { before: balanceBefore, after: balanceAfter, granted: creditsGranted },
      modules: { before: modulesBefore ?? [], after: modulesAfter ?? [] },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
