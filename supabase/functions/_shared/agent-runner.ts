/**
 * Shared utilities for autonomous AI agents.
 * Each agent: validates user, checks opt-in, debits credits, calls Gemini,
 * persists result in ai_generated_documents, updates last_run_at.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callAI } from "./ai-provider.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );
}

export async function authenticateUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing authorization header");
  const jwt = authHeader.replace("Bearer ", "");
  const supabase = getServiceClient();
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data.user) throw new Error("Invalid session");
  return data.user;
}

export interface AgentConfig {
  code: string;
  label: string;
  documentType: string;
  model: string;
  systemPrompt: string;
  buildUserPrompt: (context: any) => string;
  fetchContext: (supabase: any, userId: string, dogId?: string) => Promise<any>;
}

/**
 * Standard runner. Returns Response.
 * Body in: { dog_id?: string }
 */
export async function runAgent(req: Request, agent: AgentConfig): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const user = await authenticateUser(req);
    const supabase = getServiceClient();
    const { dog_id } = await req.json().catch(() => ({}));

    // 1. Verify agent is enabled (opt-in)
    const { data: pref } = await supabase
      .from("ai_agent_preferences")
      .select("enabled")
      .eq("user_id", user.id)
      .eq("agent_code", agent.code)
      .maybeSingle();

    if (!pref?.enabled) {
      return new Response(
        JSON.stringify({ error: "Agent désactivé. Activez-le depuis vos préférences." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get cost from catalog
    const { data: feature, error: featureError } = await supabase
      .from("ai_feature_catalog")
      .select("credits_cost, model")
      .eq("code", agent.code)
      .eq("is_active", true)
      .maybeSingle();

    if (featureError || !feature) {
      return new Response(
        JSON.stringify({ error: "Agent inconnu dans le catalogue IA." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Build context
    const context = await agent.fetchContext(supabase, user.id, dog_id);

    // 4. Debit credits BEFORE the AI call
    const { data: debited, error: debitError } = await supabase.rpc("debit_ai_credits", {
      _user_id: user.id,
      _feature_code: agent.code,
      _credits: feature.credits_cost,
      _provider_cost_usd: null,
      _metadata: { agent: agent.code, dog_id: dog_id ?? null },
    });

    if (debitError) {
      console.error(`[${agent.code}] debit error:`, debitError);
      return new Response(
        JSON.stringify({ error: "Erreur lors du débit des crédits." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!debited) {
      return new Response(
        JSON.stringify({ error: "Crédits insuffisants. Rechargez votre solde dans la boutique." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Call Gemini
    const aiResponse = await callAI({
      model: feature.model || agent.model,
      messages: [
        { role: "system", content: agent.systemPrompt },
        { role: "user", content: agent.buildUserPrompt(context) },
      ],
      temperature: 0.5,
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error(`[${agent.code}] AI error ${aiResponse.status}:`, errText);
      // Refund
      await supabase.rpc("credit_ai_wallet", {
        _user_id: user.id,
        _credits: feature.credits_cost,
        _operation_type: "refund",
        _description: `Remboursement échec ${agent.code}`,
      });
      return new Response(
        JSON.stringify({ error: "L'agent IA a rencontré une erreur. Crédits remboursés." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await aiResponse.json();
    const generatedText = data.choices?.[0]?.message?.content || "";

    // 6. Persist in ai_generated_documents
    const title = `${agent.label} — ${new Date().toLocaleDateString("fr-FR")}`;
    const { data: doc } = await supabase
      .from("ai_generated_documents")
      .insert({
        user_id: user.id,
        dog_id: dog_id ?? null,
        document_type: agent.documentType,
        feature_code: agent.code,
        title,
        summary: generatedText.slice(0, 200),
        content: { text: generatedText, context_summary: context?.summary ?? null },
        credits_spent: feature.credits_cost,
        model_used: feature.model,
        metadata: { agent: agent.code, autonomous: true },
      })
      .select("id")
      .single();

    // 7. Update last_run_at
    await supabase
      .from("ai_agent_preferences")
      .update({ last_run_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("agent_code", agent.code);

    return new Response(
      JSON.stringify({
        success: true,
        document_id: doc?.id,
        text: generatedText,
        credits_spent: feature.credits_cost,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(`[${agent.code}] fatal:`, e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
