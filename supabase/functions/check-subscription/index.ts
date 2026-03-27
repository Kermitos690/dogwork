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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

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

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user?.email) {
      logStep("Auth failed", { message: userError?.message || "No user/email" });
      return new Response(JSON.stringify({ subscribed: false, error: "auth_error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const user = userData.user;
    logStep("User authenticated", { email: user.email });

    // Dev/test accounts get full access automatically
    // Check if user has admin, educator, or shelter role for appropriate bypass
    const { data: userRoles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    
    const roles = (userRoles || []).map((r: any) => r.role);
    const isAdmin = roles.includes("admin");
    const isEducator = roles.includes("educator");
    const isShelter = roles.includes("shelter");

    const TEST_EMAILS = [
      "test-owner@pawplan.dev",
      "test-educator@pawplan.dev",
      "test-admin@pawplan.dev",
      "test-shelter@pawplan.dev",
    ];
    const isTestAccount = TEST_EMAILS.includes(user.email!);
    const isAdminEmail = user.email!.toLowerCase() === "teba.gaetan@gmail.com";

    // Also check if Apple login user is the admin (via provider_id in user metadata)
    const appleProviderId = user.user_metadata?.provider_id || user.user_metadata?.sub;
    const isAdminApple = user.app_metadata?.provider === "apple" && 
      appleProviderId === "001806.9d0ff72f8fd64bac88fe99b4436db8df.1226";

    if (isTestAccount || isAdminEmail || isAdminApple) {
      logStep("Privileged account detected, granting full access", { email: user.email, roles });

      // Determine best product_id based on role
      let productId: string;
      let priceId: string;

      if (isEducator || user.email === "test-educator@pawplan.dev") {
        // Educator subscription product
        productId = "prod_U8CxlV7PMpHAgA";
        priceId = "price_1T9wXlPshPrEibTgEM0BNrSm";
      } else if (isShelter || user.email === "test-shelter@pawplan.dev") {
        // Shelter subscription product
        productId = "prod_UDKcjmnJnM7pBo";
        priceId = "price_1TEtxAPshPrEibTgsDFHr8Nw";
      } else {
        // Owner/Admin → Expert tier (highest)
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
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

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
      logStep("Active subscription found", { productId, priceId, subscriptionEnd });
    } else {
      logStep("No active subscription");
    }

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
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
