import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// HTML escape helper to prevent injection
const esc = (s: string | null | undefined): string => {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;

    // Service role client for DB operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { type, data } = await req.json();
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = "DogWork <onboarding@resend.dev>";
    const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || "teba.gaetan@gmail.com";

    // --- Role checks for privileged notification types ---
    const privilegedTypes = ["course_approved", "course_rejected"];
    if (privilegedTypes.includes(type)) {
      const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: "Forbidden: admin role required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    let subject = "";
    let body = "";
    let to = ADMIN_EMAIL;

    switch (type) {
      case "course_created": {
        subject = `[DogWork] Nouveau cours à valider : ${esc(data.title)}`;
        body = `<h2>Nouveau cours soumis</h2>
          <p><strong>Titre :</strong> ${esc(data.title)}</p>
          <p><strong>Éducateur :</strong> ${esc(data.educatorName) || "Inconnu"}</p>
          <p><strong>Catégorie :</strong> ${esc(data.category) || "Général"}</p>
          <p><strong>Prix :</strong> ${((data.price_cents || 0) / 100).toFixed(0)} CHF</p>
          <p><strong>Lieu :</strong> ${esc(data.location) || "Non spécifié"}</p>
          <p>Connectez-vous au dashboard admin pour approuver ou refuser ce cours.</p>`;
        to = ADMIN_EMAIL;
        break;
      }
      case "course_approved": {
        if (!data.courseId) {
          return new Response(JSON.stringify({ error: "courseId required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: course, error: courseErr } = await supabaseAdmin
          .from("courses")
          .select("educator_user_id, title")
          .eq("id", data.courseId)
          .single();
        if (courseErr || !course) {
          return new Response(JSON.stringify({ error: "Course not found" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: educatorUser } = await supabaseAdmin.auth.admin.getUserById(course.educator_user_id);
        const educatorEmail = educatorUser?.user?.email;
        if (!educatorEmail) {
          return new Response(JSON.stringify({ error: "Educator email not found" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const courseTitle = esc(course.title);
        subject = `[DogWork] Votre cours "${courseTitle}" a été approuvé ✅`;
        body = `<h2>Cours approuvé</h2>
          <p>Votre cours <strong>${courseTitle}</strong> a été validé par l'administration.</p>
          <p>Il est maintenant visible par les utilisateurs et peut recevoir des réservations.</p>`;
        to = educatorEmail;
        break;
      }
      case "course_rejected": {
        if (!data.courseId) {
          return new Response(JSON.stringify({ error: "courseId required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: rejCourse, error: rejErr } = await supabaseAdmin
          .from("courses")
          .select("educator_user_id, title")
          .eq("id", data.courseId)
          .single();
        if (rejErr || !rejCourse) {
          return new Response(JSON.stringify({ error: "Course not found" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: rejEducatorUser } = await supabaseAdmin.auth.admin.getUserById(rejCourse.educator_user_id);
        const rejEducatorEmail = rejEducatorUser?.user?.email;
        if (!rejEducatorEmail) {
          return new Response(JSON.stringify({ error: "Educator email not found" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const rejTitle = esc(rejCourse.title);
        subject = `[DogWork] Votre cours "${rejTitle}" a été refusé ❌`;
        body = `<h2>Cours refusé</h2>
          <p>Votre cours <strong>${rejTitle}</strong> n'a pas été validé.</p>
          <p>Contactez l'administration pour plus de détails.</p>`;
        to = rejEducatorEmail;
        break;
      }
      case "booking_confirmed": {
        if (!data.bookingId) {
          return new Response(JSON.stringify({ error: "bookingId required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: booking, error: bookErr } = await supabaseAdmin
          .from("course_bookings")
          .select("user_id, course_id")
          .eq("id", data.bookingId)
          .single();
        if (bookErr || !booking) {
          return new Response(JSON.stringify({ error: "Booking not found" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Verify the caller is the booking owner or an admin
        const { data: callerIsAdmin } = await supabaseAdmin.rpc("has_role", {
          _user_id: userId,
          _role: "admin",
        });
        if (booking.user_id !== userId && !callerIsAdmin) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: bookingUser } = await supabaseAdmin.auth.admin.getUserById(booking.user_id);
        const bookingEmail = bookingUser?.user?.email;
        if (!bookingEmail) {
          return new Response(JSON.stringify({ error: "User email not found" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: bookingCourse } = await supabaseAdmin
          .from("courses")
          .select("title, location, next_session_at")
          .eq("id", booking.course_id)
          .single();
        const bTitle = esc(bookingCourse?.title ?? "Cours");
        subject = `[DogWork] Réservation confirmée pour "${bTitle}"`;
        body = `<h2>Réservation confirmée 🎉</h2>
          <p>Votre réservation pour le cours <strong>${bTitle}</strong> a été confirmée.</p>
          ${bookingCourse?.next_session_at ? `<p><strong>Date :</strong> ${esc(bookingCourse.next_session_at)}</p>` : ""}
          ${bookingCourse?.location ? `<p><strong>Lieu :</strong> ${esc(bookingCourse.location)}</p>` : ""}
          <p>Rendez-vous le jour J !</p>`;
        to = bookingEmail;
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
        console.error("Resend error (non-blocking):", err);
        return new Response(JSON.stringify({ success: true, warning: "Email could not be delivered (sandbox mode)", subject }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("Notification error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
