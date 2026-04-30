// Enregistre / met à jour une PushSubscription pour l'utilisateur connecté
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: { user }, error: userErr } = await admin.auth.getUser(auth.replace("Bearer ", ""));
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any;
  try { body = await req.json(); }
  catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { action, subscription, platform } = body;

  if (action === "unsubscribe") {
    if (!subscription?.endpoint) {
      return new Response(JSON.stringify({ error: "missing endpoint" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    await admin.from("push_subscriptions")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .eq("endpoint", subscription.endpoint);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // subscribe / re-subscribe
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return new Response(JSON.stringify({ error: "invalid subscription" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ua = req.headers.get("user-agent") ?? "";
  const detectedPlatform = platform ?? (
    /iPhone|iPad|iPod/i.test(ua) ? "ios" :
    /Android/i.test(ua) ? "android" :
    "desktop"
  );

  const { error } = await admin.from("push_subscriptions").upsert({
    user_id: user.id,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    user_agent: ua.slice(0, 500),
    platform: detectedPlatform,
    is_active: true,
    failure_count: 0,
    last_success_at: null,
    last_failure_at: null,
  }, { onConflict: "endpoint" });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Crée prefs par défaut si absentes
  await admin.from("notification_preferences")
    .upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });

  return new Response(JSON.stringify({ ok: true, platform: detectedPlatform }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
