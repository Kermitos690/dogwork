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

    const ADMIN_ID = "46478b2b-8eea-40f9-87b6-42d5e0c8dd90";
    const PRESCIGLIA_ID = "4454dff8-1144-4650-8ca5-6767b83f2c12";
    const DUPLICATE_GAETAN = "b3bb014e-6c63-4df9-ae4d-0d7485d13e79";

    const TO_DELETE = [
      "f29c0d64-97b2-4c33-8730-75e3dc9b437f", // Apple relay
      "b3bb014e-6c63-4df9-ae4d-0d7485d13e79", // lareklam79 (duplicate Gaetan)
      "db025729-03fd-446d-8f85-360293fcda4e", // test-shelter
      "34af32ab-28f1-438b-87c0-a3c2d56c56fe", // test-admin
      "5391a2e6-6392-40be-a8d8-b8c680562202", // bdkdl@fkkf.com junk
    ];

    // 1. Create profile for admin if missing
    const { error: profileErr } = await admin.from("profiles").upsert(
      { user_id: ADMIN_ID, display_name: "Gaetan" },
      { onConflict: "user_id" }
    );
    logs.push(profileErr ? `Profile admin error: ${profileErr.message}` : "Profile admin OK");

    // 2. Create roles for admin
    for (const role of ["admin", "owner", "educator"]) {
      const { error } = await admin.from("user_roles").upsert(
        { user_id: ADMIN_ID, role },
        { onConflict: "user_id,role" }
      );
      logs.push(error ? `Role ${role} error: ${error.message}` : `Role ${role} OK`);
    }

    // 3. Move coach_profile from duplicate to admin
    const { data: dupCoach } = await admin.from("coach_profiles")
      .select("id").eq("user_id", DUPLICATE_GAETAN).maybeSingle();
    if (dupCoach) {
      // Check if admin already has one
      const { data: adminCoach } = await admin.from("coach_profiles")
        .select("id").eq("user_id", ADMIN_ID).maybeSingle();
      if (adminCoach) {
        // Delete duplicate
        await admin.from("coach_profiles").delete().eq("user_id", DUPLICATE_GAETAN);
        logs.push("Duplicate coach_profile deleted (admin already has one)");
      } else {
        const { error } = await admin.from("coach_profiles")
          .update({ user_id: ADMIN_ID }).eq("user_id", DUPLICATE_GAETAN);
        logs.push(error ? `Move coach error: ${error.message}` : "Coach profile moved to admin");
      }
    }

    // 4. Create profile + role for presciglia
    const { error: pProfileErr } = await admin.from("profiles").upsert(
      { user_id: PRESCIGLIA_ID, display_name: "Preshiba" },
      { onConflict: "user_id" }
    );
    logs.push(pProfileErr ? `Presciglia profile error: ${pProfileErr.message}` : "Presciglia profile OK");

    const { error: pRoleErr } = await admin.from("user_roles").upsert(
      { user_id: PRESCIGLIA_ID, role: "owner" },
      { onConflict: "user_id,role" }
    );
    logs.push(pRoleErr ? `Presciglia role error: ${pRoleErr.message}` : "Presciglia role OK");

    // 5. Confirm presciglia email
    const { error: confirmErr } = await admin.auth.admin.updateUserById(PRESCIGLIA_ID, {
      email_confirm: true,
    });
    logs.push(confirmErr ? `Presciglia confirm error: ${confirmErr.message}` : "Presciglia email confirmed");

    // 6. Clean up public data for accounts to delete
    for (const table of ["profiles", "user_roles", "admin_subscriptions", "coach_profiles", "shelter_profiles"]) {
      const { error } = await admin.from(table).delete().in("user_id", TO_DELETE);
      logs.push(error ? `Clean ${table} error: ${error.message}` : `Clean ${table} OK`);
    }

    // 7. Delete auth users
    for (const userId of TO_DELETE) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      logs.push(error ? `Delete user ${userId} error: ${error.message}` : `Deleted user ${userId}`);
    }

    return new Response(JSON.stringify({ success: true, logs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
