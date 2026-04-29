/**
 * SOURCE DE VÉRITÉ DES PROMESSES LANDING
 * ======================================
 * Toute valeur tarifaire / crédits / limites affichée sur src/pages/Landing.tsx
 * DOIT figurer ici à l'identique. Le script `scripts/check-landing-consistency.mjs`
 * compare ces valeurs à la base de production avant chaque publish.
 *
 * Si tu modifies la landing, modifie ici. Si tu modifies la base, modifie ici.
 * Sinon le check pre-publish échouera.
 */

export interface LandingPromises {
  plans: Array<{
    code: string;       // doit matcher subscription_plans.code
    price_chf: number;  // doit matcher subscription_plan_prices.price_chf (is_public=true)
    monthly_ai_credits: number; // doit matcher subscription_plans.monthly_ai_credits
    max_dogs: number | "unlimited"; // doit matcher subscription_plans.max_dogs (>=999999 = unlimited)
  }>;
  credit_packs: Array<{
    credits: number;    // doit matcher ai_credit_packs.credits
    price_chf: number;  // doit matcher ai_credit_packs.price_chf
  }>;
  ai_feature_costs: Array<{
    code: string;       // doit matcher ai_feature_catalog.code
    credits_cost: number;
  }>;
  signup_bonus_credits: number; // bonus offert à l'inscription (annoncé sur landing)
}

export const LANDING_PROMISES: LandingPromises = {
  plans: [
    { code: "starter", price_chf: 0, monthly_ai_credits: 1, max_dogs: 1 },
    { code: "pro",     price_chf: 9.9, monthly_ai_credits: 5, max_dogs: 3 },
    { code: "expert",  price_chf: 19.9, monthly_ai_credits: 15, max_dogs: "unlimited" },
  ],
  credit_packs: [
    { credits: 80,  price_chf: 4.9 },
    { credits: 150, price_chf: 6.9 },
    { credits: 500, price_chf: 19.9 },
  ],
  ai_feature_costs: [
    { code: "chat",              credits_cost: 1 },
    { code: "education_plan",    credits_cost: 8 },
    { code: "behavior_analysis", credits_cost: 13 },
    { code: "dog_profile_analysis", credits_cost: 13 },
  ],
  signup_bonus_credits: 10,
};
