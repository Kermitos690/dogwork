/**
 * Shared utilities for autonomous AI agents.
 * Each agent: validates user, checks opt-in, debits credits, calls Gemini,
 * persists result in ai_generated_documents, updates last_run_at.
 *
 * v2: auto-resolves the active dog (most recently updated for the user) when
 * dog_id is not provided, and enriches context with a normalized dog profile
 * (age, threshold, reactivity, sociability...). Last-run parameters are
 * persisted in ai_agent_preferences.metadata for next executions.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callAI } from "./ai-provider.ts";

const AGENT_FEATURE_CODE_MAP: Record<string, string> = {
  agent_behavior_analysis: "behavior_analysis",
  agent_progress_report: "behavior_summary",
  agent_plan_adjustment: "plan_generator",
  agent_dog_insights: "dog_profile_analysis",
};

const FALLBACK_COSTS: Record<string, number> = {
  plan_generator: 5,
  behavior_analysis: 13,
  behavior_summary: 5,
  dog_profile_analysis: 13,
};

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

export interface DogProfileSummary {
  id: string;
  name: string;
  breed: string | null;
  age_years: number | null;
  size: string | null;
  sex: string | null;
  is_neutered: boolean | null;
  activity_level: string | null;
  // behavioural axis
  reactivity_level: number | null;       // dog_reaction_level proxy from evaluation/triggers
  threshold_distance_m: number | null;   // comfort_distance_meters
  sociability_dogs: number | null;
  sociability_humans: number | null;
  excitement_level: number | null;
  frustration_level: number | null;
  noise_sensitivity: number | null;
  obedience_level: number | null;
  recovery_capacity: number | null;
  separation_sensitivity: number | null;
  bite_history: boolean | null;
  muzzle_required: boolean | null;
  health_flags: string[];
}

function ageYears(birth?: string | null): number | null {
  if (!birth) return null;
  const ms = Date.now() - new Date(birth).getTime();
  if (Number.isNaN(ms) || ms <= 0) return null;
  return Math.round((ms / (1000 * 60 * 60 * 24 * 365.25)) * 10) / 10;
}

/**
 * Resolve the dog the agent must work on.
 * - If the client passed `dog_id`, we verify the dog belongs to this user
 *   (no impersonation, no cross-account leak) and return it.
 * - Otherwise we fall back to the user's currently active dog (the one
 *   selected in the DogSwitcher → `is_active = true`). We do NOT silently
 *   pick "the most recent dog" anymore: the result must always match the
 *   dog the user actually selected in the UI.
 */
async function resolveActiveDogId(
  supabase: any,
  userId: string,
  requestedDogId?: string | null
): Promise<string | null> {
  if (requestedDogId) {
    const { data } = await supabase
      .from("dogs")
      .select("id")
      .eq("id", requestedDogId)
      .eq("user_id", userId)
      .maybeSingle();
    return data?.id ?? null;
  }
  const { data } = await supabase
    .from("dogs")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  return data?.id ?? null;
}

async function loadDogProfile(
  supabase: any,
  dogId: string
): Promise<DogProfileSummary | null> {
  const { data: dog } = await supabase
    .from("dogs")
    .select("*")
    .eq("id", dogId)
    .maybeSingle();
  if (!dog) return null;

  const { data: evalRow } = await supabase
    .from("dog_evaluations")
    .select("comfort_distance_meters, problem_intensity, recovery_time, main_trigger")
    .eq("dog_id", dogId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const healthFlags: string[] = [];
  if (dog.bite_history) healthFlags.push("antécédent morsure");
  if (dog.muzzle_required) healthFlags.push("muselière requise");
  if (dog.epilepsy) healthFlags.push("épilepsie");
  if (dog.heart_problems) healthFlags.push("cardiaque");
  if (dog.joint_pain) healthFlags.push("articulations");
  if (dog.overweight) healthFlags.push("surpoids");

  return {
    id: dog.id,
    name: dog.name,
    breed: dog.breed,
    age_years: ageYears(dog.birth_date),
    size: dog.size,
    sex: dog.sex,
    is_neutered: dog.is_neutered,
    activity_level: dog.activity_level,
    reactivity_level: evalRow?.problem_intensity ?? null,
    threshold_distance_m: evalRow?.comfort_distance_meters ?? null,
    sociability_dogs: dog.sociability_dogs,
    sociability_humans: dog.sociability_humans,
    excitement_level: dog.excitement_level,
    frustration_level: dog.frustration_level,
    noise_sensitivity: dog.noise_sensitivity,
    obedience_level: dog.obedience_level,
    recovery_capacity: dog.recovery_capacity,
    separation_sensitivity: dog.separation_sensitivity,
    bite_history: dog.bite_history,
    muzzle_required: dog.muzzle_required,
    health_flags: healthFlags,
  };
}

export interface AgentRunContext {
  /** Normalized active-dog profile injected automatically when available. */
  dogProfile: DogProfileSummary | null;
  /** Persisted preferences from previous executions (metadata bag). */
  savedParams: Record<string, unknown>;
  /** User-provided body params (excluding dog_id). */
  bodyParams: Record<string, unknown>;
  /** Resolved dog id (active dog or explicit). */
  dogId: string | null;
}

export interface AgentConfig {
  code: string;
  label: string;
  documentType: string;
  model: string;
  systemPrompt: string;
  buildUserPrompt: (context: any) => string;
  /**
   * Fetch domain context. Receives the resolved dogId AND the auto-loaded
   * dog profile + saved params so each agent can adapt its data fetch.
   */
  fetchContext: (
    supabase: any,
    userId: string,
    dogId: string | null,
    extras: { dogProfile: DogProfileSummary | null; savedParams: Record<string, unknown> }
  ) => Promise<any>;
}

/**
 * Standard runner. Returns Response.
 * Body in: { dog_id?: string, ...customParams }
 *   - When dog_id is omitted, the active dog (most recently updated, is_active=true)
 *     is auto-selected.
 *   - All non-reserved body params are persisted in
 *     ai_agent_preferences.metadata.last_params for the next execution.
 */
export async function runAgent(req: Request, agent: AgentConfig): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const user = await authenticateUser(req);
    const supabase = getServiceClient();
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const { dog_id: explicitDogId, ...bodyParams } = body as { dog_id?: string };

    // 1. Verify agent is enabled (opt-in) + load saved params
    const { data: pref } = await supabase
      .from("ai_agent_preferences")
      .select("enabled, metadata")
      .eq("user_id", user.id)
      .eq("agent_code", agent.code)
      .maybeSingle();

    if (!pref?.enabled) {
      return new Response(
        JSON.stringify({ error: "Agent désactivé. Activez-le depuis vos préférences." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const savedParams = (pref?.metadata as any)?.last_params ?? {};
    // Merge: explicit body params override saved ones.
    const effectiveParams = { ...savedParams, ...bodyParams };

    // 2. Get cost from catalog, with canonical fallback for stale Live rows.
    const resolvedFeatureCode = AGENT_FEATURE_CODE_MAP[agent.code] ?? agent.code;
    const { data: feature, error: featureError } = await supabase
      .from("ai_feature_catalog")
      .select("credits_cost, model, is_active")
      .eq("code", resolvedFeatureCode)
      .maybeSingle();

    const fallbackCost = FALLBACK_COSTS[resolvedFeatureCode] ?? 0;
    if ((featureError || !feature || feature.is_active === false) && fallbackCost <= 0) {
      return new Response(
        JSON.stringify({ error: "Agent inconnu dans le catalogue IA." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const featureCost = fallbackCost > 0 ? fallbackCost : Number(feature?.credits_cost ?? 0);
    const featureModel = feature?.model || agent.model;

    // 3. Resolve active dog and load profile.
    //    Every IA tool is strictly scoped to ONE dog: refuse if we cannot
    //    identify the dog the user wants to analyze.
    const dogId = await resolveActiveDogId(supabase, user.id, explicitDogId);
    if (!dogId) {
      return new Response(
        JSON.stringify({
          error: explicitDogId
            ? "Chien introuvable ou non autorisé pour ce compte."
            : "Aucun chien sélectionné. Choisissez un chien actif avant de lancer cet outil IA.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const dogProfile = await loadDogProfile(supabase, dogId);

    // 4. Build agent-specific context (always scoped to the resolved dog)
    const context = await agent.fetchContext(supabase, user.id, dogId, {
      dogProfile,
      savedParams: effectiveParams,
    });
    // Always expose the dog profile to prompt builders
    const enrichedContext = { ...context, dogProfile, savedParams: effectiveParams };

    // 5. Debit credits BEFORE the AI call
    const { data: debited, error: debitError } = await supabase.rpc("debit_ai_credits", {
      _user_id: user.id,
        _feature_code: resolvedFeatureCode,
      _credits: feature.credits_cost,
      _provider_cost_usd: null,
      _metadata: {
        agent: agent.code,
          catalog_feature_code: resolvedFeatureCode,
        dog_id: dogId,
        dog_name: dogProfile?.name ?? null,
        params: effectiveParams,
      },
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

    // 6. Call Gemini — strict anti-hallucination guardrail prepended to
    //    the agent's own system prompt. The model must stay on THIS dog
    //    and refuse to invent missing data.
    const guardrail =
      `Tu travailles EXCLUSIVEMENT sur le chien fourni dans le contexte` +
      (dogProfile?.name ? ` (« ${dogProfile.name} », id ${dogId})` : ` (id ${dogId})`) +
      `. Règles strictes :\n` +
      `- Ne mentionne aucun autre chien, aucun autre utilisateur.\n` +
      `- N'invente jamais une race, un âge, un antécédent, un comportement, une donnée de santé ou un événement qui n'apparaît pas explicitement dans le contexte.\n` +
      `- Si une information manque, dis-le clairement (« non renseigné ») et propose comment la collecter, sans la deviner.\n` +
      `- Reste dans les limites de ton outil : ne déborde pas sur d'autres analyses ou recommandations hors de ta mission.\n\n`;

    const aiResponse = await callAI({
      model: feature.model || agent.model,
      messages: [
        { role: "system", content: guardrail + agent.systemPrompt },
        { role: "user", content: agent.buildUserPrompt(enrichedContext) },
      ],
      temperature: 0.3,
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

    // 7. Persist in ai_generated_documents
    const title = `${agent.label}${dogProfile?.name ? ` · ${dogProfile.name}` : ""} — ${new Date().toLocaleDateString("fr-FR")}`;
    const { data: doc } = await supabase
      .from("ai_generated_documents")
      .insert({
        user_id: user.id,
        dog_id: dogId,
        document_type: agent.documentType,
        feature_code: agent.code,
        title,
        summary: generatedText.slice(0, 200),
        content: {
          text: generatedText,
          context_summary: context?.summary ?? null,
          dog_profile: dogProfile,
          params: effectiveParams,
        },
        credits_spent: feature.credits_cost,
        model_used: feature.model,
        metadata: { agent: agent.code, autonomous: true, dog_id: dogId },
      })
      .select("id")
      .single();

    // 8. Update last_run_at + persist params for next run
    const newPrefMetadata = {
      ...(pref?.metadata as any ?? {}),
      last_params: effectiveParams,
      last_dog_id: dogId,
      last_dog_name: dogProfile?.name ?? null,
    };
    await supabase
      .from("ai_agent_preferences")
      .update({ last_run_at: new Date().toISOString(), metadata: newPrefMetadata })
      .eq("user_id", user.id)
      .eq("agent_code", agent.code);

    return new Response(
      JSON.stringify({
        success: true,
        document_id: doc?.id,
        text: generatedText,
        credits_spent: feature.credits_cost,
        dog_id: dogId,
        dog_name: dogProfile?.name ?? null,
        params_used: effectiveParams,
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
