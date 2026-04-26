// Admin-only: verifies the existence of every product/price referenced in the codebase
// against the Stripe account behind STRIPE_SECRET_KEY (Live by default).
// Pass { mode: "test" } in the body to verify against STRIPE_TEST_SECRET_KEY instead.
// READ-ONLY — never creates or mutates anything.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Canonical catalog referenced in the source code
const CATALOG = {
  products: [
    { id: "prod_U83i1wbeLdd3EI", label: "Pro" },
    { id: "prod_U83inCbv8JMMgf", label: "Expert" },
    { id: "prod_U8CxlV7PMpHAgA", label: "Educator" },
    { id: "prod_UDKcjmnJnM7pBo", label: "Shelter" },
    { id: "prod_UJdxPALVKKHt1T", label: "Pack Découverte" },
    { id: "prod_UJdxJ73vK0TFq7", label: "Pack Standard" },
    { id: "prod_UJdxeicxqyPqQm", label: "Pack Premium" },
  ],
  prices: [
    { id: "price_1TKpFyPshPrEibTgOW98FPOq", label: "Pro 9.90 CHF / mois" },
    { id: "price_1TKpNpPshPrEibTgDiRVEAmV", label: "Expert 19.90 CHF / mois" },
    { id: "price_1T9wXlPshPrEibTgEM0BNrSm", label: "Educator 200 CHF / an" },
    { id: "price_1TEtxAPshPrEibTgsDFHr8Nw", label: "Shelter (custom)" },
    { id: "price_1TL0fHPshPrEibTg37iPRFlP", label: "Pack Découverte 80c / 4.90" },
    { id: "price_1TL0fZPshPrEibTgkFKNzfEh", label: "Pack Standard 150c / 6.90" },
    { id: "price_1TL0fuPshPrEibTgpWNjNblG", label: "Pack Premium 500c / 19.90" },
  ],
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Auth: must be admin ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin");
    if (!roles?.length) return json({ error: "Admin only" }, 403);

    // --- Mode: live (default) or test ---
    let mode: "live" | "test" = "live";
    try {
      if (req.method === "POST") {
        const body = await req.json();
        if (body?.mode === "test") mode = "test";
      }
    } catch { /* empty body ok */ }

    const keyName = mode === "test" ? "STRIPE_TEST_SECRET_KEY" : "STRIPE_SECRET_KEY";
    const stripeKey = Deno.env.get(keyName);
    if (!stripeKey) {
      return json({ error: `${keyName} is not configured` }, 400);
    }
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // --- Verify each product ---
    const productResults = await Promise.all(
      CATALOG.products.map(async (p) => {
        try {
          const obj = await stripe.products.retrieve(p.id);
          return { id: p.id, label: p.label, exists: true, active: obj.active, name: obj.name };
        } catch (e: any) {
          return { id: p.id, label: p.label, exists: false, error: e?.message ?? String(e) };
        }
      })
    );

    // --- Verify each price ---
    const priceResults = await Promise.all(
      CATALOG.prices.map(async (p) => {
        try {
          const obj = await stripe.prices.retrieve(p.id);
          return {
            id: p.id,
            label: p.label,
            exists: true,
            active: obj.active,
            unit_amount: obj.unit_amount,
            currency: obj.currency,
            product: typeof obj.product === "string" ? obj.product : obj.product?.id,
            recurring: obj.recurring ? { interval: obj.recurring.interval } : null,
          };
        } catch (e: any) {
          return { id: p.id, label: p.label, exists: false, error: e?.message ?? String(e) };
        }
      })
    );

    const account = await stripe.accounts.retrieve();

    return json({
      mode,
      account_id: account.id,
      account_country: account.country,
      livemode_key: !stripeKey.startsWith("sk_test_"),
      products: productResults,
      prices: priceResults,
      missing_products: productResults.filter((p) => !p.exists),
      missing_prices: priceResults.filter((p) => !p.exists),
    });
  } catch (e: any) {
    return json({ error: e?.message ?? String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
