export type FeatureLike = {
  code: string;
  label: string;
  description: string | null;
  credits_cost: number;
  is_active: boolean;
};

export const AI_FEATURE_CANONICAL_MAP: Record<string, string> = {
  ai_plan_generation: "plan_generator",
  ai_behavior_analysis: "behavior_analysis",
  ai_evaluation_scoring: "dog_profile_analysis",
  ai_adoption_plan: "adoption_plan",
  ai_progress_report: "behavior_summary",
  agent_behavior_analysis: "behavior_analysis",
  agent_progress_report: "behavior_summary",
  agent_plan_adjustment: "plan_generator",
  agent_dog_insights: "dog_profile_analysis",
};

const AI_FEATURE_LABELS: Partial<Record<string, string>> = {
  ai_plan_generation: "Plan d'entraînement",
  ai_behavior_analysis: "Analyse comportementale",
  ai_evaluation_scoring: "Évaluation IA scoring",
  ai_adoption_plan: "Plan post-adoption",
  ai_progress_report: "Rapport de progression",
  agent_behavior_analysis: "Agent · Analyse comportementale",
  agent_progress_report: "Agent · Rapport de progression",
  agent_plan_adjustment: "Agent · Ajustement du plan",
  agent_dog_insights: "Agent · Insights chien",
};

export function resolveAIFeatureCode(code: string): string {
  return AI_FEATURE_CANONICAL_MAP[code] ?? code;
}

export function expandAIFeaturesWithAliases(features: FeatureLike[]): FeatureLike[] {
  const byCode = new Map(features.map((feature) => [feature.code, feature]));
  const expanded = [...features];

  for (const [aliasCode, canonicalCode] of Object.entries(AI_FEATURE_CANONICAL_MAP)) {
    if (byCode.has(aliasCode)) continue;
    const canonical = byCode.get(canonicalCode);
    if (!canonical) continue;

    expanded.push({
      ...canonical,
      code: aliasCode,
      label: AI_FEATURE_LABELS[aliasCode] ?? canonical.label,
      description: canonical.description,
    });
  }

  return expanded;
}
