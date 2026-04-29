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

/**
 * Hardcoded fallback costs aligned with the DB seed.
 * Used when the DB row is missing or returns 0 — guarantees the UI never shows "0 crédit".
 */
export const AI_FEATURE_FALLBACK_COSTS: Record<string, number> = {
  plan_generator: 5,
  education_plan: 8,
  behavior_analysis: 13,
  dog_profile_analysis: 13,
  adoption_plan: 15,
  behavior_summary: 5,
  chat: 1,
  chat_general: 1,
  ai_image_generation: 10,
};

export function resolveAIFeatureCode(code: string): string {
  return AI_FEATURE_CANONICAL_MAP[code] ?? code;
}

export function getFallbackCost(code: string): number {
  const canonical = resolveAIFeatureCode(code);
  return AI_FEATURE_FALLBACK_COSTS[canonical] ?? AI_FEATURE_FALLBACK_COSTS[code] ?? 0;
}

export function expandAIFeaturesWithAliases(features: FeatureLike[]): FeatureLike[] {
  const byCode = new Map(features.map((feature) => [feature.code, feature]));
  const expanded = [...features];

  // Patch any zero/missing cost on canonical codes with the hardcoded fallback.
  for (const feature of expanded) {
    if (!feature.credits_cost || feature.credits_cost <= 0) {
      const fallback = AI_FEATURE_FALLBACK_COSTS[feature.code];
      if (fallback) feature.credits_cost = fallback;
    }
  }

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

  // Ensure every alias known in TOOLS has at least a synthetic entry with fallback cost.
  for (const aliasCode of Object.keys(AI_FEATURE_CANONICAL_MAP)) {
    if (byCode.has(aliasCode)) continue;
    const fallback = getFallbackCost(aliasCode);
    if (!fallback) continue;
    if (expanded.some((f) => f.code === aliasCode)) continue;
    expanded.push({
      code: aliasCode,
      label: AI_FEATURE_LABELS[aliasCode] ?? aliasCode,
      description: null,
      credits_cost: fallback,
      is_active: true,
    });
  }

  return expanded;
}
