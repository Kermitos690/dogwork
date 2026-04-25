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
    const { data: { user: callerUser }, error: callerError } = await userClient.auth.getUser();
    if (callerError || !callerUser) {
      return new Response(JSON.stringify({ error: "Session administrateur invalide" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await userClient.rpc("is_admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId } = await req.json();
    if (!userId) throw new Error("userId requis");
    if (userId === callerUser.id) throw new Error("Vous ne pouvez pas supprimer votre propre compte administrateur depuis cet écran.");

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: { user: targetUser }, error: targetError } = await admin.auth.admin.getUserById(userId);
    if (targetError || !targetUser) throw new Error("Utilisateur introuvable ou déjà supprimé du système d'authentification");

    // Cascade delete all user data from every known table
    const tables = [
      // Owner data
      { table: "exercise_sessions", col: "user_id" },
      { table: "behavior_logs", col: "user_id" },
      { table: "journal_entries", col: "user_id" },
      { table: "day_progress", col: "user_id" },
      { table: "dog_evaluations", col: "user_id" },
      { table: "dog_objectives", col: "user_id" },
      { table: "dog_problems", col: "user_id" },
      { table: "dogs", col: "user_id" },
      // Training
      { table: "training_plans", col: "user_id" },
      // Messages
      { table: "messages", col: "sender_id" },
      { table: "messages", col: "recipient_id" },
      // Preferences
      { table: "user_preferences", col: "user_id" },
      // Client links
      { table: "client_links", col: "client_user_id" },
      { table: "client_links", col: "coach_user_id" },
      // Coach data
      { table: "coach_notes", col: "coach_user_id" },
      { table: "coach_calendar_events", col: "coach_user_id" },
      { table: "coach_profiles", col: "user_id" },
      { table: "coach_stripe_data", col: "user_id" },
      // Courses
      { table: "course_bookings", col: "user_id" },
      { table: "course_reviews", col: "user_id" },
      { table: "courses", col: "educator_user_id" },
      // Shelter data
      { table: "shelter_activity_log", col: "shelter_user_id" },
      { table: "shelter_animal_evaluations", col: "coach_user_id" },
      { table: "shelter_employees", col: "shelter_user_id" },
      { table: "shelter_employees", col: "auth_user_id" },
      { table: "shelter_animals", col: "user_id" },
      { table: "shelter_profiles", col: "user_id" },
      { table: "shelter_spaces", col: "shelter_user_id" },
      // Adoption
      { table: "adopter_links", col: "adopter_user_id" },
      { table: "adopter_links", col: "shelter_user_id" },
      { table: "adoption_checkins", col: "adopter_user_id" },
      { table: "adoption_updates", col: "shelter_user_id" },
      { table: "adoption_plan_entries", col: "adopter_user_id" },
      { table: "adoption_plans", col: "adopter_user_id" },
      { table: "adoption_plans", col: "shelter_user_id" },
      // Professional
      { table: "professional_alerts", col: "client_user_id" },
      { table: "plan_adjustments", col: "coach_user_id" },
      // Admin
      { table: "admin_subscriptions", col: "user_id" },
      { table: "billing_events", col: "user_id" },
      { table: "stripe_customers", col: "user_id" },
      { table: "support_tickets", col: "user_id" },
      // Roles & profile (last)
      { table: "user_roles", col: "user_id" },
      { table: "profiles", col: "user_id" },
    ];

    const errors: string[] = [];
    for (const { table, col } of tables) {
      try {
        await admin.from(table).delete().eq(col, userId);
      } catch (e: any) {
        // Table may not exist yet, skip
        errors.push(`${table}.${col}: ${e.message}`);
      }
    }

    // Delete the auth user
    const { error: authError } = await admin.auth.admin.deleteUser(userId);
    if (authError) {
      errors.push(`auth.delete: ${authError.message}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      deleted: userId,
      warnings: errors.length > 0 ? errors : undefined,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
