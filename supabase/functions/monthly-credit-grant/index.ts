import { createClient } from "npm:@supabase/supabase-js@2.57.2";

/**
 * Monthly credit grant — idempotent cron job.
 * 
 * Idempotency: uses structured `metadata.period_key` (YYYY-MM) in the ledger,
 * queried via JSONB containment (@>) — no fragile LIKE on description.
 */
Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    const now = new Date();
    const periodKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    // 1. Load quotas with monthly_credits > 0
    const { data: quotas, error: quotaErr } = await admin
      .from("ai_plan_quotas")
      .select("*")
      .gt("monthly_credits", 0);

    if (quotaErr) throw quotaErr;
    if (!quotas?.length) {
      return new Response(JSON.stringify({ message: "Aucun quota configuré", period: periodKey }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const quotaMap = new Map<string, number>();
    for (const q of quotas) {
      quotaMap.set(q.plan_slug, q.monthly_credits);
    }

    // 2. Get all eligible users (stripe_customers + admin_subscriptions)
    const { data: customers, error: custErr } = await admin
      .from("stripe_customers")
      .select("user_id, current_tier")
      .in("current_tier", Array.from(quotaMap.keys()));

    if (custErr) throw custErr;

    const { data: adminSubs } = await admin
      .from("admin_subscriptions")
      .select("user_id, tier")
      .eq("is_active", true);

    // Merge — admin overrides take priority
    const userTiers = new Map<string, string>();
    for (const c of customers || []) {
      userTiers.set(c.user_id, c.current_tier);
    }
    for (const a of adminSubs || []) {
      if (quotaMap.has(a.tier)) {
        userTiers.set(a.user_id, a.tier);
      }
    }

    if (userTiers.size === 0) {
      return new Response(JSON.stringify({ message: "Aucun utilisateur éligible", period: periodKey }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Idempotency check via metadata JSONB containment
    // Uses RPC raw query to check metadata->>'period_key' = periodKey
    const userIds = Array.from(userTiers.keys());
    const { data: existingGrants } = await admin
      .from("ai_credit_ledger")
      .select("user_id")
      .eq("operation_type", "monthly_grant")
      .in("user_id", userIds)
      .contains("metadata", { period_key: periodKey });

    const alreadyGranted = new Set<string>();
    for (const g of existingGrants || []) {
      alreadyGranted.add(g.user_id);
    }

    // 4. Grant credits
    let granted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const [uid, tier] of userTiers) {
      if (alreadyGranted.has(uid)) {
        skipped++;
        continue;
      }

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

    console.log("Monthly credit grant result:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("monthly-credit-grant error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
