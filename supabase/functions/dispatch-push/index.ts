// Dispatch push générique : 1 user OU broadcast vers tous les users d'un rôle.
// Appelé par triggers DB via pg_net. Filtre selon notification_preferences (catégorie + quiet hours).
// Délègue l'envoi physique à send-push.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

type Category =
  | "messages"
  | "plans"
  | "appointments"
  | "adoption"
  | "billing"
  | "shelter"
  | "support"
  | "admin_alerts";

interface Payload {
  user_id?: string;             // cible unique
  broadcast_role?: "admin" | "educator" | "shelter" | "shelter_employee" | "owner"; // OU diffusion
  category: Category;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  dedup_key?: string;
  data?: Record<string, unknown>;
}

const CATEGORY_TO_PREF: Record<Category, string | null> = {
  messages: "messages_enabled",
  plans: "plans_enabled",
  appointments: "appointments_enabled",
  adoption: "shelter_enabled",
  billing: "billing_enabled",
  shelter: "shelter_enabled",
  support: "support_enabled",
  admin_alerts: "admin_alerts_enabled",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.headers.get("x-internal-secret") !== SERVICE_ROLE) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: Payload;
  try { payload = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "bad json" }), { status: 400, headers: corsHeaders });
  }
  const { user_id, broadcast_role, category, title, body, url, tag, dedup_key, data } = payload;
  if (!category || !title || (!user_id && !broadcast_role)) {
    return new Response(JSON.stringify({ error: "missing fields" }), { status: 400, headers: corsHeaders });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  // Résoudre la liste des destinataires
  let recipients: string[] = [];
  if (user_id) {
    recipients = [user_id];
  } else if (broadcast_role) {
    const { data: rows } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("role", broadcast_role);
    recipients = (rows ?? []).map((r: any) => r.user_id);
  }
  if (recipients.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no recipients" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Filtre par préférence catégorie
  const prefCol = CATEGORY_TO_PREF[category];
  let allowed: string[] = recipients;
  if (prefCol) {
    const { data: prefs } = await admin
      .from("notification_preferences")
      .select(`user_id, ${prefCol}`)
      .in("user_id", recipients);
    const prefMap = new Map<string, boolean>();
    (prefs ?? []).forEach((p: any) => prefMap.set(p.user_id, p[prefCol] !== false));
    // user sans préférence = défaut activé
    allowed = recipients.filter((u) => prefMap.get(u) !== false);
  }

  let sent = 0;
  const errors: string[] = [];
  for (const uid of allowed) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": SERVICE_ROLE,
        },
        body: JSON.stringify({
          user_id: uid,
          category,
          title,
          body,
          url: url ?? "/",
          tag: tag ?? category,
          dedup_key,
          data,
        }),
      });
      if (res.ok) sent++;
      else errors.push(`${uid}: ${res.status}`);
    } catch (e: any) {
      errors.push(`${uid}: ${e?.message ?? "err"}`);
    }
  }

  return new Response(JSON.stringify({ ok: true, sent, total: allowed.length, errors }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
