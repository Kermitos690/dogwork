import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub as string;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: callerId, _role: "admin" });
    if (!isAdmin) throw new Error("Seul un administrateur peut créer des comptes");

    const { email, password, displayName, role } = await req.json();
    if (!email || !password) throw new Error("Email et mot de passe requis");

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let userId: string;

    if (existingUser) {
      // User exists — just assign role if needed
      userId = existingUser.id;
    } else {
      // Create user with email auto-confirmed
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName || email.split("@")[0] },
      });
      if (createError) throw createError;
      userId = newUser.user!.id;
    }

    // Assign role if specified (owner is default, no role entry needed)
    if (role && role !== "owner") {
      await supabaseAdmin.from("user_roles").insert({ user_id: newUser.user!.id, role });

      // Create role-specific profiles
      if (role === "educator") {
        await supabaseAdmin.from("coach_profiles").insert({
          user_id: newUser.user!.id,
          display_name: displayName || email.split("@")[0],
        });
      } else if (role === "shelter") {
        await supabaseAdmin.from("shelter_profiles").insert({
          user_id: newUser.user!.id,
          name: displayName || email.split("@")[0],
        });
      }
    }

    return new Response(JSON.stringify({ success: true, userId: newUser.user!.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
