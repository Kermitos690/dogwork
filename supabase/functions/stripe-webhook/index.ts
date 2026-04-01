import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const PRODUCT_TIER_MAP: Record<string, string> = {
  "prod_U83i1wbeLdd3EI": "pro",
  "prod_U83inCbv8JMMgf": "expert",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${d}`);
};

// ── Helper: resolve userId from Stripe customerId ──
async function resolveUserId(
  supabaseAdmin: any,
  customerId: string
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("stripe_customers")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.user_id || null;
}

// ── Helper: sync subscription tier from Stripe ──
async function syncTierFromStripe(
  stripe: Stripe,
  supabaseAdmin: any,
  customerId: string,
  userId: string
) {
  try {
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    let tier = "starter";
    for (const sub of subs.data) {
      for (const item of sub.items.data) {
        const productId =
          typeof item.price.product === "string"
            ? item.price.product
            : (item.price.product as any)?.id;
        const mapped = PRODUCT_TIER_MAP[productId];
        if (mapped === "expert") {
          tier = "expert";
          break;
        }
        if (mapped === "pro" && tier !== "expert") tier = "pro";
      }
      if (tier === "expert") break;
    }

    await supabaseAdmin.from("stripe_customers").upsert(
      {
        user_id: userId,
        stripe_customer_id: customerId,
        current_tier: tier,
      },
      { onConflict: "user_id" }
    );

    logStep("Tier synced", { userId, tier });
  } catch (e) {
    logStep("Tier sync error", { error: (e as Error).message });
  }
}

// ── Helper: log billing event with error handling ──
async function logBillingEvent(
  supabaseAdmin: any,
  eventId: string,
  eventType: string,
  payload: any,
  userId?: string | null,
  connectedAccountId?: string | null,
  processingStatus = "success",
  processingError?: string | null
) {
  await supabaseAdmin.from("billing_events").insert({
    stripe_event_id: eventId,
    event_type: eventType,
    payload,
    user_id: userId || null,
    connected_account_id: connectedAccountId || null,
    processing_status: processingStatus,
    processing_error: processingError || null,
  });
}

async function updateBillingEventUser(
  supabaseAdmin: any,
  eventId: string,
  userId: string
) {
  await supabaseAdmin
    .from("billing_events")
    .update({ user_id: userId })
    .eq("stripe_event_id", eventId);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey || !webhookSecret) {
      throw new Error("Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    if (!sig) {
      return new Response("Missing stripe-signature header", { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } catch (err) {
      logStep("Signature verification failed", {
        error: (err as Error).message,
      });
      return new Response("Webhook signature verification failed", {
        status: 400,
      });
    }

    logStep("Event received", { type: event.type, id: event.id });

    // Detect Connect events (event.account is set for connected account events)
    const connectedAccountId = (event as any).account || null;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // ── Idempotence: UNIQUE constraint on stripe_event_id prevents doubles ──
    const { data: existingEvent } = await supabaseAdmin
      .from("billing_events")
      .select("id")
      .eq("stripe_event_id", event.id)
      .maybeSingle();

    if (existingEvent) {
      logStep("Event already processed, skipping", { id: event.id });
      return new Response(
        JSON.stringify({ received: true, skipped: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Log the event immediately (with connected_account_id if present)
    await logBillingEvent(
      supabaseAdmin,
      event.id,
      event.type,
      event.data.object as any,
      null,
      connectedAccountId
    );

    // ══════════════════════════════════════════════════
    //  EVENT HANDLERS
    // ══════════════════════════════════════════════════

    switch (event.type) {
      // ─────────────────────────────────────────────
      // CHECKOUT SESSION COMPLETED
      // ─────────────────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // ── AI CREDIT PACK PURCHASE ──
        if (
          session.mode === "payment" &&
          session.metadata?.type === "ai_credits"
        ) {
          const userId = session.metadata.user_id;
          const credits = parseInt(session.metadata.credits || "0");
          const packSlug = session.metadata.pack_slug;

          if (userId && credits > 0) {
            const pricePaid = (session.amount_total || 0) / 100;
            try {
              await supabaseAdmin.rpc("credit_ai_wallet", {
                _user_id: userId,
                _credits: credits,
                _operation_type: "purchase",
                _description: `Achat pack ${packSlug} (${credits} crédits)`,
                _stripe_payment_id: session.payment_intent as string,
                _public_price_chf: pricePaid,
              });
              await updateBillingEventUser(supabaseAdmin, event.id, userId);
              logStep("AI credits purchased", {
                userId,
                credits,
                packSlug,
                pricePaid,
              });
            } catch (e) {
              const errMsg = (e as Error).message;
              logStep("ERROR crediting wallet", { userId, error: errMsg });
              await supabaseAdmin
                .from("billing_events")
                .update({
                  user_id: userId,
                  processing_status: "error",
                  processing_error: errMsg,
                })
                .eq("stripe_event_id", event.id);
            }
          }
          break;
        }

        // ── COURSE BOOKING (marketplace / Connect) ──
        if (
          session.mode === "payment" &&
          session.metadata?.booking_id
        ) {
          const bookingId = session.metadata.booking_id;
          const userId = session.metadata.user_id;

          const { error } = await supabaseAdmin
            .from("course_bookings")
            .update({ status: "confirmed", payment_status: "paid" })
            .eq("id", bookingId);

          if (error) {
            logStep("ERROR confirming booking", { bookingId, error: error.message });
            await supabaseAdmin
              .from("billing_events")
              .update({
                processing_status: "error",
                processing_error: error.message,
              })
              .eq("stripe_event_id", event.id);
          } else {
            logStep("Course booking confirmed", { bookingId });
          }

          if (userId) {
            await updateBillingEventUser(supabaseAdmin, event.id, userId);
          }
          break;
        }

        // ── SUBSCRIPTION CHECKOUT ──
        if (session.mode === "subscription" && session.customer) {
          const customerId = session.customer as string;
          const customerEmail =
            session.customer_email ||
            session.customer_details?.email;

          // Find user by email — paginated to handle large user bases
          let userId: string | null = null;
          if (customerEmail) {
            let page = 1;
            const perPage = 100;
            while (!userId) {
              const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
              if (!usersPage?.users || usersPage.users.length === 0) break;
              const found = usersPage.users.find(
                (u: any) => u.email?.toLowerCase() === customerEmail.toLowerCase()
              );
              if (found) userId = found.id;
              if (usersPage.users.length < perPage) break;
              page++;
            }
          }

          if (userId) {
            await supabaseAdmin.from("stripe_customers").upsert(
              {
                user_id: userId,
                stripe_customer_id: customerId,
                email: customerEmail,
              },
              { onConflict: "user_id" }
            );
            await updateBillingEventUser(supabaseAdmin, event.id, userId);
            await syncTierFromStripe(
              stripe,
              supabaseAdmin,
              customerId,
              userId
            );
            logStep("Subscription checkout completed", { userId, customerId });
          }
        }
        break;
      }

      // ─────────────────────────────────────────────
      // SUBSCRIPTION LIFECYCLE
      // ─────────────────────────────────────────────
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const userId = await resolveUserId(supabaseAdmin, customerId);

        if (userId) {
          await updateBillingEventUser(supabaseAdmin, event.id, userId);
          await syncTierFromStripe(stripe, supabaseAdmin, customerId, userId);
        }

        logStep("Subscription updated + tier synced", {
          status: subscription.status,
          customerId,
          userId,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const userId = await resolveUserId(supabaseAdmin, customerId);

        if (userId) {
          await updateBillingEventUser(supabaseAdmin, event.id, userId);
          await supabaseAdmin
            .from("stripe_customers")
            .update({ current_tier: "starter" })
            .eq("user_id", userId);
        }

        logStep("Subscription deleted, tier reset", { customerId, userId });
        break;
      }

      // ─────────────────────────────────────────────
      // INVOICE EVENTS
      // ─────────────────────────────────────────────
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const userId = await resolveUserId(supabaseAdmin, customerId);

        if (userId) {
          await updateBillingEventUser(supabaseAdmin, event.id, userId);
          await syncTierFromStripe(stripe, supabaseAdmin, customerId, userId);
        }

        logStep("Invoice paid, tier synced", { customerId, userId });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const userId = await resolveUserId(supabaseAdmin, customerId);

        if (userId) {
          await updateBillingEventUser(supabaseAdmin, event.id, userId);
        }

        // Note: we log but do not auto-suspend. Stripe handles retries.
        logStep("Invoice payment failed", { customerId, userId });
        break;
      }

      // ─────────────────────────────────────────────
      // REFUNDS
      // ─────────────────────────────────────────────
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const customerId = charge.customer as string;
        const userId = customerId
          ? await resolveUserId(supabaseAdmin, customerId)
          : null;

        if (userId) {
          await updateBillingEventUser(supabaseAdmin, event.id, userId);
        }

        // Check if this was an AI credit purchase refund via payment_intent metadata
        const paymentIntentId = charge.payment_intent as string;
        if (paymentIntentId && userId) {
          // Check if there's a ledger entry for this payment
          const { data: ledgerEntry } = await supabaseAdmin
            .from("ai_credit_ledger")
            .select("credits_delta")
            .eq("stripe_payment_id", paymentIntentId)
            .eq("operation_type", "purchase")
            .eq("status", "success")
            .maybeSingle();

          if (ledgerEntry) {
            // Debit the refunded credits
            const creditsToDebit = Math.abs(ledgerEntry.credits_delta);
            try {
              await supabaseAdmin.rpc("debit_ai_credits", {
                _user_id: userId,
                _feature_code: "refund_clawback",
                _credits: creditsToDebit,
                _metadata: { reason: "stripe_refund", charge_id: charge.id },
              });
              logStep("AI credits clawed back after refund", {
                userId,
                credits: creditsToDebit,
              });
            } catch (e) {
              logStep("WARNING: Could not claw back credits", {
                userId,
                error: (e as Error).message,
              });
            }
          }
        }

        logStep("Charge refunded", {
          chargeId: charge.id,
          customerId,
          userId,
          amount: charge.amount_refunded,
        });
        break;
      }

      // ─────────────────────────────────────────────
      // DISPUTES
      // ─────────────────────────────────────────────
      case "charge.dispute.created": {
        const dispute = event.data.object as any;
        const chargeId = dispute.charge;
        logStep("Dispute created — manual review needed", {
          disputeId: dispute.id,
          chargeId,
          amount: dispute.amount,
          reason: dispute.reason,
          connectedAccountId,
        });
        break;
      }

      // ─────────────────────────────────────────────
      // STRIPE CONNECT — ACCOUNT UPDATES
      // ─────────────────────────────────────────────
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const accountId = account.id;

        // Find educator by connect account id
        const { data: stripeData } = await supabaseAdmin
          .from("coach_stripe_data")
          .select("user_id, stripe_onboarding_complete")
          .eq("stripe_account_id", accountId)
          .maybeSingle();

        if (stripeData) {
          const isComplete =
            account.charges_enabled && account.payouts_enabled;
          const wasComplete = stripeData.stripe_onboarding_complete;

          // Update onboarding status if changed
          if (isComplete !== wasComplete) {
            await supabaseAdmin
              .from("coach_stripe_data")
              .update({ stripe_onboarding_complete: isComplete })
              .eq("stripe_account_id", accountId);

            logStep("Connect account status updated", {
              accountId,
              userId: stripeData.user_id,
              charges_enabled: account.charges_enabled,
              payouts_enabled: account.payouts_enabled,
              onboarding_complete: isComplete,
            });
          }

          await updateBillingEventUser(
            supabaseAdmin,
            event.id,
            stripeData.user_id
          );

          // Log capability restrictions
          if (
            account.requirements?.currently_due &&
            account.requirements.currently_due.length > 0
          ) {
            logStep("Connect account has pending requirements", {
              accountId,
              currently_due: account.requirements.currently_due,
            });
          }

          if (
            account.requirements?.disabled_reason
          ) {
            logStep("Connect account restricted", {
              accountId,
              disabled_reason: account.requirements.disabled_reason,
            });
          }
        } else {
          logStep("Connect account.updated for unknown account", { accountId });
        }
        break;
      }

      // ─────────────────────────────────────────────
      // STRIPE CONNECT — PAYOUT EVENTS
      // ─────────────────────────────────────────────
      case "payout.failed": {
        const payout = event.data.object as any;
        logStep("Payout failed — manual review needed", {
          payoutId: payout.id,
          amount: payout.amount,
          connectedAccountId,
          failure_code: payout.failure_code,
          failure_message: payout.failure_message,
        });
        break;
      }

      case "payout.paid": {
        const payout = event.data.object as any;
        logStep("Payout completed", {
          payoutId: payout.id,
          amount: payout.amount,
          connectedAccountId,
        });
        break;
      }

      // ─────────────────────────────────────────────
      // DEFAULT
      // ─────────────────────────────────────────────
      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
