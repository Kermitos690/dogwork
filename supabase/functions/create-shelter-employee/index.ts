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

    // Verify caller is shelter or admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Non autorisé");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) throw new Error("Non autorisé");

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

      // Update pin_code hash in shelter_employees (clear pin removed)
      const hashedPin = await hashPin(pin);
      await supabaseAdmin.from("shelter_employees").update({ pin_code: "******", hashed_pin: hashedPin }).eq("id", employee_id);

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

    // Check if user already exists — targeted lookup instead of listing all users
    const { data: { users: matchedUsers }, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    // Use a more targeted approach: try to create, catch duplicate
    let existingUser = null;
    // Search by email in the full list (Supabase Admin API doesn't support email filter directly)
    const { data: allUsersData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (allUsersData?.users) {
      existingUser = allUsersData.users.find((u: any) => u.email === email);
    }

    if (existingUser) {
      userId = existingUser.id;
      await supabaseAdmin.auth.admin.updateUserById(userId, { password: pinToPassword(pin) });
    } else {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: pinToPassword(pin),
        email_confirm: true,
        user_metadata: { display_name: name },
      });
      if (createError) throw new Error(`Erreur création compte: ${createError.message}`);
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

    // Create employee record with hashed PIN
    const hashedPin = await hashPin(pin);
    const { error: empError } = await supabaseAdmin.from("shelter_employees").insert({
      shelter_user_id: effectiveShelterId,
      name,
      role: role || "soigneur",
      job_title: job_title || "",
      email,
      phone: phone || "",
      auth_user_id: userId,
      pin_code: "******",
      hashed_pin: hashedPin,
    });
    if (empError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(`Erreur création employé: ${empError.message}`);
    }

    // Create profile (non-critical)
    await supabaseAdmin.from("profiles").insert({ user_id: userId, display_name: name });

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
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
