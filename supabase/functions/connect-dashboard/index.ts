import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONNECT-DASHBOARD] ${step}${d}`);
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
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseAdmin.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("Non authentifié");

    // Only admin can access the treasury dashboard
    const { data: adminRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");
    if (!adminRoles?.length) throw new Error("Accès réservé à l'administrateur");

    const { action, educator_user_id } = await req.json();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    if (action === "list_accounts") {
      // List all educators with Connect accounts from dedicated stripe table
      const { data: stripeAccounts } = await supabaseAdmin
        .from("coach_stripe_data")
        .select("user_id, stripe_account_id, stripe_onboarding_complete")
        .not("stripe_account_id", "is", null);

      // Get display names from coach_profiles
      const userIds = (stripeAccounts || []).map(s => s.user_id);
      const { data: profiles } = await supabaseAdmin
        .from("coach_profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);
      const nameMap = new Map((profiles || []).map(p => [p.user_id, p.display_name]));

      const accounts = [];
      for (const sd of stripeAccounts || []) {
        try {
          const account = await stripe.accounts.retrieve(sd.stripe_account_id!);
          const balance = await stripe.balance.retrieve({
            stripeAccount: sd.stripe_account_id!,
          });
          accounts.push({
            user_id: sd.user_id,
            display_name: nameMap.get(sd.user_id) || null,
            account_id: sd.stripe_account_id,
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            balance_available: balance.available,
            balance_pending: balance.pending,
          });
        } catch (e: any) {
          accounts.push({
            user_id: sd.user_id,
            display_name: nameMap.get(sd.user_id) || null,
            account_id: sd.stripe_account_id,
            error: e.message,
          });
        }
      }

      // Platform balance
      const platformBalance = await stripe.balance.retrieve();

      return new Response(JSON.stringify({
        accounts,
        platform_balance: {
          available: platformBalance.available,
          pending: platformBalance.pending,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create_login_link" && educator_user_id) {
      // Create Express dashboard login link for a specific educator
      const { data: sd } = await supabaseAdmin
        .from("coach_stripe_data")
        .select("stripe_account_id")
        .eq("user_id", educator_user_id)
        .single();

      if (!sd?.stripe_account_id) throw new Error("Éducateur sans compte Connect");

      const loginLink = await stripe.accounts.createLoginLink(sd.stripe_account_id);
      return new Response(JSON.stringify({ url: loginLink.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "platform_transfers") {
      // List recent transfers from platform
      const transfers = await stripe.transfers.list({ limit: 50 });
      return new Response(JSON.stringify({ transfers: transfers.data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Action non reconnue");
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
