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

async function resolveUserId(supabaseAdmin: any, customerId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("stripe_customers")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.user_id || null;
}

async function resolveUserByEmail(supabaseAdmin: any, email: string): Promise<string | null> {
  let page = 1;
  const perPage = 100;
  while (true) {
    const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (!usersPage?.users || usersPage.users.length === 0) break;
    const found = usersPage.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found.id;
    if (usersPage.users.length < perPage) break;
    page++;
  }
  return null;
}

// Helper: récupère email + display_name pour un user
async function getUserContact(supabaseAdmin: any, userId: string): Promise<{ email: string | null; name: string | null }> {
  try {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = u?.user?.email || null;
    const { data: p } = await supabaseAdmin.from("profiles").select("display_name").eq("user_id", userId).maybeSingle();
    const name = p?.display_name || (email ? email.split("@")[0] : null);
    return { email, name };
  } catch {
    return { email: null, name: null };
  }
}

// Helper: envoi transactional email (best-effort)
async function sendEmail(supabaseAdmin: any, templateName: string, recipientEmail: string, idempotencyKey: string, templateData: Record<string, any>) {
  if (!recipientEmail) return;
  try {
    await supabaseAdmin.functions.invoke("send-transactional-email", {
      body: { templateName, recipientEmail, idempotencyKey, templateData },
    });
  } catch (e) {
    console.error(`[email] ${templateName} failed:`, (e as Error).message);
  }
}

// Store full subscription details in stripe_customers
async function syncSubscriptionDetails(
  stripe: Stripe,
  supabaseAdmin: any,
  customerId: string,
  userId: string
) {
  try {
    const subs = await stripe.subscriptions.list({ customer: customerId, limit: 10 });

    let tier = "starter";
    let bestSub: Stripe.Subscription | null = null;

    // Find best active subscription
    for (const sub of subs.data) {
      if (sub.status !== "active" && sub.status !== "trialing") continue;
      for (const item of sub.items.data) {
        const productId = typeof item.price.product === "string" ? item.price.product : (item.price.product as any)?.id;
        const mapped = PRODUCT_TIER_MAP[productId];
        if (mapped === "expert") {
          tier = "expert";
          bestSub = sub;
          break;
        }
        if (mapped === "pro" && tier !== "expert") {
          tier = "pro";
          bestSub = sub;
        }
      }
      if (tier === "expert") break;
    }

    // Also check canceled/past_due for informational purposes
    if (!bestSub && subs.data.length > 0) {
      bestSub = subs.data[0];
    }

    const upsertData: any = {
      user_id: userId,
      stripe_customer_id: customerId,
      current_tier: tier,
      subscription_status: bestSub?.status || "none",
      stripe_subscription_id: bestSub?.id || null,
      stripe_price_id: bestSub?.items?.data?.[0]?.price?.id || null,
      current_period_end: bestSub ? new Date(bestSub.current_period_end * 1000).toISOString() : null,
      cancel_at_period_end: bestSub?.cancel_at_period_end || false,
    };

    await supabaseAdmin.from("stripe_customers").upsert(upsertData, { onConflict: "user_id" });
    logStep("Full subscription synced", { userId, tier, status: upsertData.subscription_status, subId: upsertData.stripe_subscription_id });
  } catch (e) {
    logStep("Subscription sync error", { error: (e as Error).message });
  }
}

async function logBillingEvent(
  supabaseAdmin: any, eventId: string, eventType: string, payload: any,
  userId?: string | null, connectedAccountId?: string | null,
  processingStatus = "success", processingError?: string | null
) {
  const { error } = await supabaseAdmin.from("billing_events").insert({
    stripe_event_id: eventId, event_type: eventType, payload,
    user_id: userId || null, connected_account_id: connectedAccountId || null,
    processing_status: processingStatus, processing_error: processingError || null,
  });
  if (error) logStep("WARNING: Failed to log billing event", { error: error.message });
}

async function updateBillingEventUser(supabaseAdmin: any, eventId: string, userId: string) {
  await supabaseAdmin.from("billing_events").update({ user_id: userId }).eq("stripe_event_id", eventId);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const detectedMode = (stripeKey ?? "").startsWith("sk_live_") || (stripeKey ?? "").startsWith("rk_live_")
      ? "live"
      : (stripeKey ?? "").startsWith("sk_test_") || (stripeKey ?? "").startsWith("rk_test_")
      ? "test"
      : "unknown";
    logStep("Webhook hit", { mode: detectedMode, has_secret: !!webhookSecret });
    if (!stripeKey || !webhookSecret) throw new Error("Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      logStep("Missing stripe-signature header");
      return new Response("Missing stripe-signature header", { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } catch (err) {
      logStep("Signature verification FAILED", { error: (err as Error).message, mode: detectedMode });
      return new Response("Webhook signature verification failed", { status: 400 });
    }

    const connectedAccountId = (event as any).account || null;
    const sessionId = (event.data.object as any)?.id || null;
    logStep("Event verified", {
      type: event.type, id: event.id, mode: detectedMode,
      connected_account: connectedAccountId, session_id: sessionId,
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Idempotence check
    const { data: existingEvent } = await supabaseAdmin
      .from("billing_events").select("id").eq("stripe_event_id", event.id).maybeSingle();

    if (existingEvent) {
      logStep("Event already processed, skipping", { id: event.id });
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }

    await logBillingEvent(supabaseAdmin, event.id, event.type, event.data.object as any, null, connectedAccountId);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // AI CREDIT PACK PURCHASE
        if (session.mode === "payment" && session.metadata?.type === "ai_credits") {
          const userId = session.metadata.user_id;
          const credits = parseInt(session.metadata.credits || "0");
          const packSlug = session.metadata.pack_slug;
          if (userId && credits > 0) {
            const pricePaid = (session.amount_total || 0) / 100;
            try {
              await supabaseAdmin.rpc("credit_ai_wallet", {
                _user_id: userId, _credits: credits, _operation_type: "purchase",
                _description: `Achat pack ${packSlug} (${credits} crédits)`,
                _stripe_payment_id: session.payment_intent as string, _public_price_chf: pricePaid,
              });
              await updateBillingEventUser(supabaseAdmin, event.id, userId);
              logStep("AI credits purchased", { userId, credits, packSlug, pricePaid });

              // Email confirmation achat crédits
              const { email, name } = await getUserContact(supabaseAdmin, userId);
              if (email) {
                await sendEmail(supabaseAdmin, "credits-purchased", email, `credits-${session.id}`, {
                  name, credits, packLabel: packSlug, amountChf: pricePaid,
                });
              }
            } catch (e) {
              const errMsg = (e as Error).message;
              logStep("ERROR crediting wallet", { userId, error: errMsg });
              await supabaseAdmin.from("billing_events").update({
                user_id: userId, processing_status: "error", processing_error: errMsg,
              }).eq("stripe_event_id", event.id);
            }
          }
          break;
        }

        // DOGWORK MODULE / PLAN PROVISIONING (one-shot or activation post-checkout)
        if (
          (session.mode === "payment" || session.mode === "subscription") &&
          (session.metadata?.type === "dogwork_module" || session.metadata?.plan_slug || session.metadata?.module_slugs)
        ) {
          const userId = session.metadata.user_id || (session.customer ? await resolveUserId(supabaseAdmin, session.customer as string) : null);
          const orgId = session.metadata.organization_id || null;
          const planSlug = session.metadata.plan_slug || null;
          const moduleSlugsRaw = session.metadata.module_slugs || "";
          const explicitSlugs = moduleSlugsRaw ? moduleSlugsRaw.split(",").map((s: string) => s.trim()).filter(Boolean) : [];

          if (!userId && !orgId) {
            logStep("WARNING module provisioning: no user/org", { sessionId: session.id });
            break;
          }

          try {
            // Resolve module list from plan + explicit
            let moduleSlugs: string[] = [...explicitSlugs];
            if (planSlug) {
              const { data: pm } = await supabaseAdmin
                .from("plan_modules").select("module_slug")
                .eq("plan_slug", planSlug).eq("included", true);
              moduleSlugs = Array.from(new Set([...moduleSlugs, ...((pm ?? []).map((r: any) => r.module_slug))]));
            }

            for (const slug of moduleSlugs) {
              const row = {
                module_slug: slug, status: "active", source: session.mode === "subscription" ? "subscription" : "addon",
                activated_at: new Date().toISOString(), updated_at: new Date().toISOString(),
              };
              if (orgId) {
                await supabaseAdmin.from("organization_modules").upsert(
                  { ...row, organization_id: orgId }, { onConflict: "organization_id,module_slug" });
              } else if (userId) {
                await supabaseAdmin.from("user_modules").upsert(
                  { ...row, user_id: userId }, { onConflict: "user_id,module_slug" });
              }
            }

            // Grant included credits if plan
            if (planSlug && userId) {
              const { data: plan } = await supabaseAdmin
                .from("plans").select("included_credits").eq("slug", planSlug).maybeSingle();
              if (plan?.included_credits && plan.included_credits > 0) {
                await supabaseAdmin.rpc("credit_ai_wallet", {
                  _user_id: userId, _credits: plan.included_credits, _operation_type: "monthly_grant",
                  _description: `Crédits inclus plan ${planSlug}`, _stripe_payment_id: null, _public_price_chf: null,
                  _metadata: { plan_slug: planSlug, source: "stripe_webhook", session_id: session.id },
                });
              }
            }

            if (userId) await updateBillingEventUser(supabaseAdmin, event.id, userId);
            logStep("DogWork modules provisioned", { userId, orgId, planSlug, modules: moduleSlugs });
          } catch (e) {
            const errMsg = (e as Error).message;
            logStep("ERROR provisioning modules", { error: errMsg });
            await supabaseAdmin.from("billing_events").update({
              processing_status: "error", processing_error: errMsg,
            }).eq("stripe_event_id", event.id);
          }
          break;
        }

        // COURSE BOOKING
        if (session.mode === "payment" && session.metadata?.booking_id) {
          const bookingId = session.metadata.booking_id;
          const userId = session.metadata.user_id;
          const { error } = await supabaseAdmin.from("course_bookings")
            .update({ status: "confirmed", payment_status: "paid" }).eq("id", bookingId);
          if (error) {
            logStep("ERROR confirming booking", { bookingId, error: error.message });
            await supabaseAdmin.from("billing_events").update({
              processing_status: "error", processing_error: error.message,
            }).eq("stripe_event_id", event.id);
          } else {
            logStep("Course booking confirmed", { bookingId });
            // Email confirmation réservation cours
            if (userId) {
              const { email, name } = await getUserContact(supabaseAdmin, userId);
              const { data: booking } = await supabaseAdmin
                .from("course_bookings")
                .select("course_id, courses(title, next_session_at, location)")
                .eq("id", bookingId)
                .maybeSingle();
              if (email) {
                await sendEmail(supabaseAdmin, "course-booking-confirmed", email, `booking-${bookingId}`, {
                  name,
                  courseTitle: (booking as any)?.courses?.title || "Votre cours",
                  sessionDate: (booking as any)?.courses?.next_session_at || null,
                  location: (booking as any)?.courses?.location || null,
                });
              }
            }
          }
          if (userId) await updateBillingEventUser(supabaseAdmin, event.id, userId);
          break;
        }

        // SUBSCRIPTION CHECKOUT
        if (session.mode === "subscription" && session.customer) {
          const customerId = session.customer as string;
          const customerEmail = session.customer_email || session.customer_details?.email;
          let userId: string | null = null;

          // Try to find user by stripe_customers first
          userId = await resolveUserId(supabaseAdmin, customerId);

          // Fall back to email lookup
          if (!userId && customerEmail) {
            userId = await resolveUserByEmail(supabaseAdmin, customerEmail);
          }

          if (userId) {
            // Ensure stripe_customers row exists with email
            await supabaseAdmin.from("stripe_customers").upsert({
              user_id: userId, stripe_customer_id: customerId, email: customerEmail,
            }, { onConflict: "user_id" });

            await updateBillingEventUser(supabaseAdmin, event.id, userId);
            await syncSubscriptionDetails(stripe, supabaseAdmin, customerId, userId);
            logStep("Subscription checkout completed", { userId, customerId });

            // Email activation abonnement
            const { data: sc } = await supabaseAdmin
              .from("stripe_customers").select("current_tier, current_period_end")
              .eq("user_id", userId).maybeSingle();
            const { email, name } = await getUserContact(supabaseAdmin, userId);
            if (email) {
              await sendEmail(supabaseAdmin, "subscription-activated", email, `sub-active-${session.id}`, {
                name,
                tier: sc?.current_tier || "pro",
                renewalDate: sc?.current_period_end || null,
              });
            }
          } else {
            logStep("WARNING: Could not resolve user for subscription checkout", { customerId, customerEmail });
            await supabaseAdmin.from("billing_events").update({
              processing_status: "warning", processing_error: "User not found for email: " + customerEmail,
            }).eq("stripe_event_id", event.id);
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        let userId = await resolveUserId(supabaseAdmin, customerId);

        // If user not found, try to find by Stripe customer email
        if (!userId) {
          try {
            const customer = await stripe.customers.retrieve(customerId);
            if (customer && !customer.deleted && (customer as any).email) {
              userId = await resolveUserByEmail(supabaseAdmin, (customer as any).email);
              if (userId) {
                // Create the stripe_customers row
                await supabaseAdmin.from("stripe_customers").upsert({
                  user_id: userId, stripe_customer_id: customerId, email: (customer as any).email,
                }, { onConflict: "user_id" });
              }
            }
          } catch (e) {
            logStep("Could not fetch Stripe customer", { customerId, error: (e as Error).message });
          }
        }

        if (userId) {
          await updateBillingEventUser(supabaseAdmin, event.id, userId);
          await syncSubscriptionDetails(stripe, supabaseAdmin, customerId, userId);
        }
        logStep("Subscription lifecycle event", { type: event.type, status: subscription.status, customerId, userId });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const userId = await resolveUserId(supabaseAdmin, customerId);

        if (userId) {
          await updateBillingEventUser(supabaseAdmin, event.id, userId);
          await supabaseAdmin.from("stripe_customers").update({
            current_tier: "starter", subscription_status: "canceled",
            cancel_at_period_end: false,
          }).eq("user_id", userId);

          // Email annulation abonnement
          const { email, name } = await getUserContact(supabaseAdmin, userId);
          if (email) {
            await sendEmail(supabaseAdmin, "subscription-canceled", email, `sub-cancel-${subscription.id}`, {
              name,
              endDate: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
            });
          }
        }
        logStep("Subscription deleted, tier reset", { customerId, userId });
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        let userId = await resolveUserId(supabaseAdmin, customerId);
        if (!userId) {
          const email = (invoice as any).customer_email;
          if (email) userId = await resolveUserByEmail(supabaseAdmin, email);
          if (userId) {
            await supabaseAdmin.from("stripe_customers").upsert({
              user_id: userId, stripe_customer_id: customerId, email,
            }, { onConflict: "user_id" });
          }
        }
        if (userId) {
          await updateBillingEventUser(supabaseAdmin, event.id, userId);
          await syncSubscriptionDetails(stripe, supabaseAdmin, customerId, userId);
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
          await supabaseAdmin.from("stripe_customers").update({
            subscription_status: "past_due",
          }).eq("user_id", userId);

          // Email échec paiement
          const { email, name } = await getUserContact(supabaseAdmin, userId);
          if (email) {
            await sendEmail(supabaseAdmin, "payment-failed", email, `pay-failed-${invoice.id}`, {
              name,
              amountChf: ((invoice.amount_due || 0) / 100),
              hostedInvoiceUrl: (invoice as any).hosted_invoice_url || null,
              nextAttempt: (invoice as any).next_payment_attempt
                ? new Date((invoice as any).next_payment_attempt * 1000).toISOString() : null,
            });
          }
        }
        logStep("Invoice payment failed", { customerId, userId });
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const customerId = charge.customer as string;
        const userId = customerId ? await resolveUserId(supabaseAdmin, customerId) : null;
        if (userId) await updateBillingEventUser(supabaseAdmin, event.id, userId);

        const paymentIntentId = charge.payment_intent as string;
        if (paymentIntentId && userId) {
          const { data: ledgerEntry } = await supabaseAdmin
            .from("ai_credit_ledger").select("credits_delta")
            .eq("stripe_payment_id", paymentIntentId).eq("operation_type", "purchase")
            .eq("status", "success").maybeSingle();

          if (ledgerEntry) {
            const creditsToDebit = Math.abs(ledgerEntry.credits_delta);
            try {
              await supabaseAdmin.rpc("debit_ai_credits", {
                _user_id: userId, _feature_code: "refund_clawback",
                _credits: creditsToDebit, _metadata: { reason: "stripe_refund", charge_id: charge.id },
              });
              logStep("AI credits clawed back", { userId, credits: creditsToDebit });
            } catch (e) {
              logStep("WARNING: Could not claw back credits", { userId, error: (e as Error).message });
            }
          }
        }
        logStep("Charge refunded", { chargeId: charge.id, customerId, userId, amount: charge.amount_refunded });
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as any;
        logStep("Dispute created — manual review needed", {
          disputeId: dispute.id, chargeId: dispute.charge,
          amount: dispute.amount, reason: dispute.reason, connectedAccountId,
        });
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const accountId = account.id;
        const { data: stripeData } = await supabaseAdmin.from("coach_stripe_data")
          .select("user_id, stripe_onboarding_complete").eq("stripe_account_id", accountId).maybeSingle();

        if (stripeData) {
          const isComplete = account.charges_enabled && account.payouts_enabled;
          if (isComplete !== stripeData.stripe_onboarding_complete) {
            await supabaseAdmin.from("coach_stripe_data")
              .update({ stripe_onboarding_complete: isComplete }).eq("stripe_account_id", accountId);
            logStep("Connect account updated", { accountId, userId: stripeData.user_id, onboarding_complete: isComplete });
          }
          await updateBillingEventUser(supabaseAdmin, event.id, stripeData.user_id);
        } else {
          logStep("Connect account.updated for unknown account", { accountId });
        }
        break;
      }

      case "payout.failed": {
        const payout = event.data.object as any;
        logStep("Payout failed", { payoutId: payout.id, amount: payout.amount, connectedAccountId, failure_code: payout.failure_code });
        break;
      }

      case "payout.paid": {
        const payout = event.data.object as any;
        logStep("Payout completed", { payoutId: payout.id, amount: payout.amount, connectedAccountId });
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});