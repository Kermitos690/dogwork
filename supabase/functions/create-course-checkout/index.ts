import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[COURSE-CHECKOUT] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("Non authentifié");
    logStep("User authenticated", { email: user.email });

    const { courseId } = await req.json();
    if (!courseId) throw new Error("courseId requis");

    // Fetch course details
    const { data: course, error: courseError } = await supabaseAdmin
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .eq("is_active", true)
      .eq("approval_status", "approved")
      .single();

    if (courseError || !course) throw new Error("Cours introuvable ou non disponible");
    logStep("Course found", { title: course.title, price: course.price_cents });

    // Check capacity
    const { count } = await supabaseAdmin
      .from("course_bookings")
      .select("*", { count: "exact", head: true })
      .eq("course_id", courseId)
      .in("status", ["confirmed", "pending"]);

    if ((count || 0) >= (course.max_participants || 10)) {
      throw new Error("Ce cours est complet");
    }

    // Check if user already booked
    const { data: existingBooking } = await supabaseAdmin
      .from("course_bookings")
      .select("id")
      .eq("course_id", courseId)
      .eq("user_id", user.id)
      .in("status", ["confirmed", "pending"])
      .maybeSingle();

    if (existingBooking) throw new Error("Vous êtes déjà inscrit à ce cours");

    const commissionCents = Math.round(course.price_cents * (course.commission_rate || 0.30));

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

    if (bookingError) throw bookingError;
    logStep("Booking created", { bookingId: booking.id });

    // Create Stripe checkout
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) customerId = customers.data[0].id;

    const origin = req.headers.get("origin") || "https://dogwork.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{
        price_data: {
          currency: "chf",
          product_data: {
            name: course.title,
            description: `Cours avec ${course.location || "lieu à confirmer"} — ${course.duration_minutes || 60} min`,
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
    });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url, bookingId: booking.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
