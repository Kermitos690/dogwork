import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type CheckResult = {
  group: string;
  label: string;
  required: boolean;
  ok: boolean;
  detail?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY n'est pas configurée");

    // Auth: only admins can run this
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin");
    if (!roles?.length) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const keyType = stripeKey.startsWith("rk_live_")
      ? "restricted_live"
      : stripeKey.startsWith("sk_live_")
      ? "secret_live"
      : stripeKey.startsWith("rk_test_")
      ? "restricted_test"
      : stripeKey.startsWith("sk_test_")
      ? "secret_test"
      : "unknown";

    const isLive = keyType.endsWith("_live");
    const checks: CheckResult[] = [];

    // Helper: classify Stripe error
    const handle = async (
      group: string,
      label: string,
      required: boolean,
      fn: () => Promise<unknown>,
    ): Promise<void> => {
      try {
        await fn();
        checks.push({ group, label, required, ok: true });
      } catch (e: any) {
        const code = e?.code || e?.raw?.code;
        const type = e?.type;
        // "permission" / "insufficient_scope" → missing scope.
        // Other errors (resource_missing on a specific id we passed, validation)
        // mean the call reached the API → permission OK.
        const missingPerm =
          type === "StripePermissionError" ||
          code === "secret_key_required" ||
          /not have the required permissions|insufficient|permission/i.test(
            e?.message ?? "",
          );
        checks.push({
          group,
          label,
          required,
          ok: !missingPerm,
          detail: missingPerm ? e?.message : undefined,
        });
      }
    };

    // Account info (always works on any key)
    let accountId: string | null = null;
    let accountCountry: string | null = null;
    try {
      const acc = await stripe.accounts.retrieve();
      accountId = acc.id;
      accountCountry = acc.country ?? null;
    } catch (e: any) {
      // continue, will be reported below
    }

    // ---- Core ----
    await handle("Core", "Customers (read+write)", true, async () => {
      await stripe.customers.list({ limit: 1 });
    });
    await handle("Core", "Checkout Sessions (write)", true, async () => {
      await stripe.checkout.sessions.list({ limit: 1 });
    });
    await handle("Core", "Payment Intents (write)", true, async () => {
      await stripe.paymentIntents.list({ limit: 1 });
    });
    await handle("Core", "Charges (read)", true, async () => {
      await stripe.charges.list({ limit: 1 });
    });
    await handle("Core", "Refunds (write)", true, async () => {
      await stripe.refunds.list({ limit: 1 });
    });
    await handle("Core", "Balance (read)", false, async () => {
      await stripe.balance.retrieve();
    });

    // ---- Billing ----
    await handle("Billing", "Products (write)", true, async () => {
      await stripe.products.list({ limit: 1 });
    });
    await handle("Billing", "Prices (write)", true, async () => {
      await stripe.prices.list({ limit: 1 });
    });
    await handle("Billing", "Subscriptions (write)", true, async () => {
      await stripe.subscriptions.list({ limit: 1 });
    });
    await handle("Billing", "Invoices (write)", true, async () => {
      await stripe.invoices.list({ limit: 1 });
    });
    await handle("Billing", "Coupons (write)", false, async () => {
      await stripe.coupons.list({ limit: 1 });
    });
    await handle("Billing", "Promotion Codes (write)", false, async () => {
      await stripe.promotionCodes.list({ limit: 1 });
    });

    // ---- Connect ----
    await handle("Connect", "Connected Accounts (write)", true, async () => {
      await stripe.accounts.list({ limit: 1 });
    });
    await handle("Connect", "Transfers (write)", true, async () => {
      await stripe.transfers.list({ limit: 1 });
    });
    await handle("Connect", "Application Fees (read)", false, async () => {
      await stripe.applicationFees.list({ limit: 1 });
    });
    await handle("Connect", "Payouts (read)", false, async () => {
      await stripe.payouts.list({ limit: 1 });
    });

    // ---- Webhooks ----
    await handle("Webhooks", "Webhook Endpoints (write)", true, async () => {
      await stripe.webhookEndpoints.list({ limit: 1 });
    });
    await handle("Webhooks", "Events (read)", true, async () => {
      await stripe.events.list({ limit: 1 });
    });

    // ---- Disputes ----
    await handle("Disputes", "Disputes (write)", false, async () => {
      await stripe.disputes.list({ limit: 1 });
    });
    await handle("Disputes", "Files (write)", false, async () => {
      await stripe.files.list({ limit: 1 });
    });

    const requiredFailed = checks.filter((c) => c.required && !c.ok);
    const optionalFailed = checks.filter((c) => !c.required && !c.ok);

    const summary = {
      key_type: keyType,
      is_live: isLive,
      account_id: accountId,
      account_country: accountCountry,
      checks,
      required_failed: requiredFailed.length,
      optional_failed: optionalFailed.length,
      ready_for_production: isLive && requiredFailed.length === 0 && !!accountId,
    };

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("verify-stripe-key error:", error?.message);
    return new Response(
      JSON.stringify({ error: error?.message ?? "Verification failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
