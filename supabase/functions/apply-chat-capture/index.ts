/**
 * apply-chat-capture
 *
 * Applique UNE capture validée par l'utilisateur (clic sur "Enregistrer dans la fiche").
 *
 * Sécurité :
 *  - Auth user requise.
 *  - Toutes les écritures passent par le client RLS de l'utilisateur (PAS service_role).
 *    → Garantit qu'un user ne peut écrire que sur ses propres chiens.
 *  - Whitelist stricte des champs `dogs` modifiables.
 *  - Validation stricte des types et plages de valeurs.
 *  - Audit : metadata.source = 'ai_chat_capture'.
 */

import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NUMERIC_FIELDS = new Set(["weight_kg", "alone_hours_per_day"]);
const LEVEL_1_5_FIELDS = new Set([
  "obedience_level", "sociability_dogs", "sociability_humans",
  "excitement_level", "frustration_level", "recovery_capacity",
  "noise_sensitivity", "separation_sensitivity",
]);
const BOOLEAN_FIELDS = new Set([
  "has_children", "has_other_animals", "is_neutered", "muzzle_required",
  "joint_pain", "heart_problems", "epilepsy", "overweight",
]);
const TEXT_FIELDS = new Set([
  "size", "activity_level", "environment",
  "allergies", "known_diseases", "physical_limitations",
  "vet_restrictions", "current_treatments", "health_notes",
]);
const ALLOWED_FIELDS = new Set([
  ...NUMERIC_FIELDS, ...LEVEL_1_5_FIELDS, ...BOOLEAN_FIELDS, ...TEXT_FIELDS,
]);

function coerceFieldValue(field: string, value: unknown): { ok: true; value: any } | { ok: false; error: string } {
  if (BOOLEAN_FIELDS.has(field)) {
    if (typeof value === "boolean") return { ok: true, value };
    if (value === "true" || value === 1) return { ok: true, value: true };
    if (value === "false" || value === 0) return { ok: true, value: false };
    return { ok: false, error: `Le champ ${field} attend un booléen` };
  }
  if (LEVEL_1_5_FIELDS.has(field)) {
    const n = Number(value);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 5) {
      return { ok: false, error: `Le champ ${field} attend un entier 1..5` };
    }
    return { ok: true, value: n };
  }
  if (NUMERIC_FIELDS.has(field)) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > 200) {
      return { ok: false, error: `Le champ ${field} attend un nombre raisonnable` };
    }
    return { ok: true, value: n };
  }
  if (TEXT_FIELDS.has(field)) {
    const s = String(value ?? "").trim().slice(0, 2000);
    if (!s) return { ok: false, error: `Le champ ${field} ne peut être vide` };
    return { ok: true, value: s };
  }
  return { ok: false, error: `Champ ${field} non autorisé` };
}

function todayStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const jwt = authHeader.slice(7);

    // Client RLS : toutes les écritures respectent les policies du user.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const { capture } = body as { capture?: any };

    if (!capture || typeof capture !== "object") {
      return new Response(JSON.stringify({ error: "Capture manquante" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { kind, dog_id, target_field, payload, summary } = capture;
    if (!dog_id || typeof dog_id !== "string") {
      return new Response(JSON.stringify({ error: "dog_id manquant" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Vérifier l'accès au chien (la RLS du SELECT fait office de garde).
    const { data: dog, error: dogErr } = await userClient
      .from("dogs")
      .select("id, name, user_id, health_notes")
      .eq("id", dog_id)
      .maybeSingle();

    if (dogErr || !dog) {
      return new Response(JSON.stringify({ error: "Chien introuvable ou inaccessible" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auditMeta = { source: "ai_chat_capture", summary: String(summary ?? "").slice(0, 200) };

    if (kind === "behavior_log") {
      const p = payload ?? {};
      const insertPayload: Record<string, any> = {
        dog_id,
        user_id: dog.user_id,
        day_id: 0,
        comments: String(p.summary ?? summary ?? "").slice(0, 1000),
      };
      if ([1, 2, 3, 4, 5].includes(Number(p.tension_level))) insertPayload.tension_level = Number(p.tension_level);
      if (["bon", "moyen", "faible"].includes(p.focus_quality)) insertPayload.focus_quality = p.focus_quality;
      if (["bonne", "moyenne", "difficile"].includes(p.leash_walk_quality)) insertPayload.leash_walk_quality = p.leash_walk_quality;

      const { data: inserted, error } = await userClient
        .from("behavior_logs")
        .insert(insertPayload)
        .select("id")
        .maybeSingle();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true, applied: { table: "behavior_logs", id: inserted?.id }, meta: auditMeta }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (kind === "health_note") {
      const text = String((payload?.text ?? summary ?? "")).trim().slice(0, 1000);
      if (!text) {
        return new Response(JSON.stringify({ error: "Texte vide" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const previous = dog.health_notes ? String(dog.health_notes).trim() : "";
      const stamped = `[${todayStamp()}] ${text}`;
      const merged = previous ? `${previous}\n${stamped}` : stamped;

      const { error } = await userClient
        .from("dogs")
        .update({ health_notes: merged.slice(0, 8000) })
        .eq("id", dog_id);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true, applied: { table: "dogs", id: dog_id, field: "health_notes" }, meta: auditMeta }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (kind === "dog_field_update") {
      if (!target_field || !ALLOWED_FIELDS.has(target_field)) {
        return new Response(JSON.stringify({ error: "Champ non autorisé" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const coerced = coerceFieldValue(target_field, payload?.value);
      if (!coerced.ok) {
        return new Response(JSON.stringify({ error: coerced.error }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await userClient
        .from("dogs")
        .update({ [target_field]: coerced.value })
        .eq("id", dog_id);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true, applied: { table: "dogs", id: dog_id, field: target_field }, meta: auditMeta }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (kind === "dog_problem") {
      const p = payload ?? {};
      const problem_key = String(p.problem_key ?? "").trim().slice(0, 80);
      if (!problem_key) {
        return new Response(JSON.stringify({ error: "problem_key manquant" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const row: Record<string, any> = {
        dog_id,
        user_id: dog.user_id,
        problem_key,
      };
      if ([1, 2, 3, 4, 5].includes(Number(p.intensity))) row.intensity = Number(p.intensity);
      if (["rarement", "parfois", "souvent", "toujours"].includes(p.frequency)) row.frequency = p.frequency;
      if (typeof p.comment === "string" && p.comment.trim()) row.comment = p.comment.trim().slice(0, 500);

      const { data: inserted, error } = await userClient
        .from("dog_problems")
        .upsert(row, { onConflict: "dog_id,problem_key" })
        .select("id")
        .maybeSingle();
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true, applied: { table: "dog_problems", id: inserted?.id }, meta: auditMeta }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (kind === "dog_objective") {
      const p = payload ?? {};
      const objective_key = String(p.objective_key ?? "").trim().slice(0, 80);
      if (!objective_key) {
        return new Response(JSON.stringify({ error: "objective_key manquant" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const row = {
        dog_id,
        user_id: dog.user_id,
        objective_key,
        is_priority: Boolean(p.is_priority),
      };
      const { data: inserted, error } = await userClient
        .from("dog_objectives")
        .upsert(row, { onConflict: "dog_id,objective_key" })
        .select("id")
        .maybeSingle();
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true, applied: { table: "dog_objectives", id: inserted?.id }, meta: auditMeta }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Type de capture inconnu" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[apply-chat-capture] error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
