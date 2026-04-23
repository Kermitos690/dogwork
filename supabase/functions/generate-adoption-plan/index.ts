import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { callAI, callAIGateway } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FEATURE_CODE = "adoption_plan";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    // 1. Auth
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

    // Verify shelter or admin role
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const userRoles = roles?.map((r: { role: string }) => r.role) || [];
    const isShelter = userRoles.includes("shelter");
    const isAdmin = userRoles.includes("admin");

    if (!isShelter && !isAdmin) {
      return new Response(JSON.stringify({ error: "Accès réservé aux refuges" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { animal_id, adopter_answers } = body;
    if (!animal_id) {
      return new Response(JSON.stringify({ error: "animal_id requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Look up feature in catalog
    const { data: feature, error: featureErr } = await admin
      .from("ai_feature_catalog")
      .select("*")
      .eq("code", FEATURE_CODE)
      .eq("is_active", true)
      .single();

    if (featureErr || !feature) {
      return new Response(JSON.stringify({ error: "Fonctionnalité IA non disponible" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const creditsCost = feature.credits_cost;

    // 3. Debit credits for every account
    const { data: debited } = await admin.rpc("debit_ai_credits", {
      _user_id: userId,
      _feature_code: FEATURE_CODE,
      _credits: creditsCost,
      _provider_cost_usd: feature.cost_estimate_avg_usd,
      _metadata: { model: feature.model, animal_id, roles: userRoles },
    });

    if (debited === false) {
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

    // 4. Fetch animal data
    const { data: animal, error: animalError } = await admin
      .from("shelter_animals")
      .select("*")
      .eq("id", animal_id)
      .single();

    if (animalError || !animal) {
      await admin.rpc("credit_ai_wallet", {
        _user_id: userId,
        _credits: creditsCost,
        _operation_type: "refund",
        _description: "Remboursement auto — animal introuvable",
      });
      return new Response(JSON.stringify({ error: "Animal introuvable" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cross-tenant guard: shelter users may only access their own animals
    if (!isAdmin && animal.user_id !== userId) {
      await admin.rpc("credit_ai_wallet", {
        _user_id: userId,
        _credits: creditsCost,
        _operation_type: "refund",
        _description: "Remboursement auto — accès refusé (animal d'un autre refuge)",
      });
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch evaluations
    const { data: evaluations } = await admin
      .from("shelter_animal_evaluations")
      .select("*")
      .eq("animal_id", animal_id)
      .order("created_at", { ascending: false })
      .limit(1);

    const evaluation = evaluations?.[0] || null;

    // 5. Build prompt
    const animalProfile = {
      name: animal.name,
      species: animal.species || "chien",
      breed: animal.breed || "inconnu",
      sex: animal.sex || "inconnu",
      estimated_age: animal.estimated_age || "inconnu",
      status: animal.status,
      behavior_notes: animal.behavior_notes || "",
    };

    const evalProfile = evaluation ? {
      sociability_humans: evaluation.sociability_humans,
      sociability_dogs: evaluation.sociability_dogs,
      reactivity_level: evaluation.reactivity_level,
      fear_level: evaluation.fear_level,
      energy_level: evaluation.energy_level,
      separation_anxiety: evaluation.separation_anxiety,
      resource_guarding: evaluation.resource_guarding,
      leash_behavior: evaluation.leash_behavior,
      recommended_profile: evaluation.recommended_profile,
      special_needs: evaluation.special_needs,
      training_notes: evaluation.training_notes,
    } : null;

    const prompt = `Tu es un éducateur canin professionnel travaillant avec un refuge. Tu dois créer un plan de suivi post-adoption personnalisé et adapté.

ANIMAL ADOPTÉ :
${JSON.stringify(animalProfile, null, 2)}

${evalProfile ? `ÉVALUATION COMPORTEMENTALE :
${JSON.stringify(evalProfile, null, 2)}` : "Pas d'évaluation comportementale disponible."}

${adopter_answers ? `RÉPONSES DE L'ADOPTANT :
${JSON.stringify(adopter_answers, null, 2)}` : ""}

Génère un plan de suivi post-adoption en JSON avec ce format EXACT :
{
  "title": "Titre du plan de suivi",
  "description": "Description du plan adapté",
  "duration_weeks": <nombre de semaines recommandé entre 4 et 12>,
  "objectives": ["objectif 1", "objectif 2", ...],
  "tasks": [
    {
      "week_number": 1,
      "title": "Titre de la tâche",
      "description": "Description détaillée",
      "task_type": "observation|exercise|health|media",
      "sort_order": 0
    }
  ]
}

RÈGLES :
- Adapte la durée selon la complexité du profil
- Semaine 1 : focus acclimatation, calme, routine
- Semaine 2-3 : socialisation progressive, exploration
- Semaine 4+ : renforcement, autonomie, sorties
- Inclus des tâches de type "media" pour le suivi visuel
- Inclus au moins 1 tâche "health"
- 3-5 tâches par semaine maximum
- Sois concret, bienveillant et professionnel
- Réponds UNIQUEMENT en JSON valide, sans commentaire`;

    // 6. Call AI via adapter (with Lovable AI Gateway fallback on 429/503)
    const aiMessages = [
      { role: "system", content: "Tu es un éducateur canin expert. Réponds uniquement en JSON valide." },
      { role: "user", content: prompt },
    ];
    let aiResponse: Response;
    try {
      aiResponse = await callAI({
        model: feature.model,
        messages: aiMessages,
        temperature: 0.7,
        max_tokens: 4000,
        stream: false,
      });

      // Direct Gemini quota exhausted → fallback to Lovable AI Gateway
      if ((aiResponse.status === 429 || aiResponse.status === 503) ) {
        const errText = await aiResponse.clone().text();
        console.warn("[generate-adoption-plan] Gemini direct returned", aiResponse.status, "— falling back to Lovable AI Gateway. Detail:", errText.slice(0, 300));
        const fallback = await callAIGateway({
          model: "google/gemini-2.5-flash",
          messages: aiMessages,
          temperature: 0.7,
          max_tokens: 4000,
          stream: false,
        });
        if (fallback) aiResponse = fallback;
      }
    } catch (configErr) {
      await admin.rpc("credit_ai_wallet", {
        _user_id: userId,
        _credits: creditsCost,
        _operation_type: "refund",
        _description: "Remboursement auto — erreur de configuration serveur",
      });
      throw configErr;
    }

    if (!aiResponse.ok) {
      await admin.rpc("credit_ai_wallet", {
        _user_id: userId,
        _credits: creditsCost,
        _operation_type: "refund",
        _description: `Remboursement auto — erreur fournisseur IA (${aiResponse.status})`,
      });
      const errText = await aiResponse.text();
      console.error("AI provider error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({
          error: "Service IA temporairement saturé. Vos crédits ont été remboursés. Réessayez dans quelques instants.",
          code: "AI_RATE_LIMITED",
        }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({
          error: "Crédits IA fournisseur épuisés. Vos crédits ont été remboursés. L'équipe a été notifiée.",
          code: "AI_PROVIDER_PAYMENT_REQUIRED",
        }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erreur du service IA. Vos crédits ont été remboursés." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();

    const extractTextContent = (payload: any): string => {
      const choiceContent = payload?.choices?.[0]?.message?.content;
      if (typeof choiceContent === "string") return choiceContent;
      if (Array.isArray(choiceContent)) {
        return choiceContent
          .map((part: any) => {
            if (typeof part === "string") return part;
            if (typeof part?.text === "string") return part.text;
            if (typeof part?.content === "string") return part.content;
            return "";
          })
          .filter(Boolean)
          .join("\n");
      }

      const candidateParts = payload?.candidates?.[0]?.content?.parts;
      if (Array.isArray(candidateParts)) {
        return candidateParts
          .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
          .filter(Boolean)
          .join("\n");
      }

      return "";
    };

    const extractJsonPayload = (raw: string): string => {
      const trimmed = raw.trim();
      const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
      const source = (fencedMatch?.[1] ?? trimmed).trim();
      const firstBrace = source.indexOf("{");
      const lastBrace = source.lastIndexOf("}");

      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return source.slice(firstBrace, lastBrace + 1);
      }

      return source;
    };

    const content = extractTextContent(aiData);
    const jsonStr = extractJsonPayload(content);

    let plan;
    try {
      plan = JSON.parse(jsonStr);
    } catch {
      await admin.rpc("credit_ai_wallet", {
        _user_id: userId,
        _credits: creditsCost,
        _operation_type: "refund",
        _description: "Remboursement auto — réponse IA invalide (JSON)",
      });
      return new Response(JSON.stringify({ error: "Réponse IA invalide" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto-save to AI document library
    try {
      await admin.from("ai_generated_documents").insert({
        user_id: userId,
        dog_id: null,
        feature_code: FEATURE_CODE,
        document_type: "adoption_plan",
        title: plan.title || `Plan d'adoption — ${animal.name}`,
        summary: plan.description || "",
        content: plan,
        credits_spent: creditsCost,
        model_used: feature.model,
        metadata: { animal_id, animal_name: animal.name },
      });
    } catch (saveErr) {
      console.error("[generate-adoption-plan] auto-save failed:", saveErr);
    }

    return new Response(JSON.stringify({ success: true, plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("generate-adoption-plan error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});