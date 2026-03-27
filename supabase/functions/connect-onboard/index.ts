import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONNECT-ONBOARD] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseAdmin.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("Non authentifié");
    logStep("User authenticated", { email: user.email });

    // Verify educator role
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "educator");
    if (!roles?.length) throw new Error("Accès réservé aux éducateurs");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if educator already has a Connect account
    const { data: stripeData } = await supabaseAdmin
      .from("coach_stripe_data")
      .select("stripe_account_id, stripe_onboarding_complete")
      .eq("user_id", user.id)
      .maybeSingle();

    let accountId = stripeData?.stripe_account_id;

    if (!accountId) {
      // Create a new Express Connect account
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        country: "CH",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
        metadata: {
          user_id: user.id,
          platform: "dogwork",
        },
      });

      accountId = account.id;
      logStep("Connect account created", { accountId });

      // Save to coach_stripe_data (upsert)
      await supabaseAdmin
        .from("coach_stripe_data")
        .upsert({ user_id: user.id, stripe_account_id: accountId }, { onConflict: "user_id" });
    } else {
      logStep("Existing Connect account found", { accountId });
    }

    // Create an account link for onboarding
    const origin = req.headers.get("origin") || "https://dogwork.lovable.app";

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/coach/subscription?connect=refresh`,
      return_url: `${origin}/coach/subscription?connect=complete`,
      type: "account_onboarding",
    });

    logStep("Account link created", { url: accountLink.url });

    return new Response(JSON.stringify({ url: accountLink.url, accountId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
