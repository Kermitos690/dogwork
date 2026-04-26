// Admin-only. Aggregates go-live readiness signals on the CURRENT environment
// (Test in preview, Live in production). Returns a single JSON snapshot.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const c = (q: any) => q.then((r: any) => r.count ?? 0);

    const [
      profilesCount,
      exercisesCount,
      plansActive,
      packsActive,
      modulesCount,
      coachStripeCount,
      coachOnboardedCount,
      billingEventsCount,
      coursesActiveCount,
    ] = await Promise.all([
      c(admin.from("profiles").select("user_id", { count: "exact", head: true })),
      c(admin.from("exercises").select("id", { count: "exact", head: true })),
      c(admin.from("subscription_plans").select("id", { count: "exact", head: true }).eq("is_active", true)),
      c(admin.from("ai_credit_packs").select("id", { count: "exact", head: true }).eq("is_active", true)),
      c(admin.from("modules").select("slug", { count: "exact", head: true })),
      c(admin.from("coach_stripe_data").select("user_id", { count: "exact", head: true })),
      c(admin.from("coach_stripe_data").select("user_id", { count: "exact", head: true }).eq("stripe_onboarding_complete", true)),
      c(admin.from("billing_events").select("id", { count: "exact", head: true })),
      c(admin.from("courses").select("id", { count: "exact", head: true }).eq("is_active", true)),
    ]);

    // Auth users count (paginated)
    let authUsers = 0;
    try {
      const { data: page1 } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      authUsers = page1?.users?.length ?? 0;
    } catch { /* ignore */ }

    const { data: lastBillingEvents } = await admin
      .from("billing_events")
      .select("id, stripe_event_id, event_type, processing_status, processing_error, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    const { data: activeCourses } = await admin
      .from("courses")
      .select("id, title, is_active, is_public, approval_status, educator_user_id, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(10);

    // Heuristic: titles that look like placeholders
    const placeholderActive = (activeCourses ?? []).filter((c: any) => {
      const t = (c.title ?? "").trim();
      if (!t || t.length > 14 || t.includes(" ")) return false;
      if (/^[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'-]{2,}$/.test(t)) return false;
      return true;
    });

    const env = Deno.env.get("ENVIRONMENT") ?? "unknown";
    const projectRef = (Deno.env.get("SUPABASE_URL") ?? "").match(/https?:\/\/([^.]+)\./)?.[1] ?? null;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
    const stripeMode = stripeKey.startsWith("sk_live_") ? "live"
      : stripeKey.startsWith("rk_live_") ? "live"
      : stripeKey.startsWith("sk_test_") ? "test"
      : stripeKey.startsWith("rk_test_") ? "test"
      : "unknown";
    const stripeConnectSecretConfigured = !!Deno.env.get("STRIPE_CONNECT_WEBHOOK_SECRET");
    const stripeWebhookSecretConfigured = !!Deno.env.get("STRIPE_WEBHOOK_SECRET");

    const checks = {
      modules_ok: modulesCount >= 15,
      no_placeholder_courses: placeholderActive.length === 0,
      stripe_live_key: stripeMode === "live",
      stripe_webhook_secret: stripeWebhookSecretConfigured,
      stripe_connect_webhook_secret: stripeConnectSecretConfigured,
      has_any_coach_onboarded: coachOnboardedCount > 0,
      has_any_billing_event: billingEventsCount > 0,
    };
    const ready = Object.values(checks).every(Boolean);

    return new Response(JSON.stringify({
      generated_at: new Date().toISOString(),
      environment: env,
      project_ref: projectRef,
      stripe_mode: stripeMode,
      counts: {
        auth_users: authUsers,
        profiles: profilesCount,
        exercises: exercisesCount,
        subscription_plans_active: plansActive,
        ai_credit_packs_active: packsActive,
        modules: modulesCount,
        coach_stripe_data: coachStripeCount,
        coach_onboarding_complete: coachOnboardedCount,
        billing_events: billingEventsCount,
        courses_active: coursesActiveCount,
      },
      last_billing_events: lastBillingEvents ?? [],
      active_courses: activeCourses ?? [],
      placeholder_courses_active: placeholderActive,
      checks,
      ready,
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
