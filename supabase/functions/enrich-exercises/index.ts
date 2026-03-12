import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
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
    const batchSize = body.batchSize || 2;
    const offset = body.offset || 0;

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
        const prompt = `Tu es un éducateur canin professionnel certifié et bienveillant. Tu rédiges des fiches d'exercices ULTRA-DÉTAILLÉES pour une application mobile destinée à TOUS les propriétaires de chiens, y compris les DÉBUTANTS COMPLETS qui n'ont AUCUNE expérience.

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

CONSIGNES ABSOLUES DE RÉDACTION — CHAQUE FICHE DOIT ÊTRE UN GUIDE COMPLET :

1. LANGAGE ULTRA-SIMPLE : phrases courtes, mots du quotidien, niveau collège. Pas de jargon cynophile.
2. CONSIGNES VOCALES EXACTES : Écrire mot pour mot ce que le maître doit dire. Préciser le TON (calme, ferme, enjoué), le VOLUME (voix basse, normale), le TIMING (quand parler, quand se taire). Exemple : "Dites 'Assis' UNE SEULE FOIS, d'une voix calme et claire. Ne répétez PAS."
3. POSITION DU CORPS : Décrire EXACTEMENT comment se tenir. Position des pieds, des mains, du regard, de la laisse. Exemple : "Tenez-vous droit, pieds écartés largeur d'épaules. Laisse dans la main droite, environ 1 mètre de mou. Bras gauche le long du corps."
4. GESTION DE LA LAISSE : Longueur exacte, tension, quand tirer doucement, quand relâcher, comment tenir le mousqueton.
5. QUE FAIRE EN CAS DE DIFFICULTÉ : Pour CHAQUE cas problématique possible, expliquer le protocole exact. "Si le chien tire → arrêtez-vous immédiatement, attendez 3 secondes qu'il vous regarde, puis reprenez."
6. CRITÈRES DE VALIDATION CHIFFRÉS : "L'exercice est RÉUSSI quand le chien maintient la position pendant 5 secondes sans aide, 3 fois sur 5 tentatives consécutives."
7. SIGNAUX D'ARRÊT : Lister les signes physiques du chien qui indiquent qu'il faut arrêter (halètement excessif, détournement de tête, bâillements répétés, queue basse, léchage de babines).
8. ADAPTER selon le profil (chiot, senior, réactif, muselière) avec des instructions spécifiques.
9. EXPLIQUER POURQUOI chaque étape est importante (le maître comprend mieux → il exécute mieux).
10. Chaque étape du tutoriel doit inclure ce que le maître dit, comment il se tient, et ce qu'il fait avec la laisse/ses mains.`;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "Tu es un rédacteur expert en éducation canine positive. Tu retournes UNIQUEMENT du JSON valide via l'outil fourni. Chaque fiche doit être un guide complet permettant à un débutant total d'exécuter l'exercice parfaitement." },
              { role: "user", content: prompt },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "enrich_exercise",
                  description: "Enrichit un exercice canin avec des instructions ultra-détaillées, consignes vocales, positionnement du corps et troubleshooting",
                  parameters: {
                    type: "object",
                    properties: {
                      description: { type: "string", description: "Description claire de l'exercice en 3-5 phrases simples et concrètes. 200-400 caractères." },
                      objective: { type: "string", description: "L'objectif en 2-3 phrases très simples avec le résultat attendu. 150-250 caractères." },
                      summary: { type: "string", description: "Résumé en 1 phrase courte et motivante. Max 100 caractères." },
                      short_instruction: { type: "string", description: "L'instruction principale en 1 phrase d'action. Max 150 caractères." },
                      tutorial_steps: {
                        type: "array",
                        description: "6-10 étapes ULTRA-DÉTAILLÉES du tutoriel. Chaque étape DOIT inclure ce que dire, comment se positionner, et quoi faire avec la laisse/mains.",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string", description: "Titre court de l'étape (ex: 'Positionnez-vous correctement')" },
                            description: { type: "string", description: "Instructions DÉTAILLÉES : ce que faire avec le corps, les mains, la laisse. 100-300 caractères." },
                            voice_command: { type: "string", description: "Ce que dire EXACTEMENT, avec le ton. Ex: \"Dites 'Assis' d'une voix calme, une seule fois\". Vide si aucune commande vocale." },
                            body_position: { type: "string", description: "Position exacte du corps. Ex: 'Debout, pieds écartés, regard vers le chien, laisse courte dans la main droite'." },
                            tip: { type: "string", description: "Conseil pratique pour cette étape." },
                          },
                          required: ["title", "description"],
                        },
                      },
                      voice_commands: {
                        type: "array",
                        description: "Liste de TOUTES les commandes vocales de l'exercice avec ton et timing",
                        items: {
                          type: "object",
                          properties: {
                            command: { type: "string", description: "Le mot/phrase exact à dire. Ex: 'Assis'" },
                            tone: { type: "string", description: "Le ton à utiliser. Ex: 'Voix calme et claire, volume normal'" },
                            timing: { type: "string", description: "Quand le dire. Ex: 'Au moment où le chien commence à s'asseoir'" },
                            warning: { type: "string", description: "Ce qu'il NE FAUT PAS faire. Ex: 'Ne répétez jamais deux fois de suite'" },
                          },
                          required: ["command", "tone", "timing"],
                        },
                      },
                      body_positioning: {
                        type: "array",
                        description: "Positionnement du corps du maître pour chaque phase de l'exercice",
                        items: {
                          type: "object",
                          properties: {
                            phase: { type: "string", description: "Phase de l'exercice. Ex: 'Départ', 'Pendant', 'Récompense'" },
                            position: { type: "string", description: "Position exacte : pieds, mains, regard, laisse, posture" },
                            common_mistake: { type: "string", description: "Erreur fréquente de posture à éviter" },
                          },
                          required: ["phase", "position"],
                        },
                      },
                      troubleshooting: {
                        type: "array",
                        description: "5-8 cas 'Si... alors...' pour gérer les difficultés",
                        items: {
                          type: "object",
                          properties: {
                            situation: { type: "string", description: "Le problème. Ex: 'Le chien tire fort sur la laisse'" },
                            solution: { type: "string", description: "La solution EXACTE pas à pas. Ex: 'Arrêtez-vous immédiatement. Restez immobile. Attendez que la laisse se détende. Dès qu'elle se détend, dites \"C'est bien\" et reprenez la marche.'" },
                            prevention: { type: "string", description: "Comment éviter que ça arrive. Ex: 'Commencez dans un endroit calme sans distractions'" },
                          },
                          required: ["situation", "solution"],
                        },
                      },
                      validation_protocol: { type: "string", description: "Protocole de validation CHIFFRÉ et PRÉCIS. Ex: 'L'exercice est validé quand le chien maintient le assis pendant 5 secondes sans aide vocale ni gestuelle, réussi 3 fois sur 5 tentatives consécutives, dans 2 environnements différents.'" },
                      mistakes: {
                        type: "array",
                        description: "4-6 erreurs fréquentes avec conséquence ET correction détaillée",
                        items: {
                          type: "object",
                          properties: {
                            mistake: { type: "string", description: "L'erreur concrète du maître" },
                            consequence: { type: "string", description: "Ce que ça provoque chez le chien" },
                            correction: { type: "string", description: "Comment corriger, étape par étape" },
                          },
                          required: ["mistake", "consequence", "correction"],
                        },
                      },
                      precautions: {
                        type: "array",
                        description: "3-5 précautions de sécurité importantes",
                        items: {
                          type: "object",
                          properties: { text: { type: "string" } },
                          required: ["text"],
                        },
                      },
                      success_criteria: { type: "string", description: "Critère de réussite observable et mesurable" },
                      stop_criteria: { type: "string", description: "Signes PRÉCIS du chien qui imposent l'arrêt immédiat : halètement excessif, bâillements, détournement, léchage de babines, queue basse, tremblements" },
                      vigilance: { type: "string", description: "Points de vigilance spécifiques à cet exercice" },
                      adaptations: {
                        type: "array",
                        description: "4-6 adaptations détaillées par profil de chien",
                        items: {
                          type: "object",
                          properties: {
                            profile: { type: "string", description: "Le profil (Chiot, Senior, Chien réactif, Chien muselé, Chien craintif, Grand chien)" },
                            adaptation: { type: "string", description: "Instructions spécifiques détaillées pour ce profil" },
                          },
                          required: ["profile", "adaptation"],
                        },
                      },
                    },
                    required: ["description", "objective", "summary", "short_instruction", "tutorial_steps", "voice_commands", "body_positioning", "troubleshooting", "validation_protocol", "mistakes", "precautions", "success_criteria", "stop_criteria", "vigilance", "adaptations"],
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

        if (exercises.indexOf(exercise) < exercises.length - 1) {
          await new Promise(r => setTimeout(r, 1500));
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
