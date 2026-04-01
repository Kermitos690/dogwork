import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Creates a Stripe Checkout session for purchasing AI credit packs.
 * Body: { pack_slug: string }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;

    const { pack_slug } = await req.json();
    if (!pack_slug) {
      return new Response(JSON.stringify({ error: "pack_slug requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get pack from DB
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: pack, error: packErr } = await admin
      .from("ai_credit_packs")
      .select("*")
      .eq("slug", pack_slug)
      .eq("is_active", true)
      .single();

    if (packErr || !pack) {
      return new Response(JSON.stringify({ error: "Pack non trouvé" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    // Find or use existing Stripe customer
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create or reuse Stripe price
    let priceId = pack.stripe_price_id;

    if (!priceId) {
      // Create product and price on the fly
      const product = await stripe.products.create({
        name: `DogWork AI - ${pack.label}`,
        description: `${pack.credits} crédits IA`,
        metadata: { pack_slug: pack.slug, type: "ai_credits" },
      });

      const price = await stripe.prices.create({
        product: product.id,
        currency: "chf",
        unit_amount: Math.round(Number(pack.price_chf) * 100),
      });

      priceId = price.id;

      // Save back to DB
      await admin
        .from("ai_credit_packs")
        .update({ stripe_price_id: price.id, stripe_product_id: product.id })
        .eq("id", pack.id);
    }

    const origin = req.headers.get("origin") || "https://dogwork-at-home.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${origin}/settings?credits=success&pack=${pack_slug}`,
      cancel_url: `${origin}/settings?credits=cancel`,
      metadata: {
        user_id: userId,
        pack_slug: pack.slug,
        credits: String(pack.credits),
        type: "ai_credits",
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-credits-checkout error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
