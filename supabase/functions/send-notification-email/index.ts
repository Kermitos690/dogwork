import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = "DogWork <noreply@dogwork.lovable.app>";
    const ADMIN_EMAIL = "teba.gaetan@gmail.com";

    let subject = "";
    let body = "";
    let to = ADMIN_EMAIL;

    switch (type) {
      case "course_created": {
        subject = `[DogWork] Nouveau cours à valider : ${data.title}`;
        body = `<h2>Nouveau cours soumis</h2>
          <p><strong>Titre :</strong> ${data.title}</p>
          <p><strong>Éducateur :</strong> ${data.educatorName || "Inconnu"}</p>
          <p><strong>Catégorie :</strong> ${data.category || "Général"}</p>
          <p><strong>Prix :</strong> ${((data.price_cents || 0) / 100).toFixed(0)} CHF</p>
          <p><strong>Lieu :</strong> ${data.location || "Non spécifié"}</p>
          <p>Connectez-vous au dashboard admin pour approuver ou refuser ce cours.</p>`;
        to = ADMIN_EMAIL;
        break;
      }
      case "course_approved": {
        subject = `[DogWork] Votre cours "${data.title}" a été approuvé ✅`;
        body = `<h2>Cours approuvé</h2>
          <p>Votre cours <strong>${data.title}</strong> a été validé par l'administration.</p>
          <p>Il est maintenant visible par les utilisateurs et peut recevoir des réservations.</p>`;
        to = data.educatorEmail || ADMIN_EMAIL;
        break;
      }
      case "course_rejected": {
        subject = `[DogWork] Votre cours "${data.title}" a été refusé ❌`;
        body = `<h2>Cours refusé</h2>
          <p>Votre cours <strong>${data.title}</strong> n'a pas été validé.</p>
          <p>Contactez l'administration pour plus de détails.</p>`;
        to = data.educatorEmail || ADMIN_EMAIL;
        break;
      }
      case "booking_confirmed": {
        subject = `[DogWork] Réservation confirmée pour "${data.courseTitle}"`;
        body = `<h2>Réservation confirmée 🎉</h2>
          <p>Votre réservation pour le cours <strong>${data.courseTitle}</strong> a été confirmée.</p>
          ${data.sessionDate ? `<p><strong>Date :</strong> ${data.sessionDate}</p>` : ""}
          ${data.location ? `<p><strong>Lieu :</strong> ${data.location}</p>` : ""}
          <p>Rendez-vous le jour J !</p>`;
        to = data.userEmail || ADMIN_EMAIL;
        break;
      }
      default:
        return new Response(JSON.stringify({ error: "Unknown notification type" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
    }

    // Send via Resend if key is configured, otherwise log
    if (RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [to],
          subject,
          html: body,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("Resend error:", err);
        return new Response(JSON.stringify({ error: "Email send failed", details: err }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }

      const result = await res.json();
      console.log("Email sent via Resend:", result);
    } else {
      console.log(`[FALLBACK] Email not sent (no RESEND_API_KEY). Subject: ${subject}, To: ${to}`);
    }

    return new Response(JSON.stringify({ success: true, subject }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Notification error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
