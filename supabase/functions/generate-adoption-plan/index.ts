import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Non authentifié");

    // Verify shelter or admin role
    const { data: isShelter } = await userClient.rpc("is_shelter");
    const { data: isAdmin } = await userClient.rpc("is_admin");
    if (!isShelter && !isAdmin) throw new Error("Accès réservé aux refuges");

    const body = await req.json();
    const { animal_id, adopter_answers } = body;

    if (!animal_id) throw new Error("animal_id requis");

    // Fetch animal data
    const { data: animal, error: animalError } = await userClient
      .from("shelter_animals")
      .select("*")
      .eq("id", animal_id)
      .single();

    if (animalError || !animal) throw new Error("Animal introuvable");

    // Fetch evaluations if any
    const { data: evaluations } = await userClient
      .from("shelter_animal_evaluations")
      .select("*")
      .eq("animal_id", animal_id)
      .order("created_at", { ascending: false })
      .limit(1);

    const evaluation = evaluations?.[0] || null;

    // Build AI prompt
    const animalProfile = {
      name: animal.name,
      species: animal.species || "chien",
      breed: animal.breed || "inconnu",
      sex: animal.sex || "inconnu",
      estimated_age: animal.estimated_age || "inconnu",
      status: animal.status,
      behavior_notes: animal.behavior_notes || "",
      medical_notes: animal.medical_notes || "",
      special_needs: animal.special_needs || "",
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
- Adapte la durée selon la complexité du profil (animal craintif = plus long, animal sociable = plus court)
- Semaine 1 : focus acclimatation, calme, routine
- Semaine 2-3 : socialisation progressive, exploration
- Semaine 4+ : renforcement, autonomie, sorties
- Inclus des tâches de type "media" (photos/vidéos) pour le suivi visuel
- Inclus au moins 1 tâche "health" (visite véto, contrôle poids)
- 3-5 tâches par semaine maximum
- Si animal réactif/craintif : ajoute des exercices de désensibilisation
- Si séparation anxiety : inclus protocole de séparation progressive
- Sois concret, bienveillant et professionnel
- Réponds UNIQUEMENT en JSON valide, sans commentaire`;

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY non configurée");
    }

    const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Tu es un éducateur canin expert. Réponds uniquement en JSON valide." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI error: ${aiResponse.status} ${errText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];
    
    const plan = JSON.parse(jsonStr.trim());

    return new Response(JSON.stringify({ success: true, plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
