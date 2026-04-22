import { runAgent } from "../_shared/agent-runner.ts";

Deno.serve((req) =>
  runAgent(req, {
    code: "agent_dog_insights",
    label: "Insights chien",
    documentType: "dog_insights",
    model: "google/gemini-2.5-pro",
    systemPrompt:
      "Tu es un comportementaliste canin. À partir du profil complet du chien (âge, seuil, réactivité, sociabilité, santé), produis une synthèse premium en français : 1) Personnalité dominante, 2) Forces, 3) Vulnérabilités, 4) Recommandations long terme pour son équilibre. Ton chaleureux, professionnel, max 600 mots.",
    fetchContext: async (supabase, _userId, dogId) => {
      if (!dogId) throw new Error("Aucun chien actif détecté. Sélectionnez un chien.");
      const [evalRes, objRes, probRes] = await Promise.all([
        supabase.from("dog_evaluations").select("*").eq("dog_id", dogId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("dog_objectives").select("objective_key, is_priority").eq("dog_id", dogId),
        supabase.from("dog_problems").select("problem_key, intensity, frequency, comment").eq("dog_id", dogId),
      ]);
      return {
        evaluation: evalRes.data,
        objectives: objRes.data ?? [],
        problems: probRes.data ?? [],
        summary: "insights",
      };
    },
    buildUserPrompt: (ctx) => {
      const p = ctx.dogProfile!;
      return `Profil normalisé du chien :\n${JSON.stringify(p, null, 2)}\n\nDernière évaluation :\n${JSON.stringify(ctx.evaluation, null, 2)}\n\nObjectifs : ${JSON.stringify(ctx.objectives)}\nProblèmes : ${JSON.stringify(ctx.problems)}\n\nProduis la synthèse demandée.`;
    },
  })
);
