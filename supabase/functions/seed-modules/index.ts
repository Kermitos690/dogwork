// Idempotent seed of the public.modules catalog (15 base modules).
// Admin-only. Safe to run on Test and Live. Performs an UPSERT on slug.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SEED-MODULES] ${step}${d}`);
};

const MODULES = [
  { slug: "animal_management",    name: "Gestion chiens / animaux",        description: "Fiches, profils, suivi des animaux",                  category: "éducation",     available_for_roles: ["owner","adopter","educator","shelter"], sort_order: 1 },
  { slug: "exercise_library",     name: "Bibliothèque d'exercices",        description: "Catalogue des 480+ exercices enrichis",               category: "éducation",     available_for_roles: ["owner","educator","shelter"],            sort_order: 2 },
  { slug: "ai_plans",             name: "Plans IA",                        description: "Génération de plans d'entraînement assistée par IA",  category: "ia",            available_for_roles: ["owner","educator","shelter"],            sort_order: 3 },
  { slug: "ai_chatbot",           name: "Chat IA",                         description: "Assistant conversationnel canin",                     category: "ia",            available_for_roles: ["owner","educator","shelter","adopter"],  sort_order: 4 },
  { slug: "progress_journal",     name: "Journal de progression",          description: "Notes et journal d'entraînement",                     category: "suivi",         available_for_roles: ["owner","educator","shelter"],            sort_order: 5 },
  { slug: "behavior_stats",       name: "Statistiques comportementales",   description: "Tableaux de bord comportementaux",                    category: "suivi",         available_for_roles: ["owner","educator","shelter"],            sort_order: 6 },
  { slug: "educator_crm",         name: "CRM éducateur",                   description: "Gestion clients, animaux, notes",                     category: "professionnel", available_for_roles: ["educator"],                              sort_order: 7 },
  { slug: "planning",             name: "Planning & rendez-vous",          description: "Calendrier, créneaux, RDV",                           category: "professionnel", available_for_roles: ["educator","shelter"],                    sort_order: 8 },
  { slug: "payments_marketplace", name: "Paiements & marketplace",         description: "Cours, réservations, payouts Stripe Connect",         category: "commerce",      available_for_roles: ["educator"],                              sort_order: 9 },
  { slug: "shelter_management",   name: "Gestion refuge",                  description: "Espaces, employés, opérations refuge",                category: "refuge",        available_for_roles: ["shelter"],                               sort_order: 10 },
  { slug: "adoption_followup",    name: "Adoption & post-adoption",        description: "Plans d'adoption, suivi adoptant",                    category: "adoption",      available_for_roles: ["shelter","adopter"],                     sort_order: 11 },
  { slug: "team_permissions",     name: "Équipe & permissions",            description: "Membres, rôles, droits",                              category: "organisation",  available_for_roles: ["educator","shelter"],                    sort_order: 12 },
  { slug: "pdf_exports",          name: "Exports PDF",                     description: "Rapports et exports documents",                       category: "documents",     available_for_roles: ["owner","educator","shelter"],            sort_order: 13 },
  { slug: "branding",             name: "Branding / page publique",        description: "Identité visuelle et page publique",                  category: "image",         available_for_roles: ["educator","shelter"],                    sort_order: 14 },
  { slug: "messaging",            name: "Messagerie",                      description: "Messagerie inter-rôles",                              category: "communication", available_for_roles: ["owner","educator","shelter","adopter"],  sort_order: 15 },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Admin gate
    const { data: roleRow } = await admin
      .from("user_roles").select("role")
      .eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("Seeding modules", { count: MODULES.length });

    const rows = MODULES.map((m) => ({
      slug: m.slug,
      name: m.name,
      description: m.description,
      category: m.category,
      available_for_roles: m.available_for_roles,
      pricing_type: "included",
      monthly_price_chf: 0,
      yearly_price_chf: 0,
      credit_cost: 0,
      sort_order: m.sort_order,
      is_active: true,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await admin
      .from("modules")
      .upsert(rows, { onConflict: "slug" });

    if (error) {
      log("Upsert failed", { error: error.message });
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { count } = await admin
      .from("modules").select("slug", { count: "exact", head: true });

    log("Seed complete", { total: count });
    return new Response(
      JSON.stringify({ success: true, seeded: rows.length, total: count }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
