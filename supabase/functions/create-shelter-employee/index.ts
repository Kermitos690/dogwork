import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { encode as hexEncode } from "https://deno.land/std@0.208.0/encoding/hex.ts";

async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return new TextDecoder().decode(hexEncode(new Uint8Array(hash)));
}

// Build a strong password from a 6-digit PIN to satisfy Supabase password policy
function pinToPassword(pin: string): string {
  return `DogWork!${pin}#Secure`;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is shelter or admin via getClaims (ES256 compatible)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Non autorisé");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) throw new Error("Non autorisé");
    const caller = { id: claimsData.claims.sub as string };

    const { data: isShelter } = await supabaseAdmin.rpc("has_role", { _user_id: caller.id, _role: "shelter" });
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: caller.id, _role: "admin" });
    if (!isShelter && !isAdmin) throw new Error("Accès refusé");

    const body = await req.json();
    const { action } = body;

    // ── RESET PIN ──
    if (action === "reset-pin") {
      const { auth_user_id, employee_id } = body;
      if (!auth_user_id || !employee_id) throw new Error("auth_user_id et employee_id requis");

      const pin = String(Math.floor(100000 + Math.random() * 900000));

      // Update Auth password
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(auth_user_id, { password: pinToPassword(pin) });
      if (updateErr) throw new Error(`Erreur reset mot de passe: ${updateErr.message}`);

      // Update pin_code hash in shelter_employees
      const hashedPin = await hashPin(pin);
      await supabaseAdmin.from("shelter_employees").update({ hashed_pin: hashedPin }).eq("id", employee_id);

      // Get employee info for email
      const { data: emp } = await supabaseAdmin.from("shelter_employees").select("name, email").eq("id", employee_id).single();

      // Send new PIN via email
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey && emp?.email) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
            body: JSON.stringify({
              from: "DogWork <noreply@resend.dev>",
              to: [emp.email],
              subject: "Nouveau code PIN DogWork",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                  <h1 style="color: #1a1a1a; font-size: 22px;">Nouveau code PIN 🔑</h1>
                  <p style="color: #555; font-size: 14px;">Bonjour <strong>${emp.name}</strong>,<br><br>Votre code PIN a été réinitialisé.</p>
                  <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
                    <p style="margin: 0 0 4px; color: #888; font-size: 12px;">Nouveau Code PIN</p>
                    <p style="margin: 0; font-size: 28px; font-weight: bold; color: #16a34a; letter-spacing: 6px;">${pin}</p>
                  </div>
                  <p style="color: #555; font-size: 13px;">Utilisez ce code comme mot de passe pour vous connecter.</p>
                </div>
              `,
            }),
          });
        } catch (emailErr) {
          console.error("Email send error:", emailErr);
        }
      }

      return new Response(JSON.stringify({ success: true, pin }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── CREATE EMPLOYEE ──
    const { name, email, role, job_title, phone, shelter_user_id } = body;

    if (!name || !email) throw new Error("Nom et email requis");

    const effectiveShelterId = isShelter ? caller.id : shelter_user_id;
    if (!effectiveShelterId) throw new Error("shelter_user_id requis");

    // Generate 6-digit PIN
    const pin = String(Math.floor(100000 + Math.random() * 900000));

    let userId: string;

    // Try to create the user directly; if duplicate, update password instead.
    // This avoids the expensive listUsers(perPage: 1000) call.
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: pinToPassword(pin),
      email_confirm: true,
      user_metadata: { display_name: name },
    });

    if (createError) {
      // Check if it's a duplicate email error
      if (createError.message?.includes("already been registered") || createError.message?.includes("already exists")) {
        // Look up existing user by email via admin API (single targeted call)
        const { data: existingList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
        // Unfortunately admin API doesn't support email filter, so we use a workaround:
        // Try signing in to get the user ID, or look up via profiles table
        const { data: profileMatch } = await supabaseAdmin
          .from("profiles")
          .select("user_id")
          .ilike("display_name", name)
          .limit(1);
        
        // More reliable: use the service role to get user by email via RPC or direct lookup
        // The Supabase admin.listUsers doesn't support email filter, but we can search
        // through auth.users via a targeted approach
        let existingUserId: string | null = null;
        
        // Search in shelter_employees first (most likely case for re-creation)
        const { data: existingEmpByEmail } = await supabaseAdmin
          .from("shelter_employees")
          .select("auth_user_id")
          .eq("email", email)
          .maybeSingle();
        
        if (existingEmpByEmail?.auth_user_id) {
          existingUserId = existingEmpByEmail.auth_user_id;
        } else {
          // Fall back: list a small page and search (only if employee not found)
          const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 50 });
          const found = usersPage?.users?.find((u) => u.email === email);
          if (found) existingUserId = found.id;
        }

        if (!existingUserId) throw new Error(`Erreur création compte: ${createError.message}`);
        
        userId = existingUserId;
        await supabaseAdmin.auth.admin.updateUserById(userId, { password: pinToPassword(pin) });
      } else {
        throw new Error(`Erreur création compte: ${createError.message}`);
      }
    } else {
      userId = newUser.user.id;
    }

    // Assign shelter_employee role — use upsert to avoid duplicate errors
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId).eq("role", "owner");
    const { error: roleError } = await supabaseAdmin.from("user_roles")
      .upsert({ user_id: userId, role: "shelter_employee" }, { onConflict: "user_id,role" });
    if (roleError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(`Erreur attribution rôle: ${roleError.message}`);
    }

    // Create employee record with hashed PIN (or update if already exists)
    const hashedPin = await hashPin(pin);

    // Check if employee record already exists for this auth_user_id
    const { data: existingEmp } = await supabaseAdmin
      .from("shelter_employees")
      .select("id")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (existingEmp) {
      // Update existing record
      const { error: updateEmpError } = await supabaseAdmin
        .from("shelter_employees")
        .update({ name, role: role || "soigneur", job_title: job_title || "", email, phone: phone || "", hashed_pin: hashedPin, is_active: true })
        .eq("id", existingEmp.id);
      if (updateEmpError) throw new Error(`Erreur mise à jour employé: ${updateEmpError.message}`);
    } else {
      const { error: empError } = await supabaseAdmin.from("shelter_employees").insert({
        shelter_user_id: effectiveShelterId,
        name,
        role: role || "soigneur",
        job_title: job_title || "",
        email,
        phone: phone || "",
        auth_user_id: userId,
        hashed_pin: hashedPin,
      });
      if (empError) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw new Error(`Erreur création employé: ${empError.message}`);
      }
    }

    // Create profile (non-critical, ignore conflict)
    await supabaseAdmin.from("profiles").upsert(
      { user_id: userId, display_name: name },
      { onConflict: "user_id" }
    );

    // Send PIN via email
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: "DogWork <noreply@resend.dev>",
            to: [email],
            subject: "Votre code de connexion DogWork",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                <h1 style="color: #1a1a1a; font-size: 22px;">Bienvenue sur DogWork 🐕</h1>
                <p style="color: #555; font-size: 14px;">Bonjour <strong>${name}</strong>,<br><br>Votre compte employé a été créé.</p>
                <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
                  <p style="margin: 0 0 4px; color: #888; font-size: 12px;">Email</p>
                  <p style="margin: 0 0 12px; font-size: 16px; font-weight: bold; color: #1a1a1a;">${email}</p>
                  <p style="margin: 0 0 4px; color: #888; font-size: 12px;">Code PIN</p>
                  <p style="margin: 0; font-size: 28px; font-weight: bold; color: #16a34a; letter-spacing: 6px;">${pin}</p>
                </div>
                <p style="color: #555; font-size: 13px;">Utilisez ce code comme mot de passe pour vous connecter.</p>
              </div>
            `,
          }),
        });
      } catch (emailErr) {
        console.error("Email send error:", emailErr);
      }
    }

    return new Response(JSON.stringify({ success: true, userId, pin }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? (error as Error).message : "Erreur inconnue";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
