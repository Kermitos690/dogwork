import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Fallback réconciliation des crédits IA après checkout Stripe.
 * Utilité : si le webhook stripe-webhook n'a pas livré (mal configuré
 * en dehors de l'app), l'utilisateur récupère quand même ses crédits
 * en revenant sur /shop?credits=success.
 *
 * Sécurité :
 *   - Auth requise (Bearer JWT).
 *   - On ne crédite que si la session Stripe :
 *       a) appartient à l'email de l'utilisateur authentifié,
 *       b) est en mode "payment" + payment_status = "paid",
 *       c) métadonnées type = "ai_credits".
 *   - Idempotent : on vérifie via ai_credit_ledger qu'aucune entrée
 *     "purchase" n'existe déjà pour le payment_intent.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Non autorisé" }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Non autorisé" }, 401);

    const userId = userData.user.id;
    const userEmail = userData.user.email?.toLowerCase();

    const body = await req.json().catch(() => ({}));
    const packSlug: string | undefined = body?.pack_slug;
    if (!packSlug) return json({ error: "pack_slug requis" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Pack info (pour valider credits/prix)
    const { data: pack } = await admin
      .from("ai_credit_packs")
      .select("slug, credits, price_chf, label")
      .eq("slug", packSlug)
      .eq("is_active", true)
      .single();
    if (!pack) return json({ error: "Pack introuvable" }, 404);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    // On cherche les sessions Checkout récentes de cet email pour ce pack
    const since = Math.floor(Date.now() / 1000) - 60 * 60 * 24; // 24h
    const sessions = await stripe.checkout.sessions.list({
      limit: 20,
      created: { gte: since },
    });

    let credited = 0;
    let alreadyCredited = 0;
    let skipped = 0;

    for (const s of sessions.data) {
      const meta = s.metadata || {};
      if (meta.type !== "ai_credits") { skipped++; continue; }
      if (meta.pack_slug !== packSlug) { skipped++; continue; }
      if (s.payment_status !== "paid") { skipped++; continue; }

      const sessionEmail = (s.customer_details?.email || s.customer_email || "").toLowerCase();
      // L'email doit correspondre à l'utilisateur authentifié
      if (!sessionEmail || sessionEmail !== userEmail) { skipped++; continue; }

      const paymentIntentId = typeof s.payment_intent === "string"
        ? s.payment_intent
        : s.payment_intent?.id;
      if (!paymentIntentId) { skipped++; continue; }

      // Idempotence : déjà crédité ?
      const { data: existing } = await admin
        .from("ai_credit_ledger")
        .select("id")
        .eq("stripe_payment_id", paymentIntentId)
        .eq("operation_type", "purchase")
        .maybeSingle();

      if (existing) { alreadyCredited++; continue; }

      const credits = parseInt(meta.credits || String(pack.credits));
      const pricePaid = (s.amount_total || Math.round(Number(pack.price_chf) * 100)) / 100;

      const { error: rpcErr } = await admin.rpc("credit_ai_wallet", {
        _user_id: userId,
        _credits: credits,
        _operation_type: "purchase",
        _description: `Achat pack ${packSlug} (${credits} crédits) [reconciled]`,
        _stripe_payment_id: paymentIntentId,
        _public_price_chf: pricePaid,
      });

      if (rpcErr) {
        console.error("credit_ai_wallet failed", rpcErr);
        continue;
      }
      credited += credits;
    }

    return json({
      ok: true,
      credited,
      already_credited_sessions: alreadyCredited,
      skipped,
    });
  } catch (e) {
    console.error("reconcile-credits-checkout error", e);
    return json({ error: e instanceof Error ? e.message : "Erreur inconnue" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
