import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const ADMIN_EMAIL = "teba.gaetan@gmail.com";

    let subject = "";
    let body = "";

    switch (type) {
      case "course_created": {
        // Notify admin that a new course needs approval
        subject = `[DogWork] Nouveau cours à valider : ${data.title}`;
        body = `
          <h2>Nouveau cours soumis</h2>
          <p><strong>Titre :</strong> ${data.title}</p>
          <p><strong>Éducateur :</strong> ${data.educatorName || "Inconnu"}</p>
          <p><strong>Catégorie :</strong> ${data.category || "Général"}</p>
          <p><strong>Prix :</strong> ${((data.price_cents || 0) / 100).toFixed(0)} CHF</p>
          <p><strong>Lieu :</strong> ${data.location || "Non spécifié"}</p>
          <p>Connectez-vous au dashboard admin pour approuver ou refuser ce cours.</p>
        `;
        // Send to admin
        console.log(`Notification email to admin: ${subject}`);
        break;
      }
      case "course_approved": {
        subject = `[DogWork] Votre cours "${data.title}" a été approuvé ✅`;
        body = `
          <h2>Cours approuvé</h2>
          <p>Votre cours <strong>${data.title}</strong> a été validé par l'administration.</p>
          <p>Il est maintenant visible par les utilisateurs et peut recevoir des réservations.</p>
        `;
        console.log(`Notification email to educator: ${subject}`);
        break;
      }
      case "course_rejected": {
        subject = `[DogWork] Votre cours "${data.title}" a été refusé ❌`;
        body = `
          <h2>Cours refusé</h2>
          <p>Votre cours <strong>${data.title}</strong> n'a pas été validé.</p>
          <p>Contactez l'administration pour plus de détails.</p>
        `;
        console.log(`Notification email to educator: ${subject}`);
        break;
      }
      case "booking_confirmed": {
        subject = `[DogWork] Réservation confirmée pour "${data.courseTitle}"`;
        body = `
          <h2>Réservation confirmée 🎉</h2>
          <p>Votre réservation pour le cours <strong>${data.courseTitle}</strong> a été confirmée.</p>
          ${data.sessionDate ? `<p><strong>Date :</strong> ${data.sessionDate}</p>` : ""}
          ${data.location ? `<p><strong>Lieu :</strong> ${data.location}</p>` : ""}
          <p>Rendez-vous le jour J !</p>
        `;
        console.log(`Booking confirmation email: ${subject}`);
        break;
      }
      default:
        return new Response(JSON.stringify({ error: "Unknown notification type" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
    }

    // Log the notification (actual email sending would use a transactional email service)
    console.log(`Email notification [${type}]: ${subject}`);
    console.log(`Body: ${body}`);

    return new Response(JSON.stringify({ success: true, subject }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Notification error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
