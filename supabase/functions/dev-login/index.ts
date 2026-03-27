import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEST_PASSWORD = "testdev123456";

const TEST_ACCOUNTS: Record<string, { email: string; display_name: string; role: string }> = {
  owner: { email: "test-owner@pawplan.dev", display_name: "Test Propriétaire", role: "owner" },
  educator: { email: "test-educator@pawplan.dev", display_name: "Test Éducateur", role: "educator" },
  admin: { email: "test-admin@pawplan.dev", display_name: "Test Admin", role: "admin" },
  shelter: { email: "test-shelter@pawplan.dev", display_name: "Test Refuge", role: "shelter" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Safe by default: dev-login is BLOCKED unless ENVIRONMENT is explicitly "development"
  // If ENVIRONMENT is not set at all, treat as production (secure by default)
  const environment = Deno.env.get("ENVIRONMENT") || "production";
  if (environment !== "development") {
    return new Response(
      JSON.stringify({ error: "Not available in this environment" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { role } = await req.json();
    const account = TEST_ACCOUNTS[role];
    if (!account) {
      return new Response(JSON.stringify({ error: "Invalid role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if user exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    let user = existingUsers?.users?.find((u) => u.email === account.email);

    if (!user) {
      // Create the test user
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: account.email,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: account.display_name },
      });
      if (createErr) throw createErr;
      user = created.user;

      // Add role if not owner (owner is auto-assigned by trigger)
      if (account.role !== "owner") {
        await supabaseAdmin.from("user_roles").insert({
          user_id: user.id,
          role: account.role,
        });
      }

      // Create shelter profile if shelter
      if (account.role === "shelter") {
        await supabaseAdmin.from("shelter_profiles").insert({
          user_id: user.id,
          name: "Refuge Test",
          description: "Compte refuge de test",
        });
      }

      // Create coach profile if educator
      if (account.role === "educator") {
        await supabaseAdmin.from("coach_profiles").insert({
          user_id: user.id,
          display_name: account.display_name,
          specialty: "Comportement canin",
        });
      }
    }

    // Sign in and return session
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data: signInData, error: signInErr } = await anonClient.auth.signInWithPassword({
      email: account.email,
      password: TEST_PASSWORD,
    });

    if (signInErr) throw signInErr;

    return new Response(
      JSON.stringify({
        access_token: signInData.session?.access_token,
        refresh_token: signInData.session?.refresh_token,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
