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

    const ADMIN_EMAIL = "teba.gaetan@gmail.com";
    const KEEP_EMAILS = [
      ADMIN_EMAIL,
      "presciglia@hotmail.com",
      "ms.brandenberger@gmail.com",
    ];

    // List all auth users
    const { data: { users }, error: listErr } = await admin.auth.admin.listUsers();
    if (listErr) throw listErr;
    const authUsers = users as any[];

    const toDelete = authUsers.filter(u => !KEEP_EMAILS.includes(u.email?.toLowerCase() || ""));

    // Tables to cascade-delete for each user
    const CASCADE_TABLES = [
      { table: "exercise_sessions", col: "user_id" },
      { table: "behavior_logs", col: "user_id" },
      { table: "journal_entries", col: "user_id" },
      { table: "day_progress", col: "user_id" },
      { table: "dog_evaluations", col: "user_id" },
      { table: "dog_objectives", col: "user_id" },
      { table: "dog_problems", col: "user_id" },
      { table: "dogs", col: "user_id" },
      { table: "training_plans", col: "user_id" },
      { table: "messages", col: "sender_id" },
      { table: "messages", col: "recipient_id" },
      { table: "client_links", col: "client_user_id" },
      { table: "client_links", col: "coach_user_id" },
      { table: "coach_notes", col: "coach_user_id" },
      { table: "coach_calendar_events", col: "coach_user_id" },
      { table: "coach_profiles", col: "user_id" },
      { table: "coach_stripe_data", col: "user_id" },
      { table: "course_bookings", col: "user_id" },
      { table: "course_reviews", col: "user_id" },
      { table: "courses", col: "educator_user_id" },
      { table: "adopter_links", col: "adopter_user_id" },
      { table: "adopter_links", col: "shelter_user_id" },
      { table: "adoption_checkins", col: "adopter_user_id" },
      { table: "adoption_updates", col: "shelter_user_id" },
      { table: "adoption_plan_entries", col: "adopter_user_id" },
      { table: "adoption_plans", col: "adopter_user_id" },
      { table: "adoption_plans", col: "shelter_user_id" },
      { table: "professional_alerts", col: "client_user_id" },
      { table: "plan_adjustments", col: "coach_user_id" },
      { table: "admin_subscriptions", col: "user_id" },
      { table: "billing_events", col: "user_id" },
      { table: "user_roles", col: "user_id" },
      { table: "profiles", col: "user_id" },
    ];

    for (const user of toDelete) {
      for (const { table, col } of CASCADE_TABLES) {
        try { await admin.from(table).delete().eq(col, user.id); } catch {}
      }
      const { error } = await admin.auth.admin.deleteUser(user.id);
      logs.push(error
        ? `❌ Delete ${user.email} error: ${error.message}`
        : `✅ Deleted ${user.email}`
      );
    }

    // Ensure admin has full setup
    const adminUser = authUsers.find(u => u.email?.toLowerCase() === ADMIN_EMAIL);
    if (adminUser) {
      // Clean existing roles/profile to rebuild cleanly
      await admin.from("user_roles").delete().eq("user_id", adminUser.id);
      await admin.from("profiles").delete().eq("user_id", adminUser.id);

      // Recreate profile
      await admin.from("profiles").insert({ user_id: adminUser.id, display_name: "Gaëtan Teba" });
      logs.push("✅ Admin profile recreated");

      // Recreate ALL roles
      for (const role of ["admin", "owner", "educator", "shelter", "shelter_employee"]) {
        await admin.from("user_roles").insert({ user_id: adminUser.id, role });
      }
      logs.push("✅ Admin roles: admin, owner, educator, shelter, shelter_employee");

      // Ensure coach_profile
      await admin.from("coach_profiles").delete().eq("user_id", adminUser.id);
      await admin.from("coach_profiles").insert({
        user_id: adminUser.id,
        display_name: "Gaëtan Teba",
      });
      logs.push("✅ Coach profile recreated");

      // Confirm email
      await admin.auth.admin.updateUserById(adminUser.id, { email_confirm: true });
    }

    // Ensure Presciglia
    const presUser = authUsers.find(u => u.email?.toLowerCase() === "presciglia@hotmail.com");
    if (presUser) {
      await admin.from("profiles").upsert(
        { user_id: presUser.id, display_name: "Preshiba" },
        { onConflict: "user_id" }
      );
      await admin.from("user_roles").upsert(
        { user_id: presUser.id, role: "owner" },
        { onConflict: "user_id,role" }
      );
      await admin.auth.admin.updateUserById(presUser.id, { email_confirm: true });
      logs.push("✅ Presciglia preserved");
    }

    // Ensure Mel/Micup
    const melUser = authUsers.find(u => u.email?.toLowerCase() === "ms.brandenberger@gmail.com");
    if (melUser) {
      await admin.from("profiles").upsert(
        { user_id: melUser.id, display_name: "Mel" },
        { onConflict: "user_id" }
      );
      await admin.from("user_roles").upsert(
        { user_id: melUser.id, role: "owner" },
        { onConflict: "user_id,role" }
      );
      await admin.auth.admin.updateUserById(melUser.id, { email_confirm: true });
      logs.push("✅ Mel preserved");
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
