// ai-debit: server-side credit debit for AI features that run client-side
// (e.g. the local plan generator). Validates JWT, debits via SECURITY DEFINER
// RPC using the authenticated user_id only — never trusts a client-supplied id.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const LEGACY_FEATURE_CODE_MAP: Record<string, string> = {
  ai_plan_generation: "plan_generator",
  ai_behavior_analysis: "behavior_analysis",
  ai_evaluation_scoring: "dog_profile_analysis",
  ai_adoption_plan: "adoption_plan",
  ai_progress_report: "behavior_summary",
};

// Server-side fallback costs — guarantees correct debit even if catalog
// row is missing, inactive, or has credits_cost=0 (e.g. before publish).
// Must mirror src/lib/aiFeatureCatalog.ts AI_FEATURE_FALLBACK_COSTS.
const FALLBACK_COSTS: Record<string, number> = {
  plan_generator: 5,
  education_plan: 8,
  adoption_plan: 8,
  behavior_analysis: 13,
  behavior_summary: 5,
  dog_profile_analysis: 5,
  chat: 1,
  ai_image_generation: 10,
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Session invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const featureCode = String(body?.feature_code ?? "").trim();
    const resolvedFeatureCode = LEGACY_FEATURE_CODE_MAP[featureCode] ?? featureCode;
    const metadata = (body?.metadata && typeof body.metadata === "object") ? body.metadata : {};
    if (!featureCode) {
      return new Response(JSON.stringify({ error: "feature_code requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Resolve cost from canonical catalog (single source of truth).
    const { data: feature, error: featErr } = await admin
      .from("ai_feature_catalog")
      .select("code, label, credits_cost, is_active")
      .eq("code", resolvedFeatureCode)
      .maybeSingle();

    if (featErr || !feature) {
      // Last-resort fallback: if catalog row is missing entirely, use known cost.
      const fallback = FALLBACK_COSTS[resolvedFeatureCode];
      if (!fallback) {
        return new Response(JSON.stringify({ error: `Fonctionnalité IA introuvable: ${featureCode}` }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Cost = catalog value if > 0, else fallback. Guarantees no silent 0-debit.
    const catalogCost = Number(feature?.credits_cost ?? 0);
    const credits = catalogCost > 0 ? catalogCost : (FALLBACK_COSTS[resolvedFeatureCode] ?? 0);
    const featureLabel = feature?.label ?? resolvedFeatureCode;

    if (credits <= 0) {
      return new Response(JSON.stringify({ error: `Coût crédits non défini pour: ${featureCode}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: debited, error: debitErr } = await admin.rpc("debit_ai_credits", {
      _user_id: userId,
      _feature_code: resolvedFeatureCode,
      _credits: credits,
      _provider_cost_usd: null,
      _metadata: { ...metadata, source: "ai-debit", feature_label: featureLabel },
    });

    if (debitErr) {
      return new Response(JSON.stringify({ error: debitErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (debited === false) {
      const { data: wallet } = await admin
        .from("ai_credit_wallets")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();
      return new Response(
        JSON.stringify({
          error: "Crédits insuffisants",
          code: "INSUFFICIENT_CREDITS",
          balance: wallet?.balance ?? 0,
          required: credits,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, credits_spent: credits, feature_code: resolvedFeatureCode, requested_feature_code: featureCode, label: feature.label }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
