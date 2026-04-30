// Cron : appelée toutes les 15 min, envoie les rappels exercices aux users
// dont l'heure préférée correspond à l'heure courante (selon leur timezone).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const internal = req.headers.get("x-internal-secret");
  const cronHeader = req.headers.get("x-cron-secret");
  const ok = (internal && internal === SERVICE_ROLE) || (CRON_SECRET && cronHeader === CRON_SECRET);
  if (!ok) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  const { data: prefs, error } = await admin
    .from("notification_preferences")
    .select("user_id, exercises_time, timezone")
    .eq("exercises_enabled", true);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  let queued = 0;

  for (const p of prefs ?? []) {
    try {
      const local = new Intl.DateTimeFormat("en-GB", {
        timeZone: p.timezone || "Europe/Zurich",
        hour: "2-digit", minute: "2-digit", hour12: false,
      }).format(now); // "HH:MM"
      const [lh, lm] = local.split(":").map(Number);
      const [ph, pm] = (p.exercises_time as string).slice(0, 5).split(":").map(Number);
      // Match si dans la fenêtre ±15 min
      const diff = Math.abs((lh * 60 + lm) - (ph * 60 + pm));
      if (diff > 15 && diff < (24 * 60 - 15)) continue;

      await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-secret": SERVICE_ROLE },
        body: JSON.stringify({
          user_id: p.user_id,
          category: "exercises",
          title: "C'est l'heure de l'entraînement 🐶",
          body: "Votre chien vous attend pour la séance du jour.",
          url: "/plan",
          tag: "exercise-reminder",
          dedup_key: `exercise-${p.user_id}-${today}`,
        }),
      });
      queued++;
    } catch (_) { /* best effort */ }
  }

  return new Response(JSON.stringify({ ok: true, candidates: prefs?.length ?? 0, queued }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
