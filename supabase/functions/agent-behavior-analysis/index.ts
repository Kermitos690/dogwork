import { runAgent, corsHeaders } from "../_shared/agent-runner.ts";

Deno.serve((req) =>
  runAgent(req, {
    code: "agent_behavior_analysis",
    label: "Analyse comportementale",
    documentType: "behavior_analysis",
    model: "google/gemini-2.5-flash",
    systemPrompt:
      "Tu es un expert en comportement canin. Analyse les données fournies et produis un rapport structuré en français : 1) Tendances observées, 2) Points d'amélioration, 3) Signaux d'alerte éventuels, 4) Recommandations concrètes. Style clair, professionnel, max 600 mots.",
    fetchContext: async (supabase, userId, dogId) => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      let q = supabase
        .from("behavior_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false });
      if (dogId) q = q.eq("dog_id", dogId);
      const { data: logs } = await q;
      const { data: dog } = dogId
        ? await supabase.from("dogs").select("name, breed, birth_date").eq("id", dogId).maybeSingle()
        : { data: null };
      return { dog, logs: logs ?? [], summary: `${logs?.length ?? 0} entrées sur 7 jours` };
    },
    buildUserPrompt: (ctx) =>
      `Chien: ${ctx.dog?.name ?? "non spécifié"} (${ctx.dog?.breed ?? "race inconnue"}).\n\nLogs comportementaux des 7 derniers jours (${ctx.logs.length} entrées):\n${JSON.stringify(ctx.logs, null, 2)}\n\nProduis le rapport demandé.`,
  })
);
