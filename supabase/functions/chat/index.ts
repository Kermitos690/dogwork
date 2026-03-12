import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es DogWork AI, un assistant expert en éducation canine bienveillante intégré dans l'application DogWork.

RÔLE :
- Tu aides les propriétaires de chiens et les éducateurs canins professionnels.
- Tu donnes des conseils basés sur le renforcement positif et les méthodes bienveillantes UNIQUEMENT.
- Tu ne recommandes JAMAIS de méthodes coercitives (collier étrangleur, choc électrique, punitions physiques).

POUR LES PROPRIÉTAIRES :
- Réponds aux questions sur le comportement canin (aboiements, réactivité, anxiété de séparation, etc.)
- Explique comment réaliser les exercices d'obéissance (assis, couché, rappel, marche en laisse)
- Aide à comprendre le langage corporel du chien
- Donne des conseils adaptés au profil du chien quand des informations sont fournies

POUR LES ÉDUCATEURS :
- Aide à la rédaction de notes d'observation
- Propose des structures de séances de groupe
- Donne des conseils sur la gestion de chiens réactifs en collectif
- Aide à analyser des profils comportementaux

LIMITES :
- Tu ne poses PAS de diagnostic vétérinaire
- Pour les cas d'agressivité sévère ou de morsure, tu recommandes systématiquement de consulter un vétérinaire comportementaliste
- Tu précises que tes conseils ne remplacent pas un professionnel pour les cas complexes

FORMAT :
- Réponds en français par défaut
- Sois concis et pratique
- Utilise des listes à puces quand c'est pertinent
- Ajoute des émojis 🐕 pour rendre les réponses engageantes`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;

    // Check if user has privileged role (admin or educator get free access)
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const isPrivileged = roles?.some(
      (r: { role: string }) => r.role === "admin" || r.role === "educator"
    );

    if (!isPrivileged) {
      // Check Stripe subscription for Expert tier
      const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
      if (!STRIPE_SECRET_KEY) {
        return new Response(
          JSON.stringify({ error: "Configuration serveur manquante" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user email
      const { data: userData } = await adminCheck.auth.admin.getUserById(userId);
      const email = userData?.user?.email;

      if (!email) {
        return new Response(
          JSON.stringify({ error: "Utilisateur introuvable" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check Stripe for active Expert subscription
      const Stripe = (await import("https://esm.sh/stripe@18.5.0")).default;
      const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });

      const customers = await stripe.customers.list({ email, limit: 1 });
      let hasExpertSub = false;

      if (customers.data.length > 0) {
        const subs = await stripe.subscriptions.list({
          customer: customers.data[0].id,
          status: "active",
          limit: 10,
        });

        // Expert product ID
        const EXPERT_PRODUCT_ID = "prod_U83inCbv8JMMgf";
        for (const sub of subs.data) {
          for (const item of sub.items.data) {
            if (item.price.product === EXPERT_PRODUCT_ID) {
              hasExpertSub = true;
              break;
            }
          }
          if (hasExpertSub) break;
        }
      }

      if (!hasExpertSub) {
        return new Response(
          JSON.stringify({ error: "Abonnement Expert requis pour utiliser le chatbot IA." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes, veuillez réessayer dans quelques instants." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA insuffisants. Veuillez recharger votre espace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erreur du service IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
