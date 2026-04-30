// Notifie le destinataire d'un nouveau message.
// Appelée par trigger DB (pg_net) avec X-Internal-Secret.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.headers.get("x-internal-secret") !== SERVICE_ROLE) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { message_id, sender_id, recipient_id, content } = await req.json();
  if (!message_id || !recipient_id) {
    return new Response(JSON.stringify({ error: "missing fields" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  // Récup nom de l'expéditeur (best effort)
  let senderName = "Quelqu'un";
  if (sender_id) {
    const { data: prof } = await admin
      .from("profiles")
      .select("display_name, first_name, last_name, email")
      .eq("id", sender_id)
      .maybeSingle();
    if (prof) {
      senderName = prof.display_name
        || [prof.first_name, prof.last_name].filter(Boolean).join(" ")
        || prof.email
        || "Quelqu'un";
    }
  }

  const preview = (content ?? "").toString().slice(0, 120);

  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": SERVICE_ROLE,
    },
    body: JSON.stringify({
      user_id: recipient_id,
      category: "messages",
      title: `Nouveau message — ${senderName}`,
      body: preview,
      url: "/messages",
      tag: `msg-${sender_id}`,
      dedup_key: `msg-${message_id}`,
      data: { message_id, sender_id },
    }),
  });

  const result = await res.json();
  return new Response(JSON.stringify(result), {
    status: res.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
