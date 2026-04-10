import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function verifyAdmin(supabase: any, req: Request): Promise<boolean> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.replace("Bearer ", "");
  
  // Check if it's a service role key (for automated calls)
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (token === serviceRoleKey) return true;
  
  const { data: userData } = await supabase.auth.getUser(token);
  const userId = userData?.user?.id;
  if (!userId) return false;
  
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  return !!isAdmin;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const isAdmin = await verifyAdmin(supabase, req);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Accès refusé : admin requis" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || "enrich"; // "enrich" | "fix-json" | "stats"

    // ─── MODE: fix-json ───
    if (mode === "fix-json") {
      let fixed = 0;
      const { data: allExercises } = await supabase
        .from("exercises")
        .select("id, steps, tutorial_steps")
        .limit(1000);

      if (allExercises) {
        for (const ex of allExercises) {
          const updates: Record<string, any> = {};

          if (typeof ex.steps === 'string') {
            try {
              let parsed = ex.steps;
              while (typeof parsed === 'string') parsed = JSON.parse(parsed);
              updates.steps = parsed;
            } catch { /* skip */ }
          }

          if (typeof ex.tutorial_steps === 'string') {
            try {
              let parsed = ex.tutorial_steps;
              while (typeof parsed === 'string') parsed = JSON.parse(parsed);
              updates.tutorial_steps = parsed;
            } catch { /* skip */ }
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

    // ─── MODE: stats ───
    if (mode === "stats") {
      const { data: exercises } = await supabase
        .from("exercises")
        .select("id, description, short_instruction, summary, validation_protocol, voice_commands, troubleshooting, body_positioning, cover_image, steps, tutorial_steps")
        .limit(1000);

      const stats = {
        total: exercises?.length || 0,
        with_description: 0, with_short_instruction: 0, with_summary: 0,
        with_validation_protocol: 0, with_voice_commands: 0, with_troubleshooting: 0,
        with_body_positioning: 0, with_cover_image: 0, with_proper_steps: 0,
        with_proper_tutorial: 0, fully_premium: 0,
      };

      for (const ex of exercises || []) {
        const d = !!ex.description && ex.description.length > 10;
        const si = !!ex.short_instruction && ex.short_instruction.length > 10;
        const su = !!ex.summary && ex.summary.length > 5;
        const vp = !!ex.validation_protocol && ex.validation_protocol.length > 10;
        const vc = Array.isArray(ex.voice_commands) && ex.voice_commands.length > 0;
        const ts2 = Array.isArray(ex.troubleshooting) && ex.troubleshooting.length > 0;
        const bp = Array.isArray(ex.body_positioning) && ex.body_positioning.length > 0;
        const ci = !!ex.cover_image && ex.cover_image.length > 10;
        const st = Array.isArray(ex.steps) && ex.steps.length >= 3;
        const tu = Array.isArray(ex.tutorial_steps) && ex.tutorial_steps.length >= 4;

        if (d) stats.with_description++;
        if (si) stats.with_short_instruction++;
        if (su) stats.with_summary++;
        if (vp) stats.with_validation_protocol++;
        if (vc) stats.with_voice_commands++;
        if (ts2) stats.with_troubleshooting++;
        if (bp) stats.with_body_positioning++;
        if (ci) stats.with_cover_image++;
        if (st) stats.with_proper_steps++;
        if (tu) stats.with_proper_tutorial++;
        if (d && si && su && vp && vc && ts2 && bp && st && tu) stats.fully_premium++;
      }

      return new Response(JSON.stringify(stats), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── MODE: enrich ───
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    const batchSize = Math.min(body.batchSize || 5, 10);
    const offset = body.offset || 0;

    // Get exercises that need enrichment (missing description or other key fields)
    const { data: exercises, error: fetchError } = await supabase
      .from("exercises")
      .select("*")
      .or("description.is.null,description.eq.,short_instruction.is.null,short_instruction.eq.,summary.is.null,summary.eq.,validation_protocol.is.null,validation_protocol.eq.")
      .order("name")
      .range(offset, offset + batchSize - 1);

    if (fetchError) throw fetchError;
    if (!exercises || exercises.length === 0) {
      return new Response(JSON.stringify({ done: true, message: "Tous les exercices sont enrichis", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Count remaining
    const { count: remaining } = await supabase
      .from("exercises")
      .select("id", { count: "exact", head: true })
      .or("description.is.null,description.eq.,short_instruction.is.null,short_instruction.eq.");

    const results: { id: string; name: string; success: boolean; error?: string }[] = [];

    for (const exercise of exercises) {
      try {
        // Get category name
        const { data: catData } = await supabase
          .from("exercise_categories")
          .select("name, slug")
          .eq("id", exercise.category_id)
          .single();

        const prompt = `Tu es un éducateur canin professionnel certifié. Rédige une fiche COMPLÈTE et SPÉCIFIQUE pour cet exercice.

EXERCICE : "${exercise.name}"
- Slug : ${exercise.slug}
- Catégorie : ${catData?.name || "Général"}
- Type : ${exercise.exercise_type || "fondation"}
- Niveau : ${exercise.level || "débutant"}
- Difficulté : ${exercise.difficulty || 1}/5
- Durée : ${exercise.duration || "5 min"}
- Objectif : ${exercise.objective}
- Tags : ${JSON.stringify(exercise.tags || [])}
- Équipement : ${JSON.stringify(exercise.equipment || [])}
- Compatible chiot : ${exercise.compatible_puppy ? "oui" : "non"}
- Compatible senior : ${exercise.compatible_senior ? "oui" : "non"}
- Compatible réactivité : ${exercise.compatible_reactivity ? "oui" : "non"}

RÈGLES :
1. Contenu 100% SPÉCIFIQUE à "${exercise.name}" - aucun texte générique.
2. Langage simple, phrases courtes, accessible aux débutants.
3. tutorial_steps : 6-8 étapes détaillées propres à cet exercice.
4. voice_commands : les vrais mots/ordres pour cet exercice précis.
5. troubleshooting : 4-6 problèmes réalistes spécifiques à cet exercice.
6. body_positioning : positions du maître aux phases clés de cet exercice.
7. validation_protocol : critères chiffrés et mesurables.`;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "Tu es un rédacteur expert en éducation canine positive. Retourne UNIQUEMENT du JSON via l'outil fourni. Contenu spécifique à l'exercice demandé." },
              { role: "user", content: prompt },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "enrich_exercise",
                  description: "Enrichit un exercice canin",
                  parameters: {
                    type: "object",
                    properties: {
                      description: { type: "string", description: "Description spécifique 3-5 phrases. 200-400 chars." },
                      summary: { type: "string", description: "Résumé 1 phrase. Max 100 chars." },
                      short_instruction: { type: "string", description: "Instruction principale 1 phrase. Max 150 chars." },
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
                    required: ["description", "summary", "short_instruction", "tutorial_steps", "voice_commands", "body_positioning", "troubleshooting", "validation_protocol", "success_criteria", "stop_criteria"],
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
          throw new Error(`AI ${response.status}: ${errText.substring(0, 200)}`);
        }

        const aiResult = await response.json();
        const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall) throw new Error("No tool call");

        const enriched = JSON.parse(toolCall.function.arguments);

        const { error: updateError } = await supabase.from("exercises").update({
          description: enriched.description,
          summary: enriched.summary,
          short_instruction: enriched.short_instruction,
          tutorial_steps: enriched.tutorial_steps,
          voice_commands: enriched.voice_commands || [],
          body_positioning: enriched.body_positioning || [],
          troubleshooting: enriched.troubleshooting || [],
          validation_protocol: enriched.validation_protocol,
          mistakes: enriched.mistakes || [],
          precautions: enriched.precautions || [],
          success_criteria: enriched.success_criteria,
          stop_criteria: enriched.stop_criteria,
          vigilance: enriched.vigilance || null,
          adaptations: enriched.adaptations || [],
        }).eq("id", exercise.id);

        if (updateError) throw updateError;
        results.push({ id: exercise.id, name: exercise.name, success: true });

        // Throttle
        if (exercises.indexOf(exercise) < exercises.length - 1) {
          await new Promise(r => setTimeout(r, 2000));
        }
      } catch (err: any) {
        results.push({ id: exercise.id, name: exercise.name, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return new Response(JSON.stringify({
      done: (remaining || 0) <= batchSize,
      processed: results.length,
      success: successCount,
      failed: results.length - successCount,
      remaining: (remaining || 0) - successCount,
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
