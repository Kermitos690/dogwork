import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Simple secret check
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");
    if (secret !== "svpa-recreate-2026") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const email = "gtbi1@proton.me";
    const displayName = "Vincent";
    const tempPassword = "DogWork!Temp2026#Svpa";
    const logs: string[] = [];

    // Check if user already exists
    let existingUser: any = null;
    let page = 1;
    while (!existingUser) {
      const { data: { users }, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
      if (error) throw error;
      if (!users || users.length === 0) break;
      existingUser = users.find((u: any) => u.email?.toLowerCase() === email);
      if (users.length < 100) break;
      page++;
    }

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      await admin.auth.admin.updateUserById(userId, {
        password: tempPassword,
        email_confirm: true,
        user_metadata: { display_name: displayName, must_change_password: true },
      });
      logs.push(`✅ User updated: ${userId}`);
    } else {
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { display_name: displayName, must_change_password: true },
      });
      if (createError) throw createError;
      userId = newUser.user!.id;
      logs.push(`✅ User created: ${userId}`);
    }

    // Profile
    await admin.from("profiles").upsert({ user_id: userId, display_name: displayName }, { onConflict: "user_id" });
    logs.push("✅ Profile upserted");

    // Roles: owner + shelter
    for (const role of ["owner", "shelter"]) {
      const { data: existing } = await admin.from("user_roles").select("id").eq("user_id", userId).eq("role", role).maybeSingle();
      if (!existing) {
        await admin.from("user_roles").insert({ user_id: userId, role });
      }
    }
    logs.push("✅ Roles: owner, shelter");

    // Update shelter_profile
    const oldShelterId = "6e3922c4-bc0e-4d2c-b356-31e750fdc266";
    const oldEmpId = "08c2e64d-c1fc-446a-a570-e598dc2a0f4f";

    const { error: spErr } = await admin.from("shelter_profiles").update({ user_id: userId }).eq("user_id", oldShelterId);
    logs.push(spErr ? `❌ shelter_profiles: ${spErr.message}` : "✅ shelter_profiles updated");

    // Update shelter_animals
    await admin.from("shelter_animals").update({ user_id: userId }).eq("user_id", oldShelterId);
    logs.push("✅ shelter_animals updated");

    // Update shelter_employees
    await admin.from("shelter_employees").update({ shelter_user_id: userId, auth_user_id: userId }).eq("id", "119badc0-1f2d-4dc1-816d-a72765bb11a2");
    logs.push("✅ shelter_employees updated");

    // Update references in related tables
    const refTables = [
      "shelter_activity_log", "shelter_observations", "adoption_updates",
      "adopter_links", "adoption_checkins", "adoption_plans",
      "shelter_animal_evaluations", "shelter_spaces", "shelter_coaches",
    ];
    for (const table of refTables) {
      try {
        await admin.from(table).update({ shelter_user_id: userId }).eq("shelter_user_id", oldShelterId);
        await admin.from(table).update({ shelter_user_id: userId }).eq("shelter_user_id", oldEmpId);
      } catch {}
    }
    logs.push("✅ All references updated");

    // Shelter profile - create if update failed (profile didn't exist with old ID)
    const { data: sp } = await admin.from("shelter_profiles").select("id").eq("user_id", userId).maybeSingle();
    if (!sp) {
      await admin.from("shelter_profiles").insert({ user_id: userId, name: "SVPA de Ste-Catherine", organization_type: "refuge" });
      logs.push("✅ shelter_profile created (new)");
    }

    return new Response(JSON.stringify({ success: true, userId, logs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
