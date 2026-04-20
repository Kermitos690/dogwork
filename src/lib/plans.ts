/**
 * Centralized plan configuration for DogWork monetization.
 * Single source of truth for all plan definitions, features, and limits.
 *
 * Grille tarifaire officielle (v2 — avril 2026) :
 *   Freemium   0 CHF
 *   Pro        9.90 CHF/mois
 *   Expert    19.90 CHF/mois
 *   Éducateur 200 CHF/an  (+15.8 % frais de gestion)
 *   Refuge    sur mesure
 */

export type OwnerTier = "starter" | "pro" | "expert";

export interface PlanFeatures {
  dogs_limit: number;
  exercise_library_limit: number;
  behavior_evaluation: boolean;
  advanced_objectives: boolean;
  advanced_stats: boolean;
  ai_plan: boolean;
  ai_chat: boolean;
  pdf_export: boolean;
  allowed_exercise_tiers: OwnerTier[];
}

export interface PlanConfig {
  slug: OwnerTier;
  name: string;
  label: string;
  price: number;
  price_id: string | null;
  product_id: string | null;
  order: number;
  badge?: string;
  features: PlanFeatures;
  marketing: {
    tagline: string;
    highlights: string[];
  };
}

export const PLANS: Record<OwnerTier, PlanConfig> = {
  starter: {
    slug: "starter",
    name: "Freemium",
    label: "Gratuit",
    price: 0,
    price_id: null,
    product_id: null,
    order: 0,
    features: {
      dogs_limit: 1,
      exercise_library_limit: 15,
      behavior_evaluation: false,
      advanced_objectives: false,
      advanced_stats: false,
      ai_plan: false,
      ai_chat: false,
      pdf_export: false,
      allowed_exercise_tiers: ["starter"],
    },
    marketing: {
      tagline: "Découvrez DogWork gratuitement",
      highlights: [
        "1 profil chien",
        "5 programmes d'entraînement essentiels",
        "Bibliothèque d'exercices fondamentaux",
        "Journal et suivi quotidien",
        "Statistiques essentielles",
      ],
    },
  },
  pro: {
    slug: "pro",
    name: "Pro",
    label: "9.90 CHF/mois",
    price: 9.9,
    price_id: "price_1TKpFyPshPrEibTgOW98FPOq",
    product_id: "prod_U83i1wbeLdd3EI",
    order: 1,
    badge: "Le plus populaire",
    features: {
      dogs_limit: 1,
      exercise_library_limit: 150,
      behavior_evaluation: true,
      advanced_objectives: true,
      advanced_stats: true,
      ai_plan: false,
      ai_chat: false,
      pdf_export: true,
      allowed_exercise_tiers: ["starter", "pro"],
    },
    marketing: {
      tagline: "L'essentiel pour éduquer sérieusement",
      highlights: [
        "1 profil chien",
        "30 programmes Pro structurés",
        "Évaluation comportementale complète",
        "Objectifs & problèmes personnalisés",
        "Statistiques avancées",
        "Tout le plan Freemium inclus",
      ],
    },
  },
  expert: {
    slug: "expert",
    name: "Expert",
    label: "19.90 CHF/mois",
    price: 19.9,
    price_id: "price_1TKpNpPshPrEibTgDiRVEAmV",
    product_id: "prod_U83inCbv8JMMgf",
    order: 2,
    badge: "Accès complet",
    features: {
      dogs_limit: Infinity,
      exercise_library_limit: Infinity,
      behavior_evaluation: true,
      advanced_objectives: true,
      advanced_stats: true,
      ai_plan: true,
      ai_chat: true,
      pdf_export: true,
      allowed_exercise_tiers: ["starter", "pro", "expert"],
    },
    marketing: {
      tagline: "Toute la puissance DogWork",
      highlights: [
        "Chiens illimités",
        "480+ exercices (toute la bibliothèque)",
        "Plan IA personnalisé sur demande (durée au choix)",
        "Chatbot IA 24/7",
        "Analyse comportementale avancée",
        "Tout le plan Pro inclus",
      ],
    },
  },
};

export const PLAN_ORDER: OwnerTier[] = ["starter", "pro", "expert"];

export function getTierByProductId(productId: string | null): OwnerTier {
  if (!productId) return "starter";
  for (const plan of Object.values(PLANS)) {
    if (plan.product_id === productId) return plan.slug;
  }
  return "starter";
}

export function getTierByPriceId(priceId: string | null): OwnerTier {
  if (!priceId) return "starter";
  for (const plan of Object.values(PLANS)) {
    if (plan.price_id === priceId) return plan.slug;
  }
  return "starter";
}

export function canAccessFeature(tier: OwnerTier, feature: keyof PlanFeatures): boolean {
  return !!PLANS[tier].features[feature];
}

/**
 * Returns true for tiers that grant full premium access (Expert + B2B Educator/Shelter).
 * Used by feature gates so an admin-granted Educator/Shelter override unlocks all owner features.
 */
export function tierGrantsFullAccess(tier: string | null | undefined): boolean {
  return tier === "expert" || tier === "educator" || tier === "shelter";
}

export function getFeatureLimit(tier: OwnerTier, feature: "dogs_limit" | "exercise_library_limit"): number {
  return PLANS[tier].features[feature];
}

export function isExerciseTierAccessible(exerciseTier: string, userTier: OwnerTier): boolean {
  const allowedTiers = PLANS[userTier].features.allowed_exercise_tiers;
  return allowedTiers.includes(exerciseTier as OwnerTier);
}

/** Educator constants */
export const EDUCATOR_PRODUCT_ID = "prod_U8CxlV7PMpHAgA";
export const EDUCATOR_PRICE_ID = "price_1T9wXlPshPrEibTgEM0BNrSm";

/** Shelter constants */
export const SHELTER_PRODUCT_ID = "prod_UDKcjmnJnM7pBo";
export const SHELTER_PRICE_ID = "price_1TEtxAPshPrEibTgsDFHr8Nw";

/** Commission rate */
export const COMMISSION_RATE = 0.158;
export const COMMISSION_DISPLAY = "15,8 %";
