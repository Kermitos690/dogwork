import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const { name, email, role, job_title, phone, shelter_user_id } = await req.json();

    if (!name || !email) throw new Error("Nom et email requis");

    // Determine the shelter_user_id (shelter uses own id, admin must provide it)
    const effectiveShelterId = isShelter ? caller.id : shelter_user_id;
    if (!effectiveShelterId) throw new Error("shelter_user_id requis");

    // Generate 6-digit PIN
    const pin = String(Math.floor(100000 + Math.random() * 900000));

    // Create auth user with PIN as password
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: pin,
      email_confirm: true,
      user_metadata: { display_name: name },
    });
    if (createError) throw new Error(`Erreur création compte: ${createError.message}`);

    const userId = newUser.user.id;

    // Assign shelter_employee role
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role: "shelter_employee",
    });
    if (roleError) {
      // Cleanup: delete created user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(`Erreur attribution rôle: ${roleError.message}`);
    }

    // Create employee record linked to auth user
    const { error: empError } = await supabaseAdmin.from("shelter_employees").insert({
      shelter_user_id: effectiveShelterId,
      name,
      role: role || "soigneur",
      job_title: job_title || "",
      email,
      phone: phone || "",
      auth_user_id: userId,
      pin_code: pin,
    });
    if (empError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(`Erreur création employé: ${empError.message}`);
    }

    // Create profile for the employee
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      user_id: userId,
      display_name: name,
    });
    // Profile error is non-critical (trigger may have created it)

    // Send PIN via email using Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "DogWork <noreply@resend.dev>",
            to: [email],
            subject: "Votre code de connexion DogWork",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                <h1 style="color: #1a1a1a; font-size: 22px;">Bienvenue sur DogWork 🐕</h1>
                <p style="color: #555; font-size: 14px;">
                  Bonjour <strong>${name}</strong>,<br><br>
                  Votre compte employé a été créé. Voici vos identifiants de connexion :
                </p>
                <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
                  <p style="margin: 0 0 4px; color: #888; font-size: 12px;">Email</p>
                  <p style="margin: 0 0 12px; font-size: 16px; font-weight: bold; color: #1a1a1a;">${email}</p>
                  <p style="margin: 0 0 4px; color: #888; font-size: 12px;">Code PIN</p>
                  <p style="margin: 0; font-size: 28px; font-weight: bold; color: #16a34a; letter-spacing: 6px;">${pin}</p>
                </div>
                <p style="color: #555; font-size: 13px;">
                  Utilisez ce code comme mot de passe pour vous connecter à l'application.
                </p>
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
