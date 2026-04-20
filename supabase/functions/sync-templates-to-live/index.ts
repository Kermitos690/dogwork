// One-shot admin function: seeds the curated template catalog (5 free + 30 pro)
// directly into the LIVE Supabase project using LIVE_SERVICE_ROLE_KEY.
// Idempotent: clears all existing is_template=true rows in Live first.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import templates from "./templates.json" with { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LIVE_URL = "https://hdmmqwpypvhwohhhaqnf.supabase.co";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth: require admin JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "missing auth" }, 401);
    const jwt = authHeader.replace("Bearer ", "");

    const sbCurrent = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: userData, error: userErr } = await sbCurrent.auth.getUser(jwt);
    if (userErr || !userData.user) return json({ error: "invalid token" }, 401);
    const { data: isAdmin } = await sbCurrent.rpc("is_admin");
    // We can't call is_admin with the user context via service role; check directly
    const { data: roles } = await sbCurrent.from("user_roles")
      .select("role").eq("user_id", userData.user.id);
    if (!roles?.some((r: any) => r.role === "admin")) {
      return json({ error: "admin required" }, 403);
    }

    const liveKey = Deno.env.get("LIVE_SERVICE_ROLE_KEY");
    if (!liveKey) return json({ error: "LIVE_SERVICE_ROLE_KEY missing" }, 500);

    const sbLive = createClient(LIVE_URL, liveKey);

    // Wipe existing templates in live
    const { error: delErr } = await sbLive.from("training_plans")
      .delete().eq("is_template", true);
    if (delErr) return json({ error: "delete failed: " + delErr.message }, 500);

    // Insert new templates (chunk by 10 for safety)
    const rows = (templates as any[]).map((t) => ({
      ...t,
      user_id: "00000000-0000-0000-0000-000000000000", // template owner placeholder
      is_active: false,
    }));

    let inserted = 0;
    for (let i = 0; i < rows.length; i += 10) {
      const chunk = rows.slice(i, i + 10);
      const { error } = await sbLive.from("training_plans").insert(chunk);
      if (error) return json({ error: `insert chunk ${i}: ${error.message}`, inserted }, 500);
      inserted += chunk.length;
    }

    return json({ ok: true, inserted });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
