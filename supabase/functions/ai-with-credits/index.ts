import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { callAI } from "../_shared/ai-provider.ts";

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
      console.warn("[ai-with-credits] Missing or invalid Authorization header");
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      console.warn("[ai-with-credits] Auth failed:", userError?.message || "no user");
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    console.log(`[ai-with-credits] User authenticated: ${userId.slice(0, 8)}...`);

    // 2. Parse body
    const body = await req.json();
    const { feature_code, messages, stream = true, system_prompt } = body;

    if (!feature_code || !messages) {
      console.warn("[ai-with-credits] Missing feature_code or messages");
      return new Response(JSON.stringify({ error: "feature_code et messages requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[ai-with-credits] Feature: ${feature_code}, messages: ${messages.length}, stream: ${stream}`);

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
      console.error(`[ai-with-credits] Feature "${feature_code}" not found:`, featureErr?.message);
      return new Response(JSON.stringify({ error: "Fonctionnalité IA non disponible" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[ai-with-credits] Feature found: ${feature.code}, cost=${feature.credits_cost}, model=${feature.model}`);

    // 4. Check privileges (admin/educator get free access but are LOGGED)
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roleList = roles?.map((r: { role: string }) => r.role) || [];
    const isPrivileged = roleList.includes("admin") || roleList.includes("educator");

    console.log(`[ai-with-credits] Roles: [${roleList.join(",")}], privileged: ${isPrivileged}`);

    const creditsCost = feature.credits_cost;

    if (isPrivileged) {
      try {
        await admin.rpc("ensure_ai_wallet", { _user_id: userId });
      } catch (e) {
        console.error("[ai-with-credits] ensure_ai_wallet failed for privileged user:", e);
      }

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
          description: `Appel privilégié (${roleList.join(",")})`,
        });
        console.log(`[ai-with-credits] Privileged call logged, wallet balance: ${wallet.balance}`);
      }
    } else {
      console.log(`[ai-with-credits] Debiting ${creditsCost} credits for user ${userId.slice(0, 8)}...`);

      const { data: debited, error: debitErr } = await admin.rpc("debit_ai_credits", {
        _user_id: userId,
        _feature_code: feature_code,
        _credits: creditsCost,
        _provider_cost_usd: feature.cost_estimate_avg_usd,
        _metadata: { model: feature.model },
      });

      if (debitErr) {
        console.error("[ai-with-credits] debit_ai_credits RPC error:", debitErr.message);
        return new Response(JSON.stringify({ error: "Erreur système de crédits" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (debited === false) {
        const { data: balance } = await admin.rpc("get_ai_balance", { _user_id: userId });
        console.log(`[ai-with-credits] Insufficient credits: balance=${balance}, required=${creditsCost}`);
        return new Response(JSON.stringify({
          error: "Crédits IA insuffisants",
          code: "INSUFFICIENT_CREDITS",
          balance: balance || 0,
          required: creditsCost,
        }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[ai-with-credits] Credits debited successfully`);
    }

    // 5. Call AI provider (Gemini via adapter)
    const systemMessages = system_prompt
      ? [{ role: "system", content: system_prompt }]
      : [];

    console.log(`[ai-with-credits] Calling Gemini: model=${feature.model}`);

    let response: Response;
    try {
      response = await callAI({
        model: feature.model,
        messages: [...systemMessages, ...messages],
        stream,
      });
    } catch (configErr) {
      // GOOGLE_AI_API_KEY missing
      console.error("[ai-with-credits] AI provider config error:", configErr);
      if (!isPrivileged) {
        await admin.rpc("credit_ai_wallet", {
          _user_id: userId,
          _credits: creditsCost,
          _operation_type: "refund",
          _description: "Remboursement automatique — erreur de configuration serveur",
        });
      }
      throw configErr;
    }

    if (!response.ok) {
      console.error(`[ai-with-credits] AI provider error: ${response.status}`);

      // Refund on AI error
      if (!isPrivileged) {
        await admin.rpc("credit_ai_wallet", {
          _user_id: userId,
          _credits: creditsCost,
          _operation_type: "refund",
          _description: `Remboursement auto — erreur fournisseur IA (${response.status})`,
        });
        console.log("[ai-with-credits] Credits refunded after AI error");
      }

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes IA, réessayez dans quelques instants." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const t = await response.text();
      console.error("[ai-with-credits] AI body:", t.slice(0, 500));
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[ai-with-credits] AI responded OK, stream=${stream}`);

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
    console.error("[ai-with-credits] Unhandled error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});