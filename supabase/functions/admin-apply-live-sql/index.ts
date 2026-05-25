import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LIVE_PROJECT_REF = "hdmmqwpypvhwohhhaqnf";
const RATE_LIMIT_PER_HOUR = 10;

interface Body {
  sql?: unknown;
  dryRun?: unknown;
}

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResp({ error: "method_not_allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const MGMT_PAT = Deno.env.get("LIVE_MANAGEMENT_PAT");

    if (!MGMT_PAT) {
      return jsonResp({ error: "missing_management_pat", hint: "Configure LIVE_MANAGEMENT_PAT secret." }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResp({ error: "unauthorized" }, 401);
    const jwt = authHeader.replace("Bearer ", "");

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(jwt);
    if (userErr || !userData.user) return jsonResp({ error: "unauthorized" }, 401);
    const user = userData.user;

    // Check admin role
    const { data: roleRows } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .limit(1);
    if (!roleRows || roleRows.length === 0) {
      return jsonResp({ error: "forbidden_admin_only" }, 403);
    }

    // Parse body
    let body: Body;
    try {
      body = await req.json();
    } catch {
      return jsonResp({ error: "invalid_json" }, 400);
    }
    const sql = typeof body.sql === "string" ? body.sql.trim() : "";
    const dryRun = Boolean(body.dryRun);

    if (!sql || sql.length < 4) return jsonResp({ error: "sql_required" }, 400);
    if (sql.length > 100_000) return jsonResp({ error: "sql_too_large" }, 400);

    // Soft block on reserved schemas
    const reserved = /\b(auth|storage|realtime|supabase_functions|vault)\.[A-Za-z_]/i;
    if (reserved.test(sql)) {
      return jsonResp({
        error: "reserved_schema_blocked",
        detail: "Modifier auth/storage/realtime/supabase_functions/vault est interdit.",
      }, 400);
    }

    // Rate limit: count recent admin.live_sql events in last hour for this user
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabaseAdmin
      .from("billing_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "admin.live_sql")
      .gte("created_at", hourAgo)
      .filter("metadata->>actor_id", "eq", user.id);

    if ((recentCount ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return jsonResp({ error: "rate_limited", limit_per_hour: RATE_LIMIT_PER_HOUR }, 429);
    }

    // Build the final query
    let finalQuery = sql;
    if (dryRun) {
      // Wrap in transaction + rollback. Note: Management API runs each request in its own session.
      finalQuery = `BEGIN;\n${sql.replace(/;\s*$/, "")};\nROLLBACK;`;
    }

    const eventId = `live_sql_${user.id}_${Date.now()}`;

    // Audit pre
    await supabaseAdmin.from("billing_events").insert({
      stripe_event_id: eventId,
      event_type: "admin.live_sql",
      processing_status: "pending",
      metadata: {
        actor_id: user.id,
        actor_email: user.email ?? null,
        dry_run: dryRun,
        sql_length: sql.length,
        sql_preview: sql.slice(0, 500),
      },
    });

    // Call Supabase Management API
    const mgmtResp = await fetch(
      `https://api.supabase.com/v1/projects/${LIVE_PROJECT_REF}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MGMT_PAT}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: finalQuery }),
      },
    );

    const mgmtText = await mgmtResp.text();
    let mgmtJson: unknown = null;
    try { mgmtJson = JSON.parse(mgmtText); } catch { /* keep text */ }

    const success = mgmtResp.ok;

    // Audit post
    await supabaseAdmin.from("billing_events").insert({
      stripe_event_id: `${eventId}_result`,
      event_type: "admin.live_sql",
      processing_status: success ? "completed" : "failed",
      processing_error: success ? null : `HTTP ${mgmtResp.status}: ${mgmtText.slice(0, 500)}`,
      metadata: {
        actor_id: user.id,
        dry_run: dryRun,
        http_status: mgmtResp.status,
        result_preview: typeof mgmtJson === "object"
          ? JSON.stringify(mgmtJson).slice(0, 1000)
          : mgmtText.slice(0, 1000),
      },
    });

    return jsonResp({
      success,
      dryRun,
      httpStatus: mgmtResp.status,
      result: mgmtJson ?? mgmtText,
    }, success ? 200 : 400);
  } catch (e) {
    return jsonResp({ error: "internal_error", detail: (e as Error).message }, 500);
  }
});
