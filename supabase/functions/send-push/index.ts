// Edge function : envoi de notifications Web Push via VAPID
// Appelée par d'autres functions (ex: notify-message, cron rappels) ou par admin/system.
// Sécurité : nécessite soit un JWT admin, soit l'header X-Internal-Secret = SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = "BM7n5azCYAmdSkiD9ehd93CAqyIgwyG4efqR9HaB490y-hkg3Sri-v2HyW5FNUFY7K-hqQ5Osbpfi2b9Nb5OSBU";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:contact@dogwork-at-home.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

interface PushPayload {
  user_id: string;
  category: "exercises" | "messages" | "shelter" | "billing" | "system";
  title: string;
  body?: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  dedup_key?: string;
  data?: Record<string, unknown>;
}

async function isAuthorized(req: Request, admin: ReturnType<typeof createClient>) {
  // 1. Internal secret (cron, autres edge functions)
  const internal = req.headers.get("x-internal-secret");
  if (internal && internal === SERVICE_ROLE) return true;

  // 2. JWT admin
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const jwt = auth.replace("Bearer ", "");
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) return false;
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  return !!roles;
}

function inQuietHours(now: Date, tz: string, start?: string | null, end?: string | null): boolean {
  if (!start || !end) return false;
  try {
    const local = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now); // "HH:MM"
    const [h, m] = local.split(":").map(Number);
    const cur = h * 60 + m;
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const s = sh * 60 + sm;
    const e = eh * 60 + em;
    return s <= e ? cur >= s && cur < e : cur >= s || cur < e; // wraps midnight
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  if (!(await isAuthorized(req, admin))) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: PushPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { user_id, category, title } = payload;
  if (!user_id || !category || !title) {
    return new Response(JSON.stringify({ error: "missing user_id/category/title" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Dédup
  if (payload.dedup_key) {
    const { data: existing } = await admin
      .from("notification_logs")
      .select("id")
      .eq("user_id", user_id)
      .eq("dedup_key", payload.dedup_key)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ skipped: "already_sent", log_id: existing.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Préférences user
  const { data: prefs } = await admin
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user_id)
    .maybeSingle();

  if (prefs) {
    const enabledKey = `${category}_enabled` as keyof typeof prefs;
    if (prefs[enabledKey] === false) {
      await admin.from("notification_logs").insert({
        user_id, category, title, body: payload.body, url: payload.url,
        payload: payload.data ?? null, dedup_key: payload.dedup_key ?? null,
        status: "skipped", error: "user_disabled_category",
      });
      return new Response(JSON.stringify({ skipped: "user_disabled_category" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (inQuietHours(new Date(), prefs.timezone || "Europe/Zurich", prefs.quiet_hours_start, prefs.quiet_hours_end)) {
      await admin.from("notification_logs").insert({
        user_id, category, title, body: payload.body, url: payload.url,
        payload: payload.data ?? null, dedup_key: payload.dedup_key ?? null,
        status: "skipped", error: "quiet_hours",
      });
      return new Response(JSON.stringify({ skipped: "quiet_hours" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Subscriptions actives
  const { data: subs, error: subsErr } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", user_id)
    .eq("is_active", true);

  if (subsErr) {
    return new Response(JSON.stringify({ error: subsErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!subs || subs.length === 0) {
    const { data: log } = await admin.from("notification_logs").insert({
      user_id, category, title, body: payload.body, url: payload.url,
      payload: payload.data ?? null, dedup_key: payload.dedup_key ?? null,
      status: "skipped", error: "no_active_subscriptions",
    }).select("id").single();
    return new Response(JSON.stringify({ skipped: "no_active_subscriptions", log_id: log?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const notifPayload = JSON.stringify({
    title,
    body: payload.body ?? "",
    url: payload.url ?? "/",
    icon: payload.icon ?? "/icons/icon-192.png",
    badge: payload.badge ?? "/icons/badge-72.png",
    tag: payload.tag ?? category,
    category,
    data: payload.data ?? {},
  });

  let succeeded = 0;
  let failed = 0;
  const errors: string[] = [];

  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        notifPayload,
        { TTL: 60 * 60 * 24, urgency: category === "messages" ? "high" : "normal" },
      );
      succeeded++;
      await admin.from("push_subscriptions")
        .update({ last_success_at: new Date().toISOString(), failure_count: 0 })
        .eq("id", sub.id);
    } catch (e: any) {
      failed++;
      const status = e?.statusCode ?? 0;
      errors.push(`${status}: ${e?.body ?? e?.message ?? "unknown"}`);
      // 404/410 = subscription morte → désactiver
      if (status === 404 || status === 410) {
        await admin.from("push_subscriptions")
          .update({ is_active: false, last_failure_at: new Date().toISOString() })
          .eq("id", sub.id);
      } else {
        await admin.from("push_subscriptions")
          .update({ last_failure_at: new Date().toISOString(), failure_count: (sub as any).failure_count + 1 })
          .eq("id", sub.id);
      }
    }
  }));

  const status = failed === 0 ? "sent" : succeeded === 0 ? "failed" : "partial";
  const { data: log } = await admin.from("notification_logs").insert({
    user_id, category, title, body: payload.body, url: payload.url,
    payload: payload.data ?? null, dedup_key: payload.dedup_key ?? null,
    status, endpoints_total: subs.length, endpoints_succeeded: succeeded, endpoints_failed: failed,
    error: errors.length ? errors.slice(0, 5).join(" | ") : null,
  }).select("id").single();

  return new Response(JSON.stringify({ status, succeeded, failed, total: subs.length, log_id: log?.id }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
