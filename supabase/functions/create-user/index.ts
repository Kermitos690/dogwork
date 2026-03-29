import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateStrongPassword(length = 16): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "!@#$%&*_+-=";
  const all = upper + lower + digits + special;

  // Ensure at least one of each category
  const mandatory = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];

  const remaining = Array.from({ length: length - mandatory.length }, () =>
    all[Math.floor(Math.random() * all.length)]
  );

  // Shuffle
  const chars = [...mandatory, ...remaining];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Use anon client with user's token to validate identity
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub as string;

    // Service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });

    if (!isAdmin) throw new Error("Seul un administrateur peut créer des comptes");

    const { email, displayName, role, userId: targetUserId, resetOnly } = await req.json();

    // ── Reset-only mode: just reset password for existing user by ID
    if (resetOnly && targetUserId) {
      const { data: { user: targetUser }, error: fetchErr } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
      if (fetchErr || !targetUser) throw new Error("Utilisateur introuvable");

      const tempPassword = generateStrongPassword(20);
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        password: tempPassword,
        user_metadata: {
          ...(targetUser.user_metadata || {}),
          must_change_password: true,
        },
      });
      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({
          success: true,
          userId: targetUserId,
          email: targetUser.email,
          temporaryPassword: tempPassword,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!email) throw new Error("Email requis");

    const normalizedEmail = String(email).trim().toLowerCase();
    const effectiveDisplayName = (displayName || normalizedEmail.split("@")[0]).trim();

    // Auto-generate a strong temporary password
    const tempPassword = generateStrongPassword(20);

    const {
      data: { users: existingUsers },
      error: listUsersError,
    } = await supabaseAdmin.auth.admin.listUsers();

    if (listUsersError) throw listUsersError;

    const existingUser = (existingUsers || []).find(
      (u: any) => u.email?.toLowerCase() === normalizedEmail
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: tempPassword,
        user_metadata: {
          ...(existingUser.user_metadata || {}),
          display_name: effectiveDisplayName,
          must_change_password: true,
        },
      });
      if (updateError) throw updateError;
    } else {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          display_name: effectiveDisplayName,
          must_change_password: true,
        },
      });
      if (createError) throw createError;
      userId = newUser.user!.id;
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
      {
        user_id: userId,
        display_name: effectiveDisplayName,
      },
      { onConflict: "user_id" }
    );
    if (profileError) throw profileError;

    const { data: ownerRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "owner")
      .maybeSingle();

    if (!ownerRole) {
      const { error: ownerRoleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: "owner" });
      if (ownerRoleError) throw ownerRoleError;
    }

    if (role && role !== "owner") {
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", role)
        .maybeSingle();

      if (!existingRole) {
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: userId, role });
        if (roleError) throw roleError;
      }

      if (role === "educator") {
        const { data: coachProfile } = await supabaseAdmin
          .from("coach_profiles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (!coachProfile) {
          const { error: coachProfileError } = await supabaseAdmin.from("coach_profiles").insert({
            user_id: userId,
            display_name: effectiveDisplayName,
          });
          if (coachProfileError) throw coachProfileError;
        }
      } else if (role === "shelter") {
        const { data: shelterProfile } = await supabaseAdmin
          .from("shelter_profiles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (!shelterProfile) {
          const { error: shelterProfileError } = await supabaseAdmin.from("shelter_profiles").insert({
            user_id: userId,
            name: effectiveDisplayName,
          });
          if (shelterProfileError) throw shelterProfileError;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        alreadyExisted: !!existingUser,
        temporaryPassword: tempPassword,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erreur inattendue" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
