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
        const productId = typeof item.price.product === "string"
          ? item.price.product
          : (item.price.product as any)?.id;
        const mapped = PRODUCT_TIER_MAP[productId];
        if (mapped === "expert") { tier = "expert"; break; }
        if (mapped === "pro" && tier !== "expert") tier = "pro";
      }
      if (tier === "expert") break;
    }

    await supabaseAdmin.from("stripe_customers").upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      current_tier: tier,
    }, { onConflict: "user_id" });

    logStep("Tier synced", { userId, tier });
  } catch (e) {
    logStep("Tier sync error", { error: (e as Error).message });
  }
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
      logStep("Signature verification failed", { error: (err as Error).message });
      return new Response("Webhook signature verification failed", { status: 400 });
    }

    logStep("Event received", { type: event.type, id: event.id });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Log the event
    await supabaseAdmin.from("billing_events").insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event.data.object as any,
    }).onConflict("stripe_event_id").ignore();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // ---- AI CREDIT PACK PURCHASE ----
        if (session.mode === "payment" && session.metadata?.type === "ai_credits") {
          const userId = session.metadata.user_id;
          const credits = parseInt(session.metadata.credits || "0");
          const packSlug = session.metadata.pack_slug;

          if (userId && credits > 0) {
            const pricePaid = (session.amount_total || 0) / 100;
            await supabaseAdmin.rpc("credit_ai_wallet", {
              _user_id: userId,
              _credits: credits,
              _operation_type: "purchase",
              _description: `Achat pack ${packSlug} (${credits} crédits)`,
              _stripe_payment_id: session.payment_intent as string,
              _public_price_chf: pricePaid,
            });

            await supabaseAdmin.from("billing_events")
              .update({ user_id: userId })
              .eq("stripe_event_id", event.id);

            logStep("AI credits purchased", { userId, credits, packSlug, pricePaid });
          }
          break;
        }

        // ---- SUBSCRIPTION CHECKOUT ----
        if (session.mode === "subscription" && session.customer_email) {
          const { data: users } = await supabaseAdmin.auth.admin.listUsers();
          const user = users?.users?.find(
            (u: any) => u.email?.toLowerCase() === session.customer_email?.toLowerCase()
          );
          if (user && session.customer) {
            const customerId = session.customer as string;
            await supabaseAdmin.from("stripe_customers").upsert({
              user_id: user.id,
              stripe_customer_id: customerId,
              email: session.customer_email,
            }, { onConflict: "user_id" });

            await supabaseAdmin.from("billing_events")
              .update({ user_id: user.id })
              .eq("stripe_event_id", event.id);

            // Sync tier
            await syncTierFromStripe(stripe, supabaseAdmin, customerId, user.id);
            logStep("Customer cached + tier synced", { userId: user.id, customerId });
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: cached } = await supabaseAdmin
          .from("stripe_customers")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (cached) {
          await supabaseAdmin.from("billing_events")
            .update({ user_id: cached.user_id })
            .eq("stripe_event_id", event.id);

          // Sync tier on every subscription change
          await syncTierFromStripe(stripe, supabaseAdmin, customerId, cached.user_id);
        }

        logStep("Subscription updated + tier synced", {
          status: subscription.status,
          customerId,
          userId: cached?.user_id,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: cached } = await supabaseAdmin
          .from("stripe_customers")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (cached) {
          await supabaseAdmin.from("billing_events")
            .update({ user_id: cached.user_id })
            .eq("stripe_event_id", event.id);

          // Reset tier to starter on deletion
          await supabaseAdmin.from("stripe_customers")
            .update({ current_tier: "starter" })
            .eq("user_id", cached.user_id);
        }

        logStep("Subscription deleted, tier reset", { customerId, userId: cached?.user_id });
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: cached } = await supabaseAdmin
          .from("stripe_customers")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (cached) {
          await supabaseAdmin.from("billing_events")
            .update({ user_id: cached.user_id })
            .eq("stripe_event_id", event.id);
          // Re-sync tier on successful payment
          await syncTierFromStripe(stripe, supabaseAdmin, customerId, cached.user_id);
        }

        logStep("Invoice paid, tier synced", { customerId, userId: cached?.user_id });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: cached } = await supabaseAdmin
          .from("stripe_customers")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (cached) {
          await supabaseAdmin.from("billing_events")
            .update({ user_id: cached.user_id })
            .eq("stripe_event_id", event.id);
        }

        logStep("Invoice payment failed", { customerId, userId: cached?.user_id });
        break;
      }

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
