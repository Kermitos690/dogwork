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

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find events starting in the next 24 hours
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

    const sendReminder = async (recipientEmail: string, recipientName: string, role: "coach" | "client", event: any, otherPartyName: string) => {
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "appointment-reminder",
            recipientEmail,
            idempotencyKey: `reminder-${event.id}-${role}`,
            templateData: {
              name: recipientName,
              role,
              eventTitle: event.title || "Rendez-vous",
              startAt: event.start_at,
              location: event.location || null,
              otherPartyName,
            },
          },
        });
        sentCount++;
      } catch (e) {
        console.error("Reminder send error:", (e as Error).message);
      }
    };

    for (const event of events) {
      const { data: coachAuth } = await supabase.auth.admin.getUserById(event.coach_user_id);
      const coachEmail = coachAuth?.user?.email;
      const coachName = coachAuth?.user?.user_metadata?.display_name || "Coach";

      let clientEmail: string | null = null;
      let clientName = "Client";
      if (event.client_user_id) {
        const { data: clientAuth } = await supabase.auth.admin.getUserById(event.client_user_id);
        clientEmail = clientAuth?.user?.email || null;
        clientName = clientAuth?.user?.user_metadata?.display_name || "Client";
      }

      if (coachEmail) await sendReminder(coachEmail, coachName, "coach", event, clientName);
      if (clientEmail) await sendReminder(clientEmail, clientName, "client", event, coachName);
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
