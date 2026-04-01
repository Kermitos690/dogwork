import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${d}`);
};

// Tier → product/price mapping for admin overrides
const TIER_MAP: Record<string, { product_id: string; price_id: string }> = {
  pro: { product_id: "prod_U83i1wbeLdd3EI", price_id: "price_1T9nakPshPrEibTgfEAogTJY" },
  expert: { product_id: "prod_U83inCbv8JMMgf", price_id: "price_1T9nbAPshPrEibTgo3JA1m5S" },
  educator: { product_id: "prod_U8CxlV7PMpHAgA", price_id: "price_1T9wXlPshPrEibTgEM0BNrSm" },
  shelter: { product_id: "prod_UDKcjmnJnM7pBo", price_id: "price_1TEtxAPshPrEibTgsDFHr8Nw" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ subscribed: false, error: "No authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      logStep("Auth failed", { message: userError?.message || "No user" });
      return new Response(JSON.stringify({ subscribed: false, error: "auth_error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email!;
    if (!userEmail) {
      logStep("No email in claims");
      return new Response(JSON.stringify({ subscribed: false, error: "auth_error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    logStep("User authenticated", { userId });

    // ── Check admin subscription overrides FIRST ──
    const { data: adminOverrides } = await supabaseClient
      .from("admin_subscriptions")
      .select("tier")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (adminOverrides && adminOverrides.length > 0) {
      // Pick the highest tier override
      const tierPriority = ["shelter", "educator", "expert", "pro"];
      let bestTier = adminOverrides[0].tier;
      for (const ov of adminOverrides) {
        if (tierPriority.indexOf(ov.tier) < tierPriority.indexOf(bestTier)) {
          bestTier = ov.tier;
        }
      }

      const mapped = TIER_MAP[bestTier];
      if (mapped) {
        logStep("Admin override active", { tier: bestTier, userId });
        return new Response(JSON.stringify({
          subscribed: true,
          product_id: mapped.product_id,
          price_id: mapped.price_id,
          subscription_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          admin_override: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // ── Check roles for test account bypass ──
    const { data: userRoles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = (userRoles || []).map((r: any) => r.role);
    const isAdmin = roles.includes("admin");
    const isEducator = roles.includes("educator");
    const isShelter = roles.includes("shelter");

    const environment = Deno.env.get("ENVIRONMENT") || "production";
    const TEST_EMAILS = [
      "test-owner@pawplan.dev",
      "test-educator@pawplan.dev",
      "test-admin@pawplan.dev",
      "test-shelter@pawplan.dev",
    ];
    const isTestAccount = TEST_EMAILS.includes(userEmail);

    if (isTestAccount && environment !== "production") {
      logStep("Test account in dev mode, granting access", { email: userEmail });

      let productId: string;
      let priceId: string;

      if (isEducator || userEmail === "test-educator@pawplan.dev") {
        productId = "prod_U8CxlV7PMpHAgA";
        priceId = "price_1T9wXlPshPrEibTgEM0BNrSm";
      } else if (isShelter || userEmail === "test-shelter@pawplan.dev") {
        productId = "prod_UDKcjmnJnM7pBo";
        priceId = "price_1TEtxAPshPrEibTgsDFHr8Nw";
      } else {
        productId = "prod_U83inCbv8JMMgf";
        priceId = "price_1T9nbAPshPrEibTgo3JA1m5S";
      }

      return new Response(JSON.stringify({
        subscribed: true,
        product_id: productId,
        price_id: priceId,
        subscription_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Customer found", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let priceId = null;
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const sub = subscriptions.data[0];
      subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();
      productId = sub.items.data[0].price.product;
      priceId = sub.items.data[0].price.id;
      logStep("Active subscription found", { productId, subscriptionEnd });
    } else {
      logStep("No active subscription");
    }

    // Sync current_tier in stripe_customers for backend enforcement
    const tierFromProduct: Record<string, string> = {
      "prod_U83i1wbeLdd3EI": "pro",
      "prod_U83inCbv8JMMgf": "expert",
    };
    const resolvedTier = hasActiveSub && productId ? (tierFromProduct[productId as string] || "starter") : "starter";
    
    await supabaseClient.from("stripe_customers").upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      email: userEmail,
      current_tier: resolvedTier,
    }, { onConflict: "user_id" });

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      price_id: priceId,
      subscription_end: subscriptionEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
