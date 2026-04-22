import { runAgent } from "../_shared/agent-runner.ts";

Deno.serve((req) =>
  runAgent(req, {
    code: "agent_plan_adjustment",
    label: "Ajustement du plan",
    documentType: "plan_adjustment",
    model: "google/gemini-2.5-pro",
    systemPrompt:
      "Tu es un éducateur canin senior. Analyse les performances récentes du chien et propose des ajustements concrets au plan d'entraînement. Format : 1) Diagnostic synthétique, 2) Axes à renforcer, 3) Exercices à ajouter/retirer (en respectant l'âge, le seuil et la réactivité), 4) Nouvelle priorité hebdo. Sois actionnable, en français, max 700 mots.",
    fetchContext: async (supabase, userId, dogId) => {
      const fourteen = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      let progQ = supabase
        .from("day_progress")
        .select("day_id, status, completed_exercises, notes")
        .eq("user_id", userId)
        .gte("created_at", fourteen);
      let behavQ = supabase
        .from("behavior_logs")
        .select("tension_level, focus_quality, leash_walk_quality, recovery_after_trigger, comments")
        .eq("user_id", userId)
        .gte("created_at", fourteen);
      let objQ = supabase
        .from("dog_objectives")
        .select("objective_key, is_priority")
        .eq("user_id", userId);
      let probQ = supabase
        .from("dog_problems")
        .select("problem_key, intensity, frequency, comment")
        .eq("user_id", userId);
      if (dogId) {
        progQ = progQ.eq("dog_id", dogId);
        behavQ = behavQ.eq("dog_id", dogId);
        objQ = objQ.eq("dog_id", dogId);
        probQ = probQ.eq("dog_id", dogId);
      }
      const [progress, behavior, objectives, problems] = await Promise.all([progQ, behavQ, objQ, probQ]);
      return {
        progress: progress.data ?? [],
        behavior: behavior.data ?? [],
        objectives: objectives.data ?? [],
        problems: problems.data ?? [],
        summary: `${progress.data?.length ?? 0} jours, ${behavior.data?.length ?? 0} logs`,
      };
    },
    buildUserPrompt: (ctx) => {
      const p = ctx.dogProfile;
      const profileBlock = p
        ? `Chien actif : ${p.name} · ${p.breed ?? "race n/a"} · ${p.age_years ?? "?"} ans · taille ${p.size ?? "n/a"}.\n` +
          `Réactivité ${p.reactivity_level ?? "n/a"}/10 · Seuil ${p.threshold_distance_m ?? "n/a"} m · Récupération ${p.recovery_capacity ?? "n/a"}/10 · Obéissance ${p.obedience_level ?? "n/a"}/10.\n` +
          (p.health_flags.length ? `Drapeaux santé : ${p.health_flags.join(", ")}.\n` : "")
        : "Chien : non spécifié.\n";
      return `${profileBlock}\nObjectifs : ${JSON.stringify(ctx.objectives)}\nProblèmes : ${JSON.stringify(ctx.problems)}\nProgression 14j : ${JSON.stringify(ctx.progress)}\nComportement 14j : ${JSON.stringify(ctx.behavior)}\n\nPropose un ajustement de plan structuré, calibré au profil ci-dessus.`;
    },
  })
);
