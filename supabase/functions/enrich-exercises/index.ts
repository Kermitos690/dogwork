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

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
    const userId = userData?.user?.id;
    console.log("[ENRICH] Auth result:", { userId, error: authError?.message });
    if (authError || !userId) throw new Error("Non authentifié");

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
    console.log("[ENRICH] isAdmin:", isAdmin);
    if (!isAdmin) throw new Error("Accès refusé : admin requis");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get optional params
    const body = await req.json().catch(() => ({}));
    const batchSize = body.batchSize || 10;
    const offset = body.offset || 0;
    const onlyEmpty = body.onlyEmpty !== false; // default: only enrich poorly described exercises

    // Fetch exercises to enrich
    let query = supabase
      .from("exercises")
      .select("id, name, slug, description, objective, steps, tutorial_steps, mistakes, precautions, success_criteria, stop_criteria, vigilance, adaptations, level, duration, repetitions, exercise_type, environment, equipment, tags, target_problems, priority_axis, short_instruction, summary, category_id, compatible_puppy, compatible_senior, compatible_reactivity, compatible_muzzle")
      .order("name")
      .range(offset, offset + batchSize - 1);

    const { data: exercises, error: fetchError } = await query;
    if (fetchError) throw fetchError;
    if (!exercises || exercises.length === 0) {
      return new Response(JSON.stringify({ done: true, message: "Aucun exercice à traiter", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get total count
    const { count: totalCount } = await supabase.from("exercises").select("*", { count: "exact", head: true });

    const results: { id: string; name: string; success: boolean; error?: string }[] = [];

    for (const exercise of exercises) {
      try {
        // Skip already well-described exercises if onlyEmpty
        if (onlyEmpty) {
          const steps = Array.isArray(exercise.tutorial_steps) ? exercise.tutorial_steps : [];
          const desc = exercise.description || "";
          if (steps.length >= 4 && desc.length > 200) {
            results.push({ id: exercise.id, name: exercise.name, success: true, error: "skipped - already detailed" });
            continue;
          }
        }

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
                      description: { type: "string", description: "Description claire de l'exercice en 3-4 phrases simples. Expliquer ce qu'on va faire et pourquoi c'est utile au quotidien. Max 300 caractères." },
                      objective: { type: "string", description: "L'objectif en 1-2 phrases très simples. Ex: 'Apprendre à votre chien à s'asseoir quand vous le lui demandez, même quand il y a des distractions.' Max 200 caractères." },
                      summary: { type: "string", description: "Résumé en 1 phrase courte et motivante. Max 100 caractères." },
                      short_instruction: { type: "string", description: "L'instruction principale en 1 phrase. Ex: 'Guidez la friandise au-dessus du nez de votre chien jusqu'à ce qu'il s'assoie.' Max 150 caractères." },
                      tutorial_steps: {
                        type: "array",
                        description: "5-8 étapes détaillées du tutoriel, dans l'ordre",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string", description: "Titre court de l'étape (ex: 'Préparez vos friandises')" },
                            description: { type: "string", description: "Explication détaillée et concrète de ce qu'il faut faire. Préciser la position du corps, le ton de la voix, le geste exact. 2-3 phrases." },
                            tip: { type: "string", description: "Astuce pratique pour cette étape (ex: 'Utilisez des friandises odorantes comme du fromage pour mieux capter l'attention')" },
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
                            mistake: { type: "string", description: "L'erreur en termes simples" },
                            consequence: { type: "string", description: "Ce qui se passe si on fait cette erreur" },
                            correction: { type: "string", description: "Comment corriger" },
                          },
                          required: ["mistake", "consequence", "correction"],
                        },
                      },
                      precautions: {
                        type: "array",
                        description: "2-4 précautions de sécurité",
                        items: {
                          type: "object",
                          properties: {
                            text: { type: "string", description: "La précaution à prendre" },
                          },
                          required: ["text"],
                        },
                      },
                      success_criteria: { type: "string", description: "Comment savoir que l'exercice est réussi, en termes concrets et observables. 1-2 phrases." },
                      stop_criteria: { type: "string", description: "Quand arrêter l'exercice : signes de stress, fatigue ou perte d'intérêt. 1-2 phrases." },
                      vigilance: { type: "string", description: "Point de vigilance spécifique à cet exercice. 1 phrase." },
                      adaptations: {
                        type: "array",
                        description: "2-4 adaptations selon le profil du chien",
                        items: {
                          type: "object",
                          properties: {
                            profile: { type: "string", description: "Le profil concerné (ex: 'Chiot', 'Senior', 'Chien réactif', 'Avec muselière')" },
                            adaptation: { type: "string", description: "Comment adapter l'exercice pour ce profil" },
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
            results.push({ id: exercise.id, name: exercise.name, success: false, error: "Rate limited - retry later" });
            // Wait 30 seconds before continuing
            await new Promise(r => setTimeout(r, 30000));
            continue;
          }
          throw new Error(`AI error ${response.status}: ${errText}`);
        }

        const aiResult = await response.json();
        const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall) throw new Error("No tool call in AI response");

        const enriched = JSON.parse(toolCall.function.arguments);

        // Update exercise in database
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

        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 1000));
      } catch (err: any) {
        results.push({ id: exercise.id, name: exercise.name, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return new Response(JSON.stringify({
      done: offset + batchSize >= (totalCount || 0),
      processed: results.length,
      success: successCount,
      failed: results.length - successCount,
      nextOffset: offset + batchSize,
      total: totalCount,
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
