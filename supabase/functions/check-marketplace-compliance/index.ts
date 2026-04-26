import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mots déclencheurs paiement hors-plateforme — case-insensitive, regex word-boundary
const FORBIDDEN_PATTERNS: { label: string; pattern: RegExp; severity: "high" | "medium" }[] = [
  { label: "twint", pattern: /\btwint\b/i, severity: "high" },
  { label: "paypal", pattern: /\bpaypal\b/i, severity: "high" },
  { label: "iban", pattern: /\biban\b|\b[A-Z]{2}\d{2}[A-Z0-9]{4,}\b/i, severity: "high" },
  { label: "virement", pattern: /\bvirement\b|\bbank transfer\b/i, severity: "high" },
  { label: "espèces", pattern: /\bespe?ces\b|\bcash\b|\ben main propre\b/i, severity: "high" },
  { label: "revolut", pattern: /\brevolut\b|\bwise\b|\bn26\b/i, severity: "high" },
  { label: "contact direct", pattern: /\b(whatsapp|telegram|signal|sms direct)\b/i, severity: "medium" },
  { label: "email paiement", pattern: /paiement[^\n]{0,30}@/i, severity: "high" },
  { label: "hors plateforme", pattern: /\bhors[- ]plateforme\b|\boff[- ]platform\b/i, severity: "high" },
  { label: "prix réduit hors site", pattern: /\b(moins cher|tarif réduit)\b[^\n]{0,40}\b(direct|sans commission)\b/i, severity: "medium" },
];

interface CheckBody {
  course_id?: string | null;
  text: string;
  context?: "title" | "description" | "message" | "profile";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: u } = await userClient.auth.getUser();
    if (!u.user) {
      return new Response(JSON.stringify({ error: "Session invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as CheckBody;
    if (!body?.text || typeof body.text !== "string") {
      return new Response(JSON.stringify({ error: "text requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const matches = FORBIDDEN_PATTERNS.filter((p) => p.pattern.test(body.text)).map((p) => ({
      label: p.label,
      severity: p.severity,
    }));

    const status = matches.some((m) => m.severity === "high")
      ? "blocked"
      : matches.length > 0
        ? "warning"
        : "clean";

    // Persist if course_id provided
    if (body.course_id) {
      await admin.from("marketplace_compliance_checks").insert({
        course_id: body.course_id,
        educator_user_id: u.user.id,
        context: body.context ?? "description",
        status,
        matches,
        scanned_text_excerpt: body.text.slice(0, 500),
      });
    }

    return new Response(
      JSON.stringify({
        status,
        matches,
        message:
          status === "blocked"
            ? "Contenu bloqué : mention de paiement hors-plateforme détectée. Toute transaction doit passer par DogWork."
            : status === "warning"
              ? "Contenu autorisé mais à vérifier."
              : "Contenu conforme.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
