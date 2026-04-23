import { createClient } from "npm:@supabase/supabase-js@2.57.2";

/**
 * Monthly credit grant — idempotent cron job.
 *
 * Auth (one of):
 *   - Header `x-cron-secret: <CRON_SECRET>`  (used by pg_cron)
 *   - Header `Authorization: Bearer <admin user JWT>`  (manual admin trigger)
 *
 * Idempotency: structured `metadata.period_key` (YYYY-MM) on the ledger,
 * queried via JSONB containment (@>). Safe to run daily.
 *
 * Tracing: each invocation writes one row to `public.cron_run_logs`.
 */
Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  };

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const cronSecret = Deno.env.get("CRON_SECRET");
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // ---------- Auth gate ----------
  const providedSecret = req.headers.get("x-cron-secret");
  let authorized = false;
  let authMode: "cron_secret" | "admin_jwt" | "none" = "none";

  if (cronSecret && providedSecret && providedSecret === cronSecret) {
    authorized = true;
    authMode = "cron_secret";
  } else {
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: userData } = await userClient.auth.getUser();
        if (userData?.user) {
          const { data: roles } = await admin
            .from("user_roles")
            .select("role")
            .eq("user_id", userData.user.id);
          if (roles?.some((r: { role: string }) => r.role === "admin")) {
            authorized = true;
            authMode = "admin_jwt";
          }
        }
      } catch (_e) { /* fall through */ }
    }
  }

  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ---------- Open run log ----------
  const now = new Date();
  const periodKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  const { data: runRow } = await admin
    .from("cron_run_logs")
    .insert({
      job_name: "monthly-credit-grant",
      status: "running",
      period_key: periodKey,
      details: { auth_mode: authMode, source: req.headers.get("user-agent") || "unknown" },
    })
    .select("id")
    .single();
  const runId = runRow?.id as string | undefined;

  const finalize = async (
    status: "success" | "partial" | "error",
    payload: Record<string, unknown>,
  ) => {
    if (!runId) return;
    await admin
      .from("cron_run_logs")
      .update({
        finished_at: new Date().toISOString(),
        status,
        eligible_count: (payload.eligible as number) ?? 0,
        credited_count: (payload.granted as number) ?? 0,
        skipped_count: (payload.skipped as number) ?? 0,
        error_count: Array.isArray(payload.errors) ? (payload.errors as unknown[]).length : 0,
        details: payload,
      })
      .eq("id", runId);
  };

  try {
    // 1. Quotas
    const { data: quotas, error: quotaErr } = await admin
      .from("ai_plan_quotas")
      .select("*")
      .gt("monthly_credits", 0);

    if (quotaErr) throw quotaErr;
    if (!quotas?.length) {
      const result = { message: "Aucun quota configuré", period: periodKey, eligible: 0, granted: 0, skipped: 0 };
      await finalize("success", result);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const quotaMap = new Map<string, number>();
    for (const q of quotas) quotaMap.set(q.plan_slug, q.monthly_credits);

    // 2. Eligible users
    const { data: customers, error: custErr } = await admin
      .from("stripe_customers")
      .select("user_id, current_tier")
      .in("current_tier", Array.from(quotaMap.keys()));
    if (custErr) throw custErr;

    const { data: adminSubs } = await admin
      .from("admin_subscriptions")
      .select("user_id, tier")
      .eq("is_active", true);

    const userTiers = new Map<string, string>();
    for (const c of customers || []) userTiers.set(c.user_id, c.current_tier);
    for (const a of adminSubs || []) {
      if (quotaMap.has(a.tier)) userTiers.set(a.user_id, a.tier); // admin override wins
    }

    if (userTiers.size === 0) {
      const result = { message: "Aucun utilisateur éligible", period: periodKey, eligible: 0, granted: 0, skipped: 0 };
      await finalize("success", result);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Idempotency check (period_key in metadata)
    const userIds = Array.from(userTiers.keys());
    const { data: existingGrants } = await admin
      .from("ai_credit_ledger")
      .select("user_id")
      .eq("operation_type", "monthly_grant")
      .in("user_id", userIds)
      .contains("metadata", { period_key: periodKey });

    const alreadyGranted = new Set<string>();
    for (const g of existingGrants || []) alreadyGranted.add(g.user_id);

    // 4. Grant credits
    let granted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const [uid, tier] of userTiers) {
      if (alreadyGranted.has(uid)) { skipped++; continue; }
      const credits = quotaMap.get(tier);
      if (!credits) continue;

      try {
        await admin.rpc("credit_ai_wallet", {
          _user_id: uid,
          _credits: credits,
          _operation_type: "monthly_grant",
          _description: `Attribution mensuelle ${periodKey} — plan ${tier} (${credits} crédits)`,
          _metadata: { period_key: periodKey, plan_slug: tier },
        });
        granted++;
      } catch (err: any) {
        errors.push(`${uid}: ${err.message}`);
      }
    }

    const result = {
      period: periodKey,
      eligible: userTiers.size,
      granted,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    };

    await finalize(errors.length === 0 ? "success" : "partial", result);
    console.log("Monthly credit grant result:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("monthly-credit-grant error:", err);
    await finalize("error", { error: err.message, period: periodKey });
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
