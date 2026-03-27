import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Safe by default: block unless ENVIRONMENT is explicitly "development"
  const environment = Deno.env.get("ENVIRONMENT") || "production";
  if (environment !== "development") {
    return new Response(JSON.stringify({ error: "Not available in this environment" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Auth check: admin only
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: userData } = await supabase.auth.getUser(token);
  if (!userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const translations = [
    {
      id: "31868659-23aa-4197-bf7c-96c14f19063d",
      description: "L'exercice 'Rappel de base' apprend à votre chien à revenir vers vous quand vous l'appelez.",
      success_criteria: "Le chien revient vers le maître en moins de 5 secondes après l'appel.",
      stop_criteria: "Le chien montre des signes de stress ou ignore systématiquement l'ordre.",
      tutorial_steps: [
        { title: "Commencer à l'intérieur", instruction: "Appelez le nom de votre chien suivi de 'Viens !' d'un ton joyeux." },
        { title: "Récompenser immédiatement", instruction: "Dès que votre chien avance vers vous, félicitez-le." },
      ],
      troubleshooting: [
        { problem: "Le chien ignore l'ordre.", solution: "Revenez dans un environnement plus calme avec de meilleures friandises." },
      ],
    },
  ];

  const results = [];
  for (const t of translations) {
    const updateData: Record<string, unknown> = {
      description: t.description,
      success_criteria: t.success_criteria,
      stop_criteria: t.stop_criteria,
      troubleshooting: t.troubleshooting,
    };
    if (t.tutorial_steps) updateData.tutorial_steps = t.tutorial_steps;

    const { error } = await supabase.from("exercises").update(updateData).eq("id", t.id);
    results.push({ id: t.id, error: error?.message || "ok" });
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
