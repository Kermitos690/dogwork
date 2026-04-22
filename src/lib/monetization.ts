/**
 * Monetization configuration layer.
 *
 * Single source of truth for tunable monetization knobs. Anything that
 * controls upsell behaviour, paywall thresholds, or pricing display logic
 * should live here so future pricing changes do not require a rewrite.
 *
 * Hard rule: this file holds *behaviour* config only. Real prices and
 * credit costs always come from the DB (`ai_feature_catalog`,
 * `ai_credit_packs`, `ai_pricing_config`).
 */

export type UpsellTrigger =
  | "low_balance"      // user is running out of credits
  | "zero_balance"     // user has nothing left
  | "repeated_use"     // user uses same paid feature often
  | "plan_limit"       // user hit a plan-tier ceiling
  | "premium_feature"; // user tries a feature gated by a higher tier

export interface MonetizationConfig {
  /** Balance thresholds (in credits) that drive low-balance UX */
  lowBalanceWarning: number;
  lowBalanceCritical: number;

  /** Number of paid uses of the same feature before suggesting an upgrade */
  repeatedUseUpsellThreshold: number;

  /** Window (in days) over which repeated use is counted */
  repeatedUseWindowDays: number;

  /** Prefer pack purchase over plan upgrade when remaining balance is below this */
  preferPackOverUpgradeBelow: number;

  /** Display CHF estimates next to credit costs */
  showCurrencyEstimate: boolean;
}

/**
 * Default config. Safe to ship as-is; can later be overridden from
 * `ai_pricing_config` rows without touching component code.
 */
export const MONETIZATION_DEFAULTS: MonetizationConfig = {
  lowBalanceWarning: 10,
  lowBalanceCritical: 3,
  repeatedUseUpsellThreshold: 5,
  repeatedUseWindowDays: 7,
  preferPackOverUpgradeBelow: 5,
  showCurrencyEstimate: true,
};

/**
 * Decide which upsell variant to show, if any.
 * Returns `null` when the user is comfortably within their allowance.
 */
export function resolveUpsellTrigger(params: {
  balance: number;
  requiredCredits?: number;
  recentFeatureUses?: number;
  hitPlanLimit?: boolean;
  config?: Partial<MonetizationConfig>;
}): UpsellTrigger | null {
  const cfg = { ...MONETIZATION_DEFAULTS, ...(params.config ?? {}) };

  if (params.hitPlanLimit) return "plan_limit";

  if (typeof params.requiredCredits === "number") {
    if (params.balance < params.requiredCredits) {
      return params.balance <= 0 ? "zero_balance" : "low_balance";
    }
  }

  if (params.balance <= cfg.lowBalanceCritical) return "zero_balance";
  if (params.balance <= cfg.lowBalanceWarning) return "low_balance";

  if (
    params.recentFeatureUses !== undefined &&
    params.recentFeatureUses >= cfg.repeatedUseUpsellThreshold
  ) {
    return "repeated_use";
  }

  return null;
}

/**
 * Suggest the best monetization path (buy pack vs upgrade plan) based on
 * the user's current balance. Components decide how to render it.
 */
export function suggestMonetizationPath(params: {
  balance: number;
  config?: Partial<MonetizationConfig>;
}): "buy_pack" | "upgrade_plan" {
  const cfg = { ...MONETIZATION_DEFAULTS, ...(params.config ?? {}) };
  return params.balance <= cfg.preferPackOverUpgradeBelow ? "buy_pack" : "upgrade_plan";
}

/**
 * Format a credit cost for display, optionally with a CHF estimate.
 * `chfPerCredit` should come from `ai_pricing_config.credit_value_chf`.
 */
export function formatCreditCost(
  credits: number,
  opts: { chfPerCredit?: number; showCurrency?: boolean } = {},
): string {
  const base = `${credits} cr.`;
  const showCurrency = opts.showCurrency ?? MONETIZATION_DEFAULTS.showCurrencyEstimate;
  if (!showCurrency || !opts.chfPerCredit || opts.chfPerCredit <= 0) return base;
  const chf = (credits * opts.chfPerCredit).toFixed(2);
  return `${base} · ~${chf} CHF`;
}
