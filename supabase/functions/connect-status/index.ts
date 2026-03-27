import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONNECT-STATUS] ${step}${d}`);
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

    // Check if request is from admin checking a specific educator
    const body = req.method === "POST" ? await req.json() : {};
    const targetUserId = body.educator_user_id || user.id;

    // If checking another user, verify admin role
    if (targetUserId !== user.id) {
      const { data: adminRoles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin");
      if (!adminRoles?.length) throw new Error("Accès non autorisé");
    }

    const { data: coachProfile } = await supabaseAdmin
      .from("coach_profiles")
      .select("stripe_account_id, stripe_onboarding_complete")
      .eq("user_id", targetUserId)
      .single();

    if (!coachProfile?.stripe_account_id) {
      return new Response(JSON.stringify({
        connected: false,
        onboarding_complete: false,
        charges_enabled: false,
        payouts_enabled: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const account = await stripe.accounts.retrieve(coachProfile.stripe_account_id);
    logStep("Account retrieved", {
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    });

    // Update onboarding status in DB if changed
    const isComplete = account.charges_enabled && account.payouts_enabled;
    if (isComplete !== coachProfile.stripe_onboarding_complete) {
      await supabaseAdmin
        .from("coach_profiles")
        .update({ stripe_onboarding_complete: isComplete })
        .eq("user_id", targetUserId);
    }

    // Only expose account_id to admins — educators don't need it
    const { data: callerAdminRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");
    const callerIsAdmin = (callerAdminRoles?.length ?? 0) > 0;

    const result: Record<string, any> = {
      connected: true,
      onboarding_complete: isComplete,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
    };
    if (callerIsAdmin) {
      result.account_id = account.id;
    }

    return new Response(JSON.stringify(result), {
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
