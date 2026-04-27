// Edge function: enrich-shelter-profile
// Scrape une URL publique de refuge/chenil + extraction structurée via Lovable AI (Gemini)
// Renvoie un JSON pré-rempli — JAMAIS d'écriture en BDD côté serveur (validation user obligatoire)
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOOL = {
  type: "function",
  function: {
    name: "extract_shelter_info",
    description:
      "Extrait les informations publiques d'un refuge / chenil / association de protection animale depuis le contenu de son site web officiel.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nom officiel de l'organisation" },
        organization_type: {
          type: "string",
          enum: ["refuge", "spa", "chenil", "association", "pension"],
        },
        mission: {
          type: "string",
          description: "Phrase de mission (1-2 phrases max, ton sobre, factuel)",
        },
        description: {
          type: "string",
          description:
            "Description plus complète (3-5 phrases) : activités, valeurs, public visé. Pas de superlatifs.",
        },
        address: { type: "string", description: "Adresse complète (rue + numéro)" },
        postal_code: { type: "string" },
        city: { type: "string" },
        country: { type: "string", description: "Pays (ex: Suisse, France)" },
        phone: { type: "string" },
        email_public: { type: "string", description: "Email de contact public" },
        website: { type: "string", description: "URL du site officiel" },
        opening_hours: {
          type: "string",
          description: "Horaires d'accueil (texte libre, format lisible)",
        },
        since_year: { type: "integer", description: "Année de création/fondation" },
        logo_url: {
          type: "string",
          description: "URL absolue du logo si trouvée dans la page",
        },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
};

async function fetchPageText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; DogWorkBot/1.0; +https://dogwork-at-home.com)",
      Accept: "text/html",
    },
  });
  if (!res.ok) throw new Error(`Impossible de charger la page (HTTP ${res.status})`);
  const html = await res.text();
  // Strip scripts/styles, garder texte lisible (max ~40k chars pour rester sous le contexte)
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 40000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Vérifie rôle shelter ou admin
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const allowed = roles?.some((r: { role: string }) =>
      ["shelter", "admin"].includes(r.role),
    );
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Accès réservé aux refuges" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { url } = await req.json();
    if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url)) {
      return new Response(
        JSON.stringify({ error: "URL invalide (doit commencer par http:// ou https://)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY non configuré");

    // 1. Scrape la page d'accueil + tente /infos-pratiques, /contact
    const pages: string[] = [];
    try {
      pages.push(await fetchPageText(url));
    } catch (e) {
      throw new Error(`Scraping échoué: ${(e as Error).message}`);
    }
    // Bonus: tente quelques chemins courants (best effort, on ignore les échecs)
    const base = new URL(url);
    for (const path of ["/infos-pratiques/", "/contact/", "/about/", "/qui-sommes-nous/"]) {
      try {
        const txt = await fetchPageText(`${base.origin}${path}`);
        if (txt.length > 200) pages.push(txt);
      } catch { /* ignore */ }
    }

    const corpus = pages.join("\n\n---\n\n").slice(0, 60000);

    // 2. Lovable AI avec tool calling structuré
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Tu extrais des informations factuelles publiques sur un refuge / chenil / association de protection animale à partir du contenu de son site web. N'invente JAMAIS de données. Si une info n'est pas présente, omets le champ. Ton sobre et factuel.",
          },
          {
            role: "user",
            content: `Site officiel : ${url}\n\nContenu extrait :\n\n${corpus}`,
          },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "extract_shelter_info" } },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI gateway error", aiRes.status, txt);
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes IA, réessayez dans une minute." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA épuisés, contactez un administrateur." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw new Error(`AI gateway HTTP ${aiRes.status}`);
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("L'IA n'a pas retourné de données structurées");
    }
    const extracted = JSON.parse(toolCall.function.arguments);

    // S'assure que le website est rempli avec l'URL fournie si l'IA ne l'a pas capté
    if (!extracted.website) extracted.website = url;

    return new Response(JSON.stringify({ success: true, data: extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("enrich-shelter-profile error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
