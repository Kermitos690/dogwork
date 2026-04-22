import { runAgent } from "../_shared/agent-runner.ts";

Deno.serve((req) =>
  runAgent(req, {
    code: "agent_progress_report",
    label: "Rapport de progression",
    documentType: "progress_report",
    model: "google/gemini-2.5-flash",
    systemPrompt:
      "Tu es un coach canin. Rédige un rapport hebdomadaire de progression en français basé sur les données fournies. Sections : 1) Vue d'ensemble de la semaine, 2) Réussites, 3) Difficultés, 4) Plan pour la semaine suivante adapté à l'âge et au niveau du chien. Ton encourageant et concret, max 500 mots.",
    fetchContext: async (supabase, userId, dogId) => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      let progressQ = supabase
        .from("day_progress")
        .select("day_id, status, completed_exercises, notes, created_at")
        .eq("user_id", userId)
        .gte("created_at", sevenDaysAgo);
      let sessionsQ = supabase
        .from("exercise_sessions")
        .select("exercise_id, completed, duration_actual, repetitions_done, created_at")
        .eq("user_id", userId)
        .gte("created_at", sevenDaysAgo);
      if (dogId) {
        progressQ = progressQ.eq("dog_id", dogId);
        sessionsQ = sessionsQ.eq("dog_id", dogId);
      }
      const [{ data: progress }, { data: sessions }] = await Promise.all([progressQ, sessionsQ]);
      return {
        progress: progress ?? [],
        sessions: sessions ?? [],
        summary: `${progress?.length ?? 0} jours, ${sessions?.length ?? 0} sessions`,
      };
    },
    buildUserPrompt: (ctx) => {
      const p = ctx.dogProfile;
      const profileBlock = p
        ? `Chien actif : ${p.name} · ${p.breed ?? "race n/a"} · ${p.age_years ?? "?"} ans · niveau d'obéissance ${p.obedience_level ?? "n/a"}/10 · réactivité ${p.reactivity_level ?? "n/a"}/10.\n`
        : "Chien : non spécifié.\n";
      return `${profileBlock}\nJournées (${ctx.progress.length}) :\n${JSON.stringify(ctx.progress, null, 2)}\n\nSessions exercices (${ctx.sessions.length}) :\n${JSON.stringify(ctx.sessions, null, 2)}\n\nRédige le rapport hebdomadaire adapté à ce profil.`;
    },
  })
);
