import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-COURSE-WEBHOOK] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const recordEvent = async (
    eventId: string,
    eventType: string,
    payload: unknown,
    status: "success" | "error",
    error?: string,
  ) => {
    try {
      await supabase.from("billing_events").upsert(
        {
          stripe_event_id: eventId,
          event_type: eventType,
          payload: payload as object,
          processing_status: status,
          processing_error: error ?? null,
        },
        { onConflict: "stripe_event_id" },
      );
    } catch (e) {
      log("billing_events insert failed", { e: (e as Error).message });
    }
  };

  try {
    // === Startup logs (no secrets exposed) ===
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
    const detectedMode = stripeKey.startsWith("sk_live_") || stripeKey.startsWith("rk_live_")
      ? "live"
      : stripeKey.startsWith("sk_test_") || stripeKey.startsWith("rk_test_")
      ? "test"
      : "unknown";
    log("Webhook hit", { mode: detectedMode });

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      log("Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "Missing stripe-signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Connect webhook MUST use the Connect-specific endpoint secret.
    // We try Connect first, then fall back to the platform webhook secret to ease migration.
    const connectSecret = Deno.env.get("STRIPE_CONNECT_WEBHOOK_SECRET");
    const platformSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const webhookSecret = connectSecret || platformSecret;
    if (!webhookSecret) {
      log("No webhook secret configured (STRIPE_CONNECT_WEBHOOK_SECRET / STRIPE_WEBHOOK_SECRET)");
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (sigErr) {
      // If Connect secret failed, attempt platform secret as a graceful fallback
      if (connectSecret && platformSecret && connectSecret !== platformSecret) {
        try {
          event = await stripe.webhooks.constructEventAsync(body, signature, platformSecret);
          log("Signature verified with PLATFORM secret (Connect secret rejected)");
        } catch (sigErr2) {
          log("Signature verification failed with both secrets", { error: (sigErr2 as Error).message });
          return new Response(JSON.stringify({ error: "Invalid signature" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        log("Signature verification failed", { error: (sigErr as Error).message });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const connectedAccountId = (event as any).account ?? null;
    const sessionId = (event.data.object as any)?.id ?? null;
    log("Event verified", {
      type: event.type,
      id: event.id,
      mode: detectedMode,
      connected_account: connectedAccountId,
      session_id: sessionId,
    });

    // Idempotence : si déjà traité avec succès, on sort
    const { data: existing } = await supabase
      .from("billing_events")
      .select("processing_status")
      .eq("stripe_event_id", event.id)
      .maybeSingle();
    if (existing?.processing_status === "success") {
      log("Event already processed", { id: event.id });
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = session.metadata ?? {};
        const bookingId = meta.booking_id;
        const courseId = meta.course_id;
        const origin = meta.acquisition_source || meta.origin || "dogwork_marketplace";
        const referralCode = meta.referral_code || null;

        if (!bookingId || !courseId) {
          log("No booking_id/course_id metadata, skipping");
          await recordEvent(event.id, event.type, event, "success");
          break;
        }

        const { data: booking, error: bookingErr } = await supabase
          .from("course_bookings")
          .select("*")
          .eq("id", bookingId)
          .maybeSingle();
        if (bookingErr || !booking) throw new Error(`Booking ${bookingId} not found`);

        const { data: course } = await supabase
          .from("courses")
          .select("id, educator_user_id, max_participants, price_cents, title")
          .eq("id", courseId)
          .maybeSingle();
        if (!course) throw new Error(`Course ${courseId} not found`);

        const amountCents = session.amount_total ?? booking.amount_cents ?? course.price_cents;
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null;

        // Calcul commission côté serveur (autoritaire)
        const { data: commJson, error: commErr } = await supabase.rpc(
          "calculate_course_commission",
          {
            p_course_id: courseId,
            p_user_id: booking.user_id,
            p_origin: origin,
            p_referral_code: referralCode,
            p_amount_cents: amountCents,
          },
        );
        if (commErr) throw commErr;
        const c = commJson as {
          commission_rate: number;
          commission_cents: number;
          educator_payout_cents: number;
          applied_origin: string;
          referral_code_valid: boolean;
          referral_code_id: string | null;
        };

        const now = new Date().toISOString();

        // Mise à jour booking
        const { error: updErr } = await supabase
          .from("course_bookings")
          .update({
            payment_status: "paid",
            status: "confirmed",
            stripe_session_id: session.id,
            stripe_payment_intent_id: paymentIntentId,
            paid_at: now,
            confirmed_at: now,
            source_checked_at: now,
            applied_commission_rate: c.commission_rate,
            commission_cents: c.commission_cents,
            educator_payout_cents: c.educator_payout_cents,
            origin: c.applied_origin,
            referral_code_id: c.referral_code_id,
            amount_cents: amountCents,
          })
          .eq("id", bookingId);
        if (updErr) throw updErr;

        // Participant auto (UNIQUE course_id+booking_id garanti par contrainte)
        await supabase
          .from("course_participants")
          .upsert(
            {
              course_id: courseId,
              booking_id: bookingId,
              owner_id: booking.user_id,
              dog_id: booking.dog_id,
              status: "registered",
              checked_in: false,
            },
            { onConflict: "course_id,booking_id" },
          );

        // Référencement attribution (best effort)
        if (c.referral_code_id) {
          await supabase
            .from("referral_attributions")
            .upsert(
              {
                referral_code_id: c.referral_code_id,
                referred_user_id: booking.user_id,
                educator_user_id: course.educator_user_id,
              },
              { onConflict: "referred_user_id" },
            );
        }

        // Vérif capacité → flag si dépassement
        const { count: paidCount } = await supabase
          .from("course_bookings")
          .select("id", { count: "exact", head: true })
          .eq("course_id", courseId)
          .eq("payment_status", "paid");
        if ((paidCount ?? 0) > (course.max_participants ?? 10)) {
          await supabase.from("marketplace_policy_flags").insert({
            educator_id: course.educator_user_id,
            course_id: courseId,
            booking_id: bookingId,
            user_id: booking.user_id,
            flag_type: "participant_mismatch",
            severity: "high",
            description: `Capacité dépassée : ${paidCount}/${course.max_participants}`,
            status: "open",
          });
        }

        await recordEvent(event.id, event.type, event, "success");
        log("Booking confirmed", { bookingId, rate: c.commission_rate, payout: c.educator_payout_cents });
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const bookingId = pi.metadata?.booking_id;
        if (bookingId) {
          await supabase
            .from("course_bookings")
            .update({
              payment_status: "failed",
              stripe_payment_intent_id: pi.id,
            })
            .eq("id", bookingId);
        }
        await recordEvent(event.id, event.type, event, "success");
        break;
      }

      case "charge.refunded":
      case "charge.refund.updated": {
        const charge = event.data.object as Stripe.Charge;
        const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
        if (piId) {
          const { data: booking } = await supabase
            .from("course_bookings")
            .select("id, course_id, user_id, educator_payout_cents")
            .eq("stripe_payment_intent_id", piId)
            .maybeSingle();
          if (booking) {
            await supabase
              .from("course_bookings")
              .update({
                payment_status: "refunded",
                status: "refunded",
                refunded_at: new Date().toISOString(),
                refund_reason: charge.refunds?.data?.[0]?.reason ?? "stripe_refund",
              })
              .eq("id", booking.id);
            await supabase
              .from("course_participants")
              .update({ status: "cancelled" })
              .eq("booking_id", booking.id);
          }
        }
        await recordEvent(event.id, event.type, event, "success");
        break;
      }

      case "payment_intent.succeeded": {
        // Sécurité : si checkout.session.completed n'a pas eu lieu, on fait un fallback
        const pi = event.data.object as Stripe.PaymentIntent;
        const bookingId = pi.metadata?.booking_id;
        if (bookingId) {
          const { data: booking } = await supabase
            .from("course_bookings")
            .select("id, payment_status")
            .eq("id", bookingId)
            .maybeSingle();
          if (booking && booking.payment_status !== "paid") {
            await supabase
              .from("course_bookings")
              .update({
                stripe_payment_intent_id: pi.id,
              })
              .eq("id", bookingId);
          }
        }
        await recordEvent(event.id, event.type, event, "success");
        break;
      }

      default:
        log("Unhandled event", { type: event.type });
        await recordEvent(event.id, event.type, event, "success");
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
