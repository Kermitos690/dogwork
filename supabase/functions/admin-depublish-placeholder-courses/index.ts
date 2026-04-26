// Admin-only. Marks "placeholder/test" courses as inactive in current env.
// Heuristic safe: short title (<=14 chars), no spaces, not a normal capitalized word,
// OR explicit list passed in body. NEVER deletes data.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (s: string, d?: unknown) =>
  console.log(`[ADMIN-DEPUBLISH-PLACEHOLDER] ${s}${d ? ` - ${JSON.stringify(d)}` : ""}`);

function looksLikePlaceholder(title: string): boolean {
  if (!title) return false;
  const t = title.trim();
  if (t.length === 0 || t.length > 14) return false;
  if (t.includes(" ")) return false;
  // exclude clean capitalized words like "Promenade"
  if (/^[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'-]{2,}$/.test(t)) return false;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: roleRow } = await admin
      .from("user_roles").select("role")
      .eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: { course_ids?: string[]; dry_run?: boolean } = {};
    try { body = await req.json(); } catch { /* empty body ok */ }
    const dryRun = body.dry_run === true;

    const { data: candidates, error: qErr } = await admin
      .from("courses")
      .select("id, title, is_active, is_public, educator_user_id, created_at")
      .eq("is_active", true);
    if (qErr) throw qErr;

    const idsExplicit = new Set(body.course_ids ?? []);
    const targets = (candidates ?? []).filter((c: any) =>
      idsExplicit.has(c.id) || looksLikePlaceholder(c.title),
    );

    log("Targets identified", { count: targets.length, dryRun, titles: targets.map((t: any) => t.title) });

    if (dryRun || targets.length === 0) {
      return new Response(
        JSON.stringify({ success: true, dry_run: dryRun, would_depublish: targets }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error: uErr } = await admin
      .from("courses")
      .update({ is_active: false, is_public: false, updated_at: new Date().toISOString() })
      .in("id", targets.map((t: any) => t.id));
    if (uErr) throw uErr;

    log("Depublished", { ids: targets.map((t: any) => t.id) });
    return new Response(
      JSON.stringify({ success: true, depublished: targets }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
