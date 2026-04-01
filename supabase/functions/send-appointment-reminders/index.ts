import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // P0-2: Require either a cron secret or an authenticated admin
  const cronSecret = Deno.env.get("CRON_SECRET");
  const incomingSecret = req.headers.get("x-cron-secret");

  if (cronSecret && incomingSecret === cronSecret) {
    // Authorized via cron secret — proceed
  } else {
    // Fall back to JWT auth + admin check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin role
    const userId = userData.user.id;
    const { data: isAdmin } = await supabaseAuth.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find events starting in the next 24 hours that haven't been reminded
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: events, error: eventsErr } = await supabase
      .from("coach_calendar_events")
      .select("*")
      .gte("start_at", now.toISOString())
      .lte("start_at", in24h.toISOString())
      .neq("event_type", "availability")
      .eq("status", "confirmed");

    if (eventsErr) throw eventsErr;

    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ message: "No upcoming events to remind" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;

    for (const event of events) {
      // Get coach email
      const { data: coachAuth } = await supabase.auth.admin.getUserById(event.coach_user_id);
      const coachEmail = coachAuth?.user?.email;
      const coachName = coachAuth?.user?.user_metadata?.display_name || "Coach";

      // Get client email if exists
      let clientEmail: string | null = null;
      let clientName = "Client";
      if (event.client_user_id) {
        const { data: clientAuth } = await supabase.auth.admin.getUserById(event.client_user_id);
        clientEmail = clientAuth?.user?.email || null;
        clientName = clientAuth?.user?.user_metadata?.display_name || "Client";
      }

      const eventDate = new Date(event.start_at);
      const formattedDate = eventDate.toLocaleDateString("fr-CH", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      });

      const eventTitle = event.title || "Rendez-vous";
      const locationText = event.location ? `\nLieu : ${event.location}` : "";

      // Send reminder to coach
      if (coachEmail && resendApiKey) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "DogWork <noreply@notify.dogwork-at-home.com>",
            to: [coachEmail],
            subject: `🔔 Rappel : ${eventTitle} demain`,
            html: `
              <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; background: #ffffff; padding: 32px;">
                <h2 style="color: #1a1a2e; margin-bottom: 8px;">Rappel de rendez-vous</h2>
                <p style="color: #555; font-size: 14px;">Bonjour ${coachName},</p>
                <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 16px 0; border-left: 4px solid #10b981;">
                  <p style="margin: 0 0 8px; font-weight: 600; color: #1a1a2e;">${eventTitle}</p>
                  <p style="margin: 0 0 4px; color: #555; font-size: 13px;">📅 ${formattedDate}</p>
                  ${event.location ? `<p style="margin: 0 0 4px; color: #555; font-size: 13px;">📍 ${event.location}</p>` : ""}
                  ${event.client_user_id ? `<p style="margin: 0; color: #555; font-size: 13px;">👤 ${clientName}</p>` : ""}
                </div>
                <p style="color: #888; font-size: 12px;">— L'équipe DogWork</p>
              </div>
            `,
          }),
        });
        sentCount++;
      }

      // Send reminder to client
      if (clientEmail && resendApiKey) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "DogWork <noreply@notify.dogwork-at-home.com>",
            to: [clientEmail],
            subject: `🔔 Rappel : ${eventTitle} demain`,
            html: `
              <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; background: #ffffff; padding: 32px;">
                <h2 style="color: #1a1a2e; margin-bottom: 8px;">Rappel de rendez-vous</h2>
                <p style="color: #555; font-size: 14px;">Bonjour ${clientName},</p>
                <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 16px 0; border-left: 4px solid #3b82f6;">
                  <p style="margin: 0 0 8px; font-weight: 600; color: #1a1a2e;">${eventTitle}</p>
                  <p style="margin: 0 0 4px; color: #555; font-size: 13px;">📅 ${formattedDate}</p>
                  ${event.location ? `<p style="margin: 0 0 4px; color: #555; font-size: 13px;">📍 ${event.location}</p>` : ""}
                  <p style="margin: 0; color: #555; font-size: 13px;">🐕 Avec ${coachName}</p>
                </div>
                <p style="color: #888; font-size: 12px;">— L'équipe DogWork</p>
              </div>
            `,
          }),
        });
        sentCount++;
      }
    }

    return new Response(
      JSON.stringify({ message: `${sentCount} reminder(s) sent for ${events.length} event(s)` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
