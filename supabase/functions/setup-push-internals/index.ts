// One-shot setup : injecte la vraie SUPABASE_SERVICE_ROLE_KEY (auto-fournie par le runtime)
// dans app_internal_settings, pour que le trigger messages puisse appeler send-push.
// Réservé aux admins.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { data: { user } } = await admin.auth.getUser(auth.replace("Bearer ", ""));
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: role } = await admin.from("user_roles")
    .select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (!role) {
    return new Response(JSON.stringify({ error: "admin_only" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rows = [
    { key: "supabase_url", value: SUPABASE_URL },
    { key: "service_role_key", value: SERVICE_ROLE },
  ];
  const { error } = await admin.from("app_internal_settings").upsert(rows, { onConflict: "key" });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, configured: rows.map(r => r.key) }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
