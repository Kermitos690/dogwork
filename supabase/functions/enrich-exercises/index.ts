import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  console.log("[ENRICH] Function invoked, method:", req.method);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    console.log("[ENRICH] Keys present:", { url: !!supabaseUrl, service: !!serviceRoleKey, ai: !!lovableApiKey });
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Non authentifié");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    const userId = userData?.user?.id;
    if (authError || !userId) throw new Error("Non authentifié");

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Accès refusé : admin requis");

    const body = await req.json().catch(() => ({}));
    const batchSize = body.batchSize || 2;
    const offset = body.offset || 0;

    // Use RPC to get only unenriched exercises
    const { data: exercises, error: fetchError } = await supabase.rpc("get_unenriched_exercises", {
      batch_limit: batchSize,
      batch_offset: offset,
    });
    if (fetchError) throw fetchError;
    if (!exercises || exercises.length === 0) {
      return new Response(JSON.stringify({ done: true, message: "Tous les exercices sont enrichis !", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get remaining count
    const { data: remainingData } = await supabase.rpc("get_unenriched_exercises", { batch_limit: 1000, batch_offset: 0 });
    const remaining = remainingData?.length || 0;

    const results: { id: string; name: string; success: boolean; error?: string }[] = [];

    for (const exercise of exercises) {
      try {
        const prompt = `Tu es un éducateur canin professionnel et bienveillant. Tu rédiges des fiches d'exercices pour une application mobile destinée à TOUS les propriétaires de chiens, y compris les débutants complets.

EXERCICE À ENRICHIR :
- Nom : ${exercise.name}
- Type : ${exercise.exercise_type || "fondation"}
- Niveau : ${exercise.level || "débutant"}
- Durée : ${exercise.duration || "5 min"}
- Répétitions : ${exercise.repetitions || "3-5 fois"}
- Environnement : ${exercise.environment || "tous"}
- Équipement : ${JSON.stringify(exercise.equipment || [])}
- Objectif actuel : ${exercise.objective || "Non défini"}
- Description actuelle : ${exercise.description || "Non définie"}
- Tags : ${JSON.stringify(exercise.tags || [])}
- Problèmes ciblés : ${JSON.stringify(exercise.target_problems || [])}
- Compatible chiot : ${exercise.compatible_puppy ? "oui" : "non"}
- Compatible senior : ${exercise.compatible_senior ? "oui" : "non"}
- Compatible réactivité : ${exercise.compatible_reactivity ? "oui" : "non"}
- Compatible muselière : ${exercise.compatible_muzzle ? "oui" : "non"}

CONSIGNES DE RÉDACTION :
1. Langage SIMPLE, phrases courtes, vocabulaire accessible (niveau collège)
2. CONCRET : dire exactement quoi faire avec ses mains, sa voix, son corps, la laisse
3. Donner des EXEMPLES du quotidien pour que ce soit parlant
4. Expliquer POURQUOI on fait chaque étape (le chien comprend mieux si le maître comprend)
5. Adapter les conseils selon le profil (chiot, senior, réactif, muselière)
6. Indiquer clairement quand s'ARRÊTER (signes de stress, fatigue)

Retourne un JSON avec EXACTEMENT ces champs (en français) :`;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "Tu es un rédacteur expert en éducation canine. Tu retournes UNIQUEMENT du JSON valide, sans markdown, sans commentaire." },
              { role: "user", content: prompt },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "enrich_exercise",
                  description: "Enrichit un exercice canin avec des descriptions détaillées et accessibles",
                  parameters: {
                    type: "object",
                    properties: {
                      description: { type: "string", description: "Description claire de l'exercice en 3-4 phrases simples. Max 300 caractères." },
                      objective: { type: "string", description: "L'objectif en 1-2 phrases très simples. Max 200 caractères." },
                      summary: { type: "string", description: "Résumé en 1 phrase courte et motivante. Max 100 caractères." },
                      short_instruction: { type: "string", description: "L'instruction principale en 1 phrase. Max 150 caractères." },
                      tutorial_steps: {
                        type: "array",
                        description: "5-8 étapes détaillées du tutoriel",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string" },
                            description: { type: "string" },
                            tip: { type: "string" },
                          },
                          required: ["title", "description"],
                        },
                      },
                      mistakes: {
                        type: "array",
                        description: "3-5 erreurs fréquentes à éviter",
                        items: {
                          type: "object",
                          properties: {
                            mistake: { type: "string" },
                            consequence: { type: "string" },
                            correction: { type: "string" },
                          },
                          required: ["mistake", "consequence", "correction"],
                        },
                      },
                      precautions: {
                        type: "array",
                        description: "2-4 précautions de sécurité",
                        items: {
                          type: "object",
                          properties: { text: { type: "string" } },
                          required: ["text"],
                        },
                      },
                      success_criteria: { type: "string" },
                      stop_criteria: { type: "string" },
                      vigilance: { type: "string" },
                      adaptations: {
                        type: "array",
                        description: "2-4 adaptations selon le profil",
                        items: {
                          type: "object",
                          properties: {
                            profile: { type: "string" },
                            adaptation: { type: "string" },
                          },
                          required: ["profile", "adaptation"],
                        },
                      },
                    },
                    required: ["description", "objective", "summary", "short_instruction", "tutorial_steps", "mistakes", "precautions", "success_criteria", "stop_criteria", "vigilance", "adaptations"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "enrich_exercise" } },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          if (response.status === 429) {
            results.push({ id: exercise.id, name: exercise.name, success: false, error: "Rate limited" });
            await new Promise(r => setTimeout(r, 30000));
            continue;
          }
          throw new Error(`AI error ${response.status}: ${errText}`);
        }

        const aiResult = await response.json();
        const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall) throw new Error("No tool call in AI response");

        const enriched = JSON.parse(toolCall.function.arguments);

        const { error: updateError } = await supabase.from("exercises").update({
          description: enriched.description,
          objective: enriched.objective,
          summary: enriched.summary,
          short_instruction: enriched.short_instruction,
          tutorial_steps: enriched.tutorial_steps,
          mistakes: enriched.mistakes,
          precautions: enriched.precautions,
          success_criteria: enriched.success_criteria,
          stop_criteria: enriched.stop_criteria,
          vigilance: enriched.vigilance,
          adaptations: enriched.adaptations,
        }).eq("id", exercise.id);

        if (updateError) throw updateError;
        results.push({ id: exercise.id, name: exercise.name, success: true });

        // Small delay between AI calls
        if (exercises.indexOf(exercise) < exercises.length - 1) {
          await new Promise(r => setTimeout(r, 1000));
        }
      } catch (err: any) {
        results.push({ id: exercise.id, name: exercise.name, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return new Response(JSON.stringify({
      done: remaining <= batchSize,
      processed: results.length,
      success: successCount,
      failed: results.length - successCount,
      remaining: remaining - successCount,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("enrich-exercises error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
