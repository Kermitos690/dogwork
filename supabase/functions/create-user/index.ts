import { createClient } from "npm:@supabase/supabase-js@2.49.4";

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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller identity via token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is admin
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: caller.id, _role: "admin" });
    if (!isAdmin) throw new Error("Seul un administrateur peut créer des comptes");

    const { email, password, displayName, role } = await req.json();
    if (!email || !password) throw new Error("Email et mot de passe requis");

    // Check if user already exists
    const { data: { users: existingUsers } } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = (existingUsers || []).find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let userId: string;

    if (existingUser) {
      // User exists — update password so admin can reset it
      userId = existingUser.id;
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
        user_metadata: { display_name: displayName || existingUser.user_metadata?.display_name },
      });
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

    if (role && role !== "owner") {
      // Upsert role to avoid duplicates
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", role)
        .maybeSingle();

      if (!existingRole) {
        await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });
      }

      // Create role-specific profiles if missing
      if (role === "educator") {
        const { data: ep } = await supabaseAdmin.from("coach_profiles").select("id").eq("user_id", userId).maybeSingle();
        if (!ep) {
          await supabaseAdmin.from("coach_profiles").insert({
            user_id: userId,
            display_name: displayName || email.split("@")[0],
          });
        }
      } else if (role === "shelter") {
        const { data: sp } = await supabaseAdmin.from("shelter_profiles").select("id").eq("user_id", userId).maybeSingle();
        if (!sp) {
          await supabaseAdmin.from("shelter_profiles").insert({
            user_id: userId,
            name: displayName || email.split("@")[0],
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, userId, alreadyExisted: !!existingUser }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
