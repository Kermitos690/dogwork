// DogWork — Sync user-selected add-on modules with Stripe subscription
// and the local `user_modules` mirror.
//
// Flow:
//   1. Auth user via JWT
//   2. Fetch all addon modules + the user's currently active subscription on Stripe
//   3. For each requested addon, ensure a Stripe Price exists (lookup_key = "module_<slug>")
//      — created on the fly if missing (Product name from DB).
//   4. Reconcile subscription items: add missing, remove unchecked, leave base price untouched
//   5. Mirror in `user_modules` (source='addon')
//
// If the user has NO active subscription yet, we just persist the selection
// in `user_modules` with status='pending' so the frontend can prompt them
// to subscribe to a base plan first. We never create a standalone subscription.

import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SUBSCRIBE-MODULES] ${step}${d}`);
};

// Known base price IDs — items matching these are NEVER touched.
const BASE_PRICE_IDS = new Set([
  "price_1TKpFyPshPrEibTgOW98FPOq", // Pro
  "price_1TKpNpPshPrEibTgDiRVEAmV", // Expert
  "price_1T9wXlPshPrEibTgEM0BNrSm", // Educator
  "price_1TEtxAPshPrEibTgsDFHr8Nw", // Shelter
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    log("start");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY missing");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const jwt = authHeader.replace("Bearer ", "");

    // Service-role client for writes
    const supa = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: userData, error: userErr } = await supa.auth.getUser(jwt);
    if (userErr) throw new Error(`auth: ${userErr.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("user not authenticated");
    log("user", { id: user.id, email: user.email });

    const body = await req.json().catch(() => ({}));
    const requested: string[] = Array.isArray(body?.selected_slugs) ? body.selected_slugs : [];
    log("requested", requested);

    // 1. Load addon module definitions
    const { data: modulesData, error: modErr } = await supa
      .from("modules")
      .select("slug,name,addon_label,monthly_price_chf,is_addon,is_active")
      .eq("is_addon", true)
      .eq("is_active", true);
    if (modErr) throw new Error(`modules: ${modErr.message}`);
    const addonMap = new Map<string, any>();
    for (const m of modulesData ?? []) addonMap.set(m.slug, m);

    // Filter requested to only valid addons
    const validRequested = requested.filter((s) => addonMap.has(s));
    log("valid_requested", validRequested);

    // 2. Find Stripe customer + active subscription
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customer = customers.data[0];

    let subscriptionId: string | null = null;
    let subscription: Stripe.Subscription | null = null;
    if (customer) {
      const subs = await stripe.subscriptions.list({
        customer: customer.id,
        status: "active",
        limit: 1,
      });
      subscription = subs.data[0] ?? null;
      subscriptionId = subscription?.id ?? null;
    }

    log("stripe_state", { customer: customer?.id, subscription: subscriptionId });

    // 3. Always update local mirror first (idempotent), so UI can rely on it
    //    even if Stripe call is deferred.
    await supa
      .from("user_modules")
      .delete()
      .eq("user_id", user.id)
      .eq("source", "addon");

    if (validRequested.length) {
      const rows = validRequested.map((slug) => ({
        user_id: user.id,
        module_slug: slug,
        status: subscriptionId ? "active" : "pending",
        source: "addon",
      }));
      const { error: insErr } = await supa.from("user_modules").insert(rows);
      if (insErr) log("user_modules insert error", insErr.message);
    }

    // 4. If no active subscription → tell client to subscribe to a base plan first
    if (!subscription || !subscriptionId) {
      log("no active sub — selection saved as pending");
      return new Response(
        JSON.stringify({
          ok: true,
          status: "pending",
          message:
            "Sélection enregistrée. Activez d'abord un abonnement de base pour la facturation.",
          selected: validRequested,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 5. Ensure Stripe Price exists per requested addon
    const slugToPriceId = new Map<string, string>();
    for (const slug of validRequested) {
      const mod = addonMap.get(slug)!;
      const lookupKey = `module_${slug}`;

      // Try lookup
      const priceList = await stripe.prices.list({
        lookup_keys: [lookupKey],
        active: true,
        limit: 1,
        expand: ["data.product"],
      });
      let price = priceList.data[0];

      if (!price) {
        log("creating price", { slug, lookupKey });
        const product = await stripe.products.create({
          name: `Module ${mod.addon_label ?? mod.name}`,
          metadata: { module_slug: slug, dogwork: "addon" },
        });
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: Math.round(Number(mod.monthly_price_chf) * 100),
          currency: "chf",
          recurring: { interval: "month" },
          lookup_key: lookupKey,
          metadata: { module_slug: slug, dogwork: "addon" },
        });
      }
      slugToPriceId.set(slug, price.id);
    }

    // 6. Reconcile subscription items
    const currentItems = subscription.items.data;
    const desiredAddonPriceIds = new Set(slugToPriceId.values());

    // Items to delete: addon items not in desired set (but never base prices)
    const toDelete: Stripe.SubscriptionUpdateParams.Item[] = [];
    const keepPriceIds = new Set<string>();
    for (const it of currentItems) {
      const pid = it.price.id;
      if (BASE_PRICE_IDS.has(pid)) {
        keepPriceIds.add(pid);
        continue;
      }
      const isModule =
        (it.price.lookup_key && it.price.lookup_key.startsWith("module_")) ||
        (typeof it.price.metadata?.dogwork === "string" && it.price.metadata.dogwork === "addon");
      if (!isModule) {
        // Unknown non-base item — leave it alone for safety
        keepPriceIds.add(pid);
        continue;
      }
      if (desiredAddonPriceIds.has(pid)) {
        keepPriceIds.add(pid);
      } else {
        toDelete.push({ id: it.id, deleted: true });
      }
    }

    // Items to add: desired prices not already on the subscription
    const toAdd: Stripe.SubscriptionUpdateParams.Item[] = [];
    for (const pid of desiredAddonPriceIds) {
      if (!keepPriceIds.has(pid)) toAdd.push({ price: pid, quantity: 1 });
    }

    const itemsParam = [...toDelete, ...toAdd];

    if (itemsParam.length) {
      log("updating sub", { add: toAdd.length, del: toDelete.length });
      await stripe.subscriptions.update(subscriptionId, {
        items: itemsParam,
        proration_behavior: "create_prorations",
      });
    } else {
      log("no sub change needed");
    }

    return new Response(
      JSON.stringify({
        ok: true,
        status: "active",
        subscription_id: subscriptionId,
        added: toAdd.length,
        removed: toDelete.length,
        selected: validRequested,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("ERROR", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
