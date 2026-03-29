import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[COURSE-CHECKOUT] ${step}${d}`);
};

const PLATFORM_COMMISSION_RATE = 0.158; // 15.8%

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Configuration serveur incomplète");

    // ── Auth via getClaims pattern (ES256 compatible) ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      logStep("Auth failed", { error: claimsError?.message });
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = { id: claimsData.claims.sub as string, email: claimsData.claims.email as string };
    if (!user.email) {
      return new Response(JSON.stringify({ error: "Email requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    logStep("User authenticated", { userId: user.id });

    // ── Input validation ──
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Corps de requête invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const courseId = typeof body.courseId === "string" ? body.courseId.trim() : "";
    if (!courseId || courseId.length < 10) {
      return new Response(JSON.stringify({ error: "courseId invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Service role client for DB operations ──
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Fetch course details
    const { data: course, error: courseError } = await supabaseAdmin
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .eq("is_active", true)
      .eq("approval_status", "approved")
      .single();

    if (courseError || !course) {
      return new Response(JSON.stringify({ error: "Cours introuvable ou non disponible" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    logStep("Course found", { title: course.title, price: course.price_cents });

    // Validate price
    if (!course.price_cents || course.price_cents <= 0) {
      return new Response(JSON.stringify({ error: "Prix du cours invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check capacity
    const { count } = await supabaseAdmin
      .from("course_bookings")
      .select("*", { count: "exact", head: true })
      .eq("course_id", courseId)
      .in("status", ["confirmed", "pending"]);

    if ((count || 0) >= (course.max_participants || 10)) {
      return new Response(JSON.stringify({ error: "Ce cours est complet" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check existing booking
    const { data: existingBooking } = await supabaseAdmin
      .from("course_bookings")
      .select("id, status, payment_status")
      .eq("course_id", courseId)
      .eq("user_id", user.id)
      .in("status", ["confirmed", "pending"])
      .maybeSingle();

    if (existingBooking) {
      if (existingBooking.status === "confirmed") {
        return new Response(JSON.stringify({ error: "Vous êtes déjà inscrit à ce cours" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (existingBooking.status === "pending" && existingBooking.payment_status === "unpaid") {
        await supabaseAdmin.from("course_bookings").delete().eq("id", existingBooking.id);
        logStep("Deleted stale unpaid booking", { id: existingBooking.id });
      } else {
        return new Response(JSON.stringify({ error: "Vous êtes déjà inscrit à ce cours" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const commissionCents = Math.round(course.price_cents * PLATFORM_COMMISSION_RATE);

    // Create pending booking
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("course_bookings")
      .insert({
        course_id: courseId,
        user_id: user.id,
        amount_cents: course.price_cents,
        commission_cents: commissionCents,
        status: "pending",
        payment_status: "unpaid",
      })
      .select()
      .single();

    if (bookingError) {
      logStep("Booking creation failed", { error: bookingError.message });
      return new Response(JSON.stringify({ error: "Impossible de créer la réservation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    logStep("Booking created", { bookingId: booking.id });

    // Get educator's Stripe Connect account
    const { data: stripeData } = await supabaseAdmin
      .from("coach_stripe_data")
      .select("stripe_account_id, stripe_onboarding_complete")
      .eq("user_id", course.educator_user_id)
      .maybeSingle();

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    const origin = req.headers.get("origin") || "https://www.dogwork-at-home.com";

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{
        price_data: {
          currency: "chf",
          product_data: {
            name: course.title,
            description: `Cours — ${course.duration_minutes || 60} min`,
          },
          unit_amount: course.price_cents,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${origin}/courses?success=true&booking=${booking.id}`,
      cancel_url: `${origin}/courses?canceled=true`,
      metadata: {
        booking_id: booking.id,
        course_id: courseId,
        user_id: user.id,
        commission_cents: commissionCents.toString(),
      },
    };

    // Stripe Connect destination charges
    if (stripeData?.stripe_account_id && stripeData?.stripe_onboarding_complete) {
      sessionParams.payment_intent_data = {
        application_fee_amount: commissionCents,
        transfer_data: { destination: stripeData.stripe_account_id },
      };
      logStep("Using Stripe Connect", { destination: stripeData.stripe_account_id });
    } else {
      logStep("Payment goes to platform directly");
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url, bookingId: booking.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur interne";
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: "Une erreur est survenue lors de la création du paiement" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
