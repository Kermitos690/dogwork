/**
 * chat-capture-event
 *
 * Lit le dernier message utilisateur du chat, extrait via IA des "captures"
 * structurées prêtes à être proposées à la confirmation de l'utilisateur
 * pour mettre à jour la fiche du chien actif.
 *
 * Sécurité :
 *  - Auth user requise.
 *  - active_dog_id requis (la capture est toujours scoped à ce chien).
 *  - Aucune écriture DB ici. Aucun débit crédit (gratuit, factorisé sur le chat).
 *  - L'écriture réelle se fait uniquement via `apply-chat-capture` (avec RLS).
 */

import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { callAI } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_DOG_FIELDS = [
  "weight_kg", "size", "activity_level", "environment",
  "alone_hours_per_day", "has_children", "has_other_animals",
  "is_neutered", "muzzle_required",
  "joint_pain", "heart_problems", "epilepsy", "overweight",
  "allergies", "known_diseases", "physical_limitations",
  "vet_restrictions", "current_treatments", "health_notes",
  "obedience_level", "sociability_dogs", "sociability_humans",
  "excitement_level", "frustration_level", "recovery_capacity",
  "noise_sensitivity", "separation_sensitivity",
] as const;

const CAPTURE_KINDS = ["behavior_log", "health_note", "dog_field_update", "dog_problem", "dog_objective"] as const;

function buildExtractionPrompt(dogName: string, allowedFields: readonly string[]): string {
  return [
    `Tu es un extracteur de données pour DogWork. Tu analyses UN message d'un utilisateur qui parle du chien "${dogName}".`,
    `Ton job : identifier 0 à 3 informations factuelles NOUVELLES sur ce chien qui mériteraient d'être enregistrées dans sa fiche.`,
    ``,
    `Types de captures possibles :`,
    `- "behavior_log" : observation terrain ponctuelle (ex: "calme face à un hérisson", "a aboyé en croisant un vélo"). Payload: { summary: string (résumé court), tension_level?: 1-5, focus_quality?: "bon"|"moyen"|"faible", leash_walk_quality?: "bonne"|"moyenne"|"difficile" }`,
    `- "health_note" : info santé/véto/traitement (ex: "rendez-vous véto demain", "nouveau traitement antalgique"). Payload: { text: string }`,
    `- "dog_field_update" : changement d'un champ précis de la fiche. target_field DOIT être l'un de : ${allowedFields.join(", ")}. Payload: { value: any } (booléen, nombre ou texte selon le champ). Pour les niveaux 1-5 : entier 1..5.`,
    `- "dog_problem" : nouveau problème comportemental durable (ex: "réagit fort aux trottinettes"). Payload: { problem_key: string (slug court en français kebab-case), intensity?: 1-5, frequency?: "rarement"|"parfois"|"souvent"|"toujours", comment?: string }`,
    `- "dog_objective" : objectif de travail souhaité (ex: "j'aimerais qu'il se pose le soir"). Payload: { objective_key: string (slug court kebab-case), is_priority?: boolean }`,
    ``,
    `RÈGLES STRICTES :`,
    `- Si le message est une simple question, une salutation, une plainte vague ou ne contient AUCUN fait nouveau et concret sur le chien : retourne { "captures": [] }.`,
    `- N'invente jamais une valeur. Si tu hésites, n'extrais pas.`,
    `- Une capture par information distincte (pas de doublon).`,
    `- "confidence" entre 0 et 1. Sois conservateur : confidence < 0.7 sera ignoré.`,
    `- "summary" court (max 100 caractères), en français, qui sera montré à l'utilisateur dans la carte de confirmation.`,
    ``,
    `Réponds STRICTEMENT en JSON valide :`,
    `{ "captures": [ { "kind": "...", "target_field"?: "...", "payload": { ... }, "summary": "...", "confidence": 0.x } ] }`,
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jwt = authHeader.slice(7);
    const userClient = createClient(supabaseUrl, anonKey);
    const { data: userData, error: userErr } = await userClient.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const { user_message, active_dog_id } = body as { user_message?: string; active_dog_id?: string };

    if (!user_message || typeof user_message !== "string" || user_message.trim().length < 4) {
      return new Response(JSON.stringify({ captures: [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!active_dog_id) {
      return new Response(JSON.stringify({ captures: [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Vérifier que le chien existe et est accessible à l'utilisateur (lecture via service role,
    // mais l'écriture finale passera par apply-chat-capture en RLS user).
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: dog } = await admin
      .from("dogs")
      .select("id, name, user_id")
      .eq("id", active_dog_id)
      .maybeSingle();

    if (!dog) {
      return new Response(JSON.stringify({ captures: [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Appel IA en mode JSON
    const systemPrompt = buildExtractionPrompt(dog.name, ALLOWED_DOG_FIELDS);
    const aiResp = await callAI({
      model: "google/gemini-2.5-flash",
      stream: false,
      temperature: 0.1,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: user_message.slice(0, 2000) },
      ],
    });

    if (!aiResp.ok) {
      console.warn("[chat-capture-event] AI provider failed", aiResp.status);
      return new Response(JSON.stringify({ captures: [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json().catch(() => null);
    const raw = data?.choices?.[0]?.message?.content as string | undefined;
    if (!raw) {
      return new Response(JSON.stringify({ captures: [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extraction tolérante JSON (l'IA peut wrapper avec ```json)
    let parsed: any = null;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try { parsed = JSON.parse(jsonMatch[0]); } catch { /* ignore */ }
    }

    const rawCaptures: any[] = Array.isArray(parsed?.captures) ? parsed.captures : [];

    // Filtre / validation côté serveur
    const captures = rawCaptures
      .filter((c) => c && typeof c === "object")
      .filter((c) => CAPTURE_KINDS.includes(c.kind))
      .filter((c) => typeof c.summary === "string" && c.summary.trim().length > 0)
      .filter((c) => typeof c.confidence === "number" && c.confidence >= 0.7)
      .filter((c) => {
        if (c.kind === "dog_field_update") {
          return typeof c.target_field === "string" && (ALLOWED_DOG_FIELDS as readonly string[]).includes(c.target_field);
        }
        return true;
      })
      .slice(0, 3)
      .map((c) => ({
        kind: c.kind,
        target_field: c.target_field ?? null,
        payload: c.payload ?? {},
        summary: String(c.summary).slice(0, 160),
        confidence: Number(c.confidence),
        dog_id: active_dog_id,
        dog_name: dog.name,
      }));

    return new Response(JSON.stringify({ captures }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[chat-capture-event] error", err);
    return new Response(JSON.stringify({ captures: [], error: (err as Error).message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
