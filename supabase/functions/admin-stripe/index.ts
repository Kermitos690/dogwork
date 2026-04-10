import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: any) => {
  console.log(`[ADMIN-STRIPE] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    // Auth check: must be admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: userData.user.id, _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Accès admin requis" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const body = await req.json();
    const { action } = body;
    log("Action requested", { action, adminId: userData.user.id });

    switch (action) {
      case "list_customers": {
        const customers = await stripe.customers.list({ limit: 50 });
        const { data: localCustomers } = await supabaseAdmin
          .from("stripe_customers").select("*");

        const localMap = new Map((localCustomers || []).map((c: any) => [c.stripe_customer_id, c]));

        const result = customers.data.map(c => ({
          id: c.id,
          email: c.email,
          name: c.name,
          created: c.created,
          local: localMap.get(c.id) || null,
          synced: localMap.has(c.id),
        }));

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "list_subscriptions": {
        const subs = await stripe.subscriptions.list({ limit: 50, status: "all" });
        const result = subs.data.map(s => ({
          id: s.id,
          customer: s.customer,
          status: s.status,
          current_period_end: new Date(s.current_period_end * 1000).toISOString(),
          cancel_at_period_end: s.cancel_at_period_end,
          product_id: s.items.data[0]?.price?.product,
          price_id: s.items.data[0]?.price?.id,
          amount: s.items.data[0]?.price?.unit_amount,
          currency: s.items.data[0]?.price?.currency,
          created: new Date(s.created * 1000).toISOString(),
        }));
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "list_payments": {
        const payments = await stripe.paymentIntents.list({ limit: 30 });
        const result = payments.data.map(p => ({
          id: p.id,
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          customer: p.customer,
          created: new Date(p.created * 1000).toISOString(),
          metadata: p.metadata,
        }));
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "list_refunds": {
        const refunds = await stripe.refunds.list({ limit: 30 });
        const result = refunds.data.map(r => ({
          id: r.id,
          amount: r.amount,
          currency: r.currency,
          status: r.status,
          reason: r.reason,
          payment_intent: r.payment_intent,
          created: new Date(r.created * 1000).toISOString(),
        }));
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "webhook_logs": {
        const { data: events } = await supabaseAdmin
          .from("billing_events")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        return new Response(JSON.stringify(events || []), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "compare_status": {
        const { data: localCustomers } = await supabaseAdmin
          .from("stripe_customers").select("*");

        const comparisons = [];
        for (const local of (localCustomers || [])) {
          try {
            const subs = await stripe.subscriptions.list({
              customer: local.stripe_customer_id, status: "active", limit: 1,
            });
            const stripeTier = subs.data.length > 0
              ? (() => {
                  const productId = subs.data[0].items.data[0]?.price?.product as string;
                  if (productId === "prod_U83inCbv8JMMgf") return "expert";
                  if (productId === "prod_U83i1wbeLdd3EI") return "pro";
                  return "starter";
                })()
              : "starter";

            comparisons.push({
              user_id: local.user_id,
              email: local.email,
              local_tier: local.current_tier,
              stripe_tier: stripeTier,
              synced: local.current_tier === stripeTier,
              stripe_status: subs.data[0]?.status || "none",
            });
          } catch (e) {
            comparisons.push({
              user_id: local.user_id, email: local.email,
              local_tier: local.current_tier, stripe_tier: "error",
              synced: false, error: (e as Error).message,
            });
          }
        }

        return new Response(JSON.stringify(comparisons), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "resync_user": {
        const { user_id } = body;
        if (!user_id) throw new Error("user_id requis");

        // Get user email
        const { data: userData2 } = await supabaseAdmin.auth.admin.getUserById(user_id);
        if (!userData2?.user?.email) throw new Error("Utilisateur non trouvé");

        const customers = await stripe.customers.list({ email: userData2.user.email, limit: 1 });
        if (customers.data.length === 0) {
          return new Response(JSON.stringify({ message: "Aucun client Stripe trouvé", tier: "starter" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const customerId = customers.data[0].id;

        // Ensure stripe_customers row
        await supabaseAdmin.from("stripe_customers").upsert({
          user_id, stripe_customer_id: customerId, email: userData2.user.email,
        }, { onConflict: "user_id" });

        // Sync full details
        const subs = await stripe.subscriptions.list({ customer: customerId, limit: 10 });
        let tier = "starter";
        let bestSub: any = null;
        for (const sub of subs.data) {
          if (sub.status !== "active" && sub.status !== "trialing") continue;
          for (const item of sub.items.data) {
            const pid = typeof item.price.product === "string" ? item.price.product : (item.price.product as any)?.id;
            if (pid === "prod_U83inCbv8JMMgf") { tier = "expert"; bestSub = sub; break; }
            if (pid === "prod_U83i1wbeLdd3EI" && tier !== "expert") { tier = "pro"; bestSub = sub; }
          }
          if (tier === "expert") break;
        }

        await supabaseAdmin.from("stripe_customers").update({
          current_tier: tier,
          subscription_status: bestSub?.status || "none",
          stripe_subscription_id: bestSub?.id || null,
          stripe_price_id: bestSub?.items?.data?.[0]?.price?.id || null,
          current_period_end: bestSub ? new Date(bestSub.current_period_end * 1000).toISOString() : null,
          cancel_at_period_end: bestSub?.cancel_at_period_end || false,
        }).eq("user_id", user_id);

        log("User resynced", { user_id, tier });
        return new Response(JSON.stringify({ message: "Utilisateur resynchronisé", tier }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "refund_payment": {
        const { payment_intent_id, amount } = body;
        if (!payment_intent_id) throw new Error("payment_intent_id requis");
        const refund = await stripe.refunds.create({
          payment_intent: payment_intent_id,
          ...(amount ? { amount } : {}),
        });
        log("Refund created", { refundId: refund.id, amount: refund.amount });
        return new Response(JSON.stringify({ id: refund.id, status: refund.status, amount: refund.amount }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "cancel_subscription": {
        const { subscription_id } = body;
        if (!subscription_id) throw new Error("subscription_id requis");
        const canceled = await stripe.subscriptions.cancel(subscription_id);
        log("Subscription canceled", { subId: canceled.id });
        return new Response(JSON.stringify({ id: canceled.id, status: canceled.status }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Action inconnue: ${action}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});