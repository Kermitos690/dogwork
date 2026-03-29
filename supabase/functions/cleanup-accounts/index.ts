import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: isAdmin } = await userClient.rpc("is_admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const logs: string[] = [];

    // Get admin email
    const ADMIN_EMAIL = "teba.gaetan@gmail.com";

    // List all auth users
    const { data: { users }, error: listErr } = await admin.auth.admin.listUsers();
    if (listErr) throw listErr;

    // Find duplicates and junk
    const KEEP_EMAILS = [
      ADMIN_EMAIL,
      "presciglia@hotmail.com",
      "ms.brandenberger@gmail.com",
      "niels.legoux@gmail.com",
    ];

    const toDelete = users.filter(u => !KEEP_EMAILS.includes(u.email?.toLowerCase() || ""));
    
    // Clean up public data and delete junk users
    for (const user of toDelete) {
      // Clean public tables
      for (const table of ["profiles", "user_roles", "admin_subscriptions", "coach_profiles", "shelter_profiles", "coach_stripe_data"]) {
        await admin.from(table).delete().eq("user_id", user.id);
      }
      
      // Delete auth user
      const { error } = await admin.auth.admin.deleteUser(user.id);
      logs.push(error 
        ? `Delete ${user.email} (${user.id}) error: ${error.message}` 
        : `Deleted ${user.email} (${user.id})`
      );
    }

    // Now ensure admin has proper profile and roles
    const adminUser = users.find(u => u.email?.toLowerCase() === ADMIN_EMAIL);
    if (adminUser) {
      // Ensure profile
      await admin.from("profiles").upsert(
        { user_id: adminUser.id, display_name: "Gaetan" },
        { onConflict: "user_id" }
      );
      logs.push("Admin profile ensured");

      // Ensure roles
      for (const role of ["admin", "owner", "educator"]) {
        await admin.from("user_roles").upsert(
          { user_id: adminUser.id, role },
          { onConflict: "user_id,role" }
        );
      }
      logs.push("Admin roles ensured (admin, owner, educator)");

      // Ensure coach_profile
      const { data: cp } = await admin.from("coach_profiles")
        .select("id").eq("user_id", adminUser.id).maybeSingle();
      if (!cp) {
        await admin.from("coach_profiles").insert({
          user_id: adminUser.id,
          display_name: "Gaetan",
        });
        logs.push("Coach profile created for admin");
      }

      // Ensure presciglia has profile and owner role
      const presUser = users.find(u => u.email?.toLowerCase() === "presciglia@hotmail.com");
      if (presUser) {
        await admin.from("profiles").upsert(
          { user_id: presUser.id, display_name: "Preshiba" },
          { onConflict: "user_id" }
        );
        await admin.from("user_roles").upsert(
          { user_id: presUser.id, role: "owner" },
          { onConflict: "user_id,role" }
        );
        // Confirm email
        await admin.auth.admin.updateUserById(presUser.id, { email_confirm: true });
        logs.push("Presciglia profile/role/email fixed");
      }
    }

    return new Response(JSON.stringify({ success: true, logs, deleted: toDelete.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
