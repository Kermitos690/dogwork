import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Centralized AI wrapper with credit system.
 * Every AI call must go through this function.
 * 
 * Body: { feature_code: string, messages: Array<{role, content}>, stream?: boolean }
 * 
 * Flow:
 * 1. Authenticate user
 * 2. Look up feature in catalog
 * 3. Check/debit credits (admin/educator bypass)
 * 4. Call AI gateway
 * 5. Log usage
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    // 1. Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // 2. Parse body
    const body = await req.json();
    const { feature_code, messages, stream = true, system_prompt } = body;

    if (!feature_code || !messages) {
      return new Response(JSON.stringify({ error: "feature_code et messages requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Service role client for DB ops
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Look up feature
    const { data: feature, error: featureErr } = await admin
      .from("ai_feature_catalog")
      .select("*")
      .eq("code", feature_code)
      .eq("is_active", true)
      .single();

    if (featureErr || !feature) {
      return new Response(JSON.stringify({ error: "Fonctionnalité IA non disponible" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Check privileges (admin/educator get free access but are LOGGED)
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const isPrivileged = roles?.some(
      (r: { role: string }) => r.role === "admin" || r.role === "educator"
    );

    const creditsCost = feature.credits_cost;

    if (isPrivileged) {
      // C6: Log privileged calls for auditability (no debit)
      const walletId = await admin.rpc("ensure_ai_wallet", { _user_id: userId });
      const { data: wallet } = await admin
        .from("ai_credit_wallets")
        .select("id, balance")
        .eq("user_id", userId)
        .single();
      if (wallet) {
        await admin.from("ai_credit_ledger").insert({
          user_id: userId,
          wallet_id: wallet.id,
          operation_type: "consumption",
          credits_delta: 0,
          balance_after: wallet.balance,
          feature_code: feature_code,
          provider_cost_usd: feature.cost_estimate_avg_usd,
          status: "success",
          metadata: { model: feature.model, privileged: true },
          description: `Appel privilégié (${roles?.map((r: {role:string}) => r.role).join(",")})`,
        });
      }
    } else {
      // Debit credits
      const { data: debited } = await admin.rpc("debit_ai_credits", {
        _user_id: userId,
        _feature_code: feature_code,
        _credits: creditsCost,
        _provider_cost_usd: feature.cost_estimate_avg_usd,
        _metadata: { model: feature.model },
      });

      if (debited === false) {
        // Get current balance for the error message
        const { data: balance } = await admin.rpc("get_ai_balance", { _user_id: userId });
        return new Response(JSON.stringify({
          error: "Crédits IA insuffisants",
          code: "INSUFFICIENT_CREDITS",
          balance: balance || 0,
          required: creditsCost,
        }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 5. Call AI gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // Refund credits if not privileged
      if (!isPrivileged) {
        await admin.rpc("credit_ai_wallet", {
          _user_id: userId,
          _credits: creditsCost,
          _operation_type: "refund",
          _description: "Remboursement automatique — erreur de configuration serveur",
        });
      }
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemMessages = system_prompt
      ? [{ role: "system", content: system_prompt }]
      : [];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: feature.model,
        messages: [...systemMessages, ...messages],
        stream,
      }),
    });

    if (!response.ok) {
      // Refund on AI gateway error
      if (!isPrivileged) {
        await admin.rpc("credit_ai_wallet", {
          _user_id: userId,
          _credits: creditsCost,
          _operation_type: "refund",
          _description: `Remboursement auto — erreur gateway (${response.status})`,
        });
      }

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes IA, réessayez dans quelques instants." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits plateforme épuisés. Contactez le support." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-with-credits error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
