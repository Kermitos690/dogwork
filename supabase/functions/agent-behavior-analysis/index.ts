import { runAgent, corsHeaders } from "../_shared/agent-runner.ts";

Deno.serve((req) =>
  runAgent(req, {
    code: "agent_behavior_analysis",
    label: "Analyse comportementale",
    documentType: "behavior_analysis",
    model: "google/gemini-2.5-flash",
    systemPrompt:
      "Tu es un expert en comportement canin. Analyse les données fournies et produis un rapport structuré en français : 1) Tendances observées, 2) Points d'amélioration, 3) Signaux d'alerte éventuels, 4) Recommandations concrètes adaptées à l'âge, au seuil et au niveau de réactivité du chien. Style clair, professionnel, max 600 mots.",
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
      return { logs: logs ?? [], summary: `${logs?.length ?? 0} entrées sur 7 jours` };
    },
    buildUserPrompt: (ctx) => {
      const p = ctx.dogProfile;
      const profileBlock = p
        ? `Profil chien actif : ${p.name} · ${p.breed ?? "race n/a"} · ${p.age_years ?? "?"} ans · taille ${p.size ?? "n/a"} · activité ${p.activity_level ?? "n/a"}.\n` +
          `Réactivité (intensité): ${p.reactivity_level ?? "n/a"}/10 · Distance de seuil: ${p.threshold_distance_m ?? "n/a"} m · Récupération: ${p.recovery_capacity ?? "n/a"}/10.\n` +
          `Sociabilité chiens ${p.sociability_dogs ?? "n/a"}/10, humains ${p.sociability_humans ?? "n/a"}/10. Excitation ${p.excitement_level ?? "n/a"}/10, frustration ${p.frustration_level ?? "n/a"}/10.\n` +
          (p.health_flags.length ? `Drapeaux santé : ${p.health_flags.join(", ")}.\n` : "")
        : "Aucun chien actif détecté.\n";
      return `${profileBlock}\nLogs comportementaux des 7 derniers jours (${ctx.logs.length} entrées) :\n${JSON.stringify(ctx.logs, null, 2)}\n\nProduis le rapport demandé en adaptant tes recommandations au profil ci-dessus.`;
    },
  })
);
