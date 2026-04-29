// One-shot admin function: aligns module add-on prices and AI feature catalog
// in the LIVE Supabase project. Idempotent.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LIVE_URL = "https://hdmmqwpypvhwohhhaqnf.supabase.co";

// Source of truth — must match landing page and Stripe.
const ADDON_PRICING: Record<string, { monthly: number; yearly: number }> = {
  behavior_stats:    { monthly: 3.90, yearly: 39.00 },
  branding:          { monthly: 4.90, yearly: 49.00 },
  adoption_followup: { monthly: 5.90, yearly: 59.00 },
  planning:          { monthly: 6.90, yearly: 69.00 },
  team_permissions:  { monthly: 7.90, yearly: 79.00 },
};

const INCLUDED_MODULES = [
  "ai_chatbot", "ai_plans", "animal_management", "exercise_library",
  "messaging", "pdf_exports", "progress_journal", "shelter_management",
  "educator_crm", "payments_marketplace",
];

const AI_FEATURE_COSTS: Record<string, number> = {
  plan_generator: 5,
  education_plan: 8,
  behavior_analysis: 13,
  dog_profile_analysis: 13,
  adoption_plan: 15,
  behavior_summary: 5,
  chat: 1,
  chat_general: 1,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "missing auth" }, 401);
    const jwt = authHeader.replace("Bearer ", "");

    const sbCurrent = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: userData, error: userErr } = await sbCurrent.auth.getUser(jwt);
    if (userErr || !userData.user) return json({ error: "invalid token" }, 401);
    const { data: roles } = await sbCurrent.from("user_roles")
      .select("role").eq("user_id", userData.user.id);
    if (!roles?.some((r: any) => r.role === "admin")) {
      return json({ error: "admin required" }, 403);
    }

    const liveKey = Deno.env.get("LIVE_SERVICE_ROLE_KEY");
    if (!liveKey) return json({ error: "LIVE_SERVICE_ROLE_KEY missing" }, 500);
    const sbLive = createClient(LIVE_URL, liveKey);

    const result: any = { addons: [], included: [], ai_features: [], errors: [] };

    // 1. Fix add-ons
    for (const [slug, p] of Object.entries(ADDON_PRICING)) {
      const { error } = await sbLive.from("modules").update({
        monthly_price_chf: p.monthly,
        yearly_price_chf: p.yearly,
        pricing_type: "addon",
        is_addon: true,
      }).eq("slug", slug);
      if (error) result.errors.push(`addon ${slug}: ${error.message}`);
      else result.addons.push({ slug, ...p });
    }

    // 2. Reset included modules
    for (const slug of INCLUDED_MODULES) {
      const { error } = await sbLive.from("modules").update({
        monthly_price_chf: 0,
        yearly_price_chf: 0,
        pricing_type: "included",
        is_addon: false,
      }).eq("slug", slug);
      if (error) result.errors.push(`included ${slug}: ${error.message}`);
      else result.included.push(slug);
    }

    // 3. AI feature costs
    for (const [code, cost] of Object.entries(AI_FEATURE_COSTS)) {
      const { error } = await sbLive.from("ai_feature_catalog").update({
        credits_cost: cost,
        is_active: true,
      }).eq("code", code);
      if (error) result.errors.push(`ai ${code}: ${error.message}`);
      else result.ai_features.push({ code, cost });
    }

    // 4. Verify
    const { data: liveAddons } = await sbLive.from("modules")
      .select("slug, monthly_price_chf, pricing_type, is_addon")
      .eq("is_addon", true).order("slug");
    const { data: liveAI } = await sbLive.from("ai_feature_catalog")
      .select("code, credits_cost, is_active")
      .in("code", Object.keys(AI_FEATURE_COSTS)).order("code");

    return json({ ok: result.errors.length === 0, result, liveAddons, liveAI });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
