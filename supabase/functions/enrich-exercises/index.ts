import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Non authentifié");

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    const userId = userData?.user?.id;
    if (authError || !userId) throw new Error("Non authentifié");

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Accès refusé : admin requis");

    const body = await req.json().catch(() => ({}));
    const batchSize = Math.min(body.batchSize || 5, 10);
    const offset = body.offset || 0;
    const mode = body.mode || "enrich"; // "enrich" | "fix-json" | "stats"

    // ─── MODE: fix-json - Fix double-encoded JSON fields ───
    if (mode === "fix-json") {
      let fixed = 0;
      // Get exercises with string-type steps/tutorial_steps
      const { data: allExercises } = await supabase
        .from("exercises")
        .select("id, steps, tutorial_steps")
        .limit(1000);

      if (allExercises) {
        for (const ex of allExercises) {
          const updates: Record<string, any> = {};

          // Fix steps if it's a string (double-encoded)
          if (typeof ex.steps === 'string') {
            try {
              updates.steps = JSON.parse(ex.steps);
              // Keep parsing if still a string
              while (typeof updates.steps === 'string') {
                updates.steps = JSON.parse(updates.steps);
              }
            } catch { /* keep original */ }
          }

          // Fix tutorial_steps if it's a string (double-encoded)
          if (typeof ex.tutorial_steps === 'string') {
            try {
              updates.tutorial_steps = JSON.parse(ex.tutorial_steps);
              while (typeof updates.tutorial_steps === 'string') {
                updates.tutorial_steps = JSON.parse(updates.tutorial_steps);
              }
            } catch { /* keep original */ }
          }

          if (Object.keys(updates).length > 0) {
            const { error } = await supabase.from("exercises").update(updates).eq("id", ex.id);
            if (!error) fixed++;
          }
        }
      }

      return new Response(JSON.stringify({ mode: "fix-json", fixed, total: allExercises?.length || 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── MODE: stats - Return enrichment statistics ───
    if (mode === "stats") {
      const { data: exercises } = await supabase
        .from("exercises")
        .select("id, description, short_instruction, summary, validation_protocol, voice_commands, troubleshooting, body_positioning, cover_image, steps, tutorial_steps")
        .limit(1000);

      const stats = {
        total: exercises?.length || 0,
        with_description: 0,
        with_short_instruction: 0,
        with_summary: 0,
        with_validation_protocol: 0,
        with_voice_commands: 0,
        with_troubleshooting: 0,
        with_body_positioning: 0,
        with_cover_image: 0,
        with_proper_steps: 0,
        with_proper_tutorial: 0,
        fully_premium: 0,
      };

      for (const ex of exercises || []) {
        const hasDesc = !!ex.description && ex.description.length > 10;
        const hasShort = !!ex.short_instruction && ex.short_instruction.length > 10;
        const hasSummary = !!ex.summary && ex.summary.length > 5;
        const hasValidation = !!ex.validation_protocol && ex.validation_protocol.length > 10;
        const hasVoice = Array.isArray(ex.voice_commands) && ex.voice_commands.length > 0;
        const hasTrouble = Array.isArray(ex.troubleshooting) && ex.troubleshooting.length > 0;
        const hasBody = Array.isArray(ex.body_positioning) && ex.body_positioning.length > 0;
        const hasCover = !!ex.cover_image && ex.cover_image.length > 10;
        const hasSteps = Array.isArray(ex.steps) && ex.steps.length >= 3;
        const hasTutorial = Array.isArray(ex.tutorial_steps) && ex.tutorial_steps.length >= 4;

        if (hasDesc) stats.with_description++;
        if (hasShort) stats.with_short_instruction++;
        if (hasSummary) stats.with_summary++;
        if (hasValidation) stats.with_validation_protocol++;
        if (hasVoice) stats.with_voice_commands++;
        if (hasTrouble) stats.with_troubleshooting++;
        if (hasBody) stats.with_body_positioning++;
        if (hasCover) stats.with_cover_image++;
        if (hasSteps) stats.with_proper_steps++;
        if (hasTutorial) stats.with_proper_tutorial++;
        if (hasDesc && hasShort && hasSummary && hasValidation && hasVoice && hasTrouble && hasBody && hasSteps && hasTutorial) {
          stats.fully_premium++;
        }
      }

      return new Response(JSON.stringify(stats), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── MODE: enrich - AI enrichment ───
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

    const { data: remainingData } = await supabase.rpc("get_unenriched_exercises", { batch_limit: 1000, batch_offset: 0 });
    const remaining = remainingData?.length || 0;

    const results: { id: string; name: string; success: boolean; error?: string }[] = [];

    for (const exercise of exercises) {
      try {
        const prompt = `Tu es un éducateur canin professionnel certifié. Rédige une fiche COMPLÈTE et SPÉCIFIQUE pour cet exercice précis.

EXERCICE :
- Nom : ${exercise.name}
- Slug : ${exercise.slug}
- Type : ${exercise.exercise_type || "fondation"}
- Niveau : ${exercise.level || "débutant"}
- Difficulté : ${exercise.difficulty || 1}/5
- Durée : ${exercise.duration || "5 min"}
- Répétitions : ${exercise.repetitions || "3-5 fois"}
- Environnement : ${exercise.environment || "tous"}
- Équipement : ${JSON.stringify(exercise.equipment || [])}
- Objectif : ${exercise.objective || "Non défini"}
- Tags : ${JSON.stringify(exercise.tags || [])}
- Problèmes ciblés : ${JSON.stringify(exercise.target_problems || [])}
- Compatible chiot : ${exercise.compatible_puppy ? "oui" : "non"}
- Compatible senior : ${exercise.compatible_senior ? "oui" : "non"}
- Compatible réactivité : ${exercise.compatible_reactivity ? "oui" : "non"}
- Compatible muselière : ${exercise.compatible_muzzle ? "oui" : "non"}
- Catégorie : ${exercise.category_slug || ""}

RÈGLES IMPÉRATIVES :
1. Tout le contenu doit être 100% SPÉCIFIQUE à "${exercise.name}". Aucun texte générique réutilisable sur un autre exercice.
2. Langage simple, phrases courtes, accessible aux débutants complets.
3. Les tutorial_steps doivent contenir 6-8 étapes détaillées avec pour chacune : titre, description précise de l'action, commande vocale exacte si applicable, position du corps du maître.
4. Les voice_commands doivent lister les vrais mots/ordres utilisés dans cet exercice précis.
5. Le troubleshooting doit couvrir 4-6 situations problématiques réalistes et spécifiques à cet exercice.
6. Le body_positioning doit décrire les positions exactes du maître aux phases clés de cet exercice précis.
7. Le validation_protocol doit donner des critères chiffrés et mesurables.`;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "Tu es un rédacteur expert en éducation canine positive. Retourne UNIQUEMENT du JSON valide via l'outil fourni. Chaque contenu doit être entièrement spécifique à l'exercice demandé - jamais de texte générique réutilisable." },
              { role: "user", content: prompt },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "enrich_exercise",
                  description: "Enrichit un exercice canin avec du contenu premium spécifique",
                  parameters: {
                    type: "object",
                    properties: {
                      description: { type: "string", description: "Description spécifique de l'exercice en 3-5 phrases. 200-400 caractères." },
                      summary: { type: "string", description: "Résumé en 1 phrase motivante. Max 100 caractères." },
                      short_instruction: { type: "string", description: "Instruction principale en 1 phrase d'action. Max 150 caractères." },
                      tutorial_steps: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string" },
                            description: { type: "string" },
                            voice_command: { type: "string" },
                            body_position: { type: "string" },
                            tip: { type: "string" },
                          },
                          required: ["title", "description"],
                        },
                      },
                      voice_commands: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            command: { type: "string" },
                            tone: { type: "string" },
                            timing: { type: "string" },
                            warning: { type: "string" },
                          },
                          required: ["command", "tone", "timing"],
                        },
                      },
                      body_positioning: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            phase: { type: "string" },
                            position: { type: "string" },
                            common_mistake: { type: "string" },
                          },
                          required: ["phase", "position"],
                        },
                      },
                      troubleshooting: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            situation: { type: "string" },
                            solution: { type: "string" },
                            prevention: { type: "string" },
                          },
                          required: ["situation", "solution"],
                        },
                      },
                      validation_protocol: { type: "string" },
                      mistakes: {
                        type: "array",
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
                    required: ["description", "summary", "short_instruction", "tutorial_steps", "voice_commands", "body_positioning", "troubleshooting", "validation_protocol", "mistakes", "precautions", "success_criteria", "stop_criteria", "vigilance", "adaptations"],
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
            await new Promise(r => setTimeout(r, 15000));
            continue;
          }
          throw new Error(`AI error ${response.status}: ${errText.substring(0, 200)}`);
        }

        const aiResult = await response.json();
        const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall) throw new Error("No tool call in AI response");

        const enriched = JSON.parse(toolCall.function.arguments);

        const { error: updateError } = await supabase.from("exercises").update({
          description: enriched.description,
          summary: enriched.summary,
          short_instruction: enriched.short_instruction,
          tutorial_steps: enriched.tutorial_steps,
          voice_commands: enriched.voice_commands,
          body_positioning: enriched.body_positioning,
          troubleshooting: enriched.troubleshooting,
          validation_protocol: enriched.validation_protocol,
          mistakes: enriched.mistakes,
          precautions: enriched.precautions,
          success_criteria: enriched.success_criteria,
          stop_criteria: enriched.stop_criteria,
          vigilance: enriched.vigilance,
          adaptations: enriched.adaptations,
        }).eq("id", exercise.id);

        if (updateError) throw updateError;
        results.push({ id: exercise.id, name: exercise.name, success: true });

        // Throttle between exercises
        if (exercises.indexOf(exercise) < exercises.length - 1) {
          await new Promise(r => setTimeout(r, 2000));
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
