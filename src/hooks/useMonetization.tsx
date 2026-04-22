/**
 * Smart monetization hook.
 *
 * Combines wallet balance, feature cost, and upsell config into one
 * reactive object that any AI-triggering component can consume to decide
 * whether to show a paywall, a low-credit warning, or proceed silently.
 *
 * This hook is a thin orchestration layer — all real data still comes
 * from the existing canonical sources (`useAIBalance`, `useAIFeatures`).
 */
import { useMemo } from "react";
import { useAIBalance, useAIFeatures } from "@/hooks/useAICredits";
import {
  MONETIZATION_DEFAULTS,
  resolveUpsellTrigger,
  suggestMonetizationPath,
  type UpsellTrigger,
} from "@/lib/monetization";

export interface MonetizationState {
  balance: number;
  cost: number;
  hasEnough: boolean;
  remainingAfter: number;
  trigger: UpsellTrigger | null;
  suggestedPath: "buy_pack" | "upgrade_plan";
  isLow: boolean;
  isCritical: boolean;
  loading: boolean;
}

export function useMonetization(featureCode?: string): MonetizationState {
  const { data: wallet, isLoading: walletLoading } = useAIBalance();
  const { data: features, isLoading: featuresLoading } = useAIFeatures();

  return useMemo<MonetizationState>(() => {
    const balance = wallet?.balance ?? 0;
    const feature = featureCode ? features?.find((f) => f.code === featureCode) : undefined;
    const cost = feature?.credits_cost ?? 0;
    const remainingAfter = Math.max(0, balance - cost);
    const hasEnough = balance >= cost;

    const trigger = resolveUpsellTrigger({
      balance,
      requiredCredits: cost > 0 ? cost : undefined,
    });

    return {
      balance,
      cost,
      hasEnough,
      remainingAfter,
      trigger,
      suggestedPath: suggestMonetizationPath({ balance }),
      isLow: balance <= MONETIZATION_DEFAULTS.lowBalanceWarning,
      isCritical: balance <= MONETIZATION_DEFAULTS.lowBalanceCritical,
      loading: walletLoading || featuresLoading,
    };
  }, [wallet, features, featureCode, walletLoading, featuresLoading]);
}
