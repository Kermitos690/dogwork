import { useState, useCallback } from "react";
import { useAIBalance, useAIFeatures } from "@/hooks/useAICredits";
import { getFallbackCost, resolveAIFeatureCode } from "@/lib/aiFeatureCatalog";
import {
  resolveUpsellTrigger,
  suggestMonetizationPath,
  type UpsellTrigger,
} from "@/lib/monetization";

interface PendingAction {
  featureCode: string;
  benefit?: string;
  onConfirm: () => void | Promise<void>;
}

/**
 * Hook centralisé pour confirmer toute action consommant des crédits IA.
 * Affiche le coût, le solde, et le bénéfice avant exécution.
 */
export function useCreditConfirmation() {
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [loading, setLoading] = useState(false);
  const { data: wallet } = useAIBalance();
  const { data: features } = useAIFeatures();

  const resolvedCode = pending ? resolveAIFeatureCode(pending.featureCode) : undefined;
  const feature = pending
    ? features?.find((f) => f.code === pending.featureCode) ??
      features?.find((f) => f.code === resolvedCode)
    : undefined;
  const fallbackCost = pending ? getFallbackCost(pending.featureCode) : 0;
  const catalogCost = Number(feature?.credits_cost ?? 0);
  const cost = catalogCost > 0 ? catalogCost : fallbackCost;
  const balance = wallet?.balance ?? 0;
  const featureReady = !pending || cost > 0;

  const requestConfirmation = useCallback((action: PendingAction) => {
    setPending(action);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!pending) return;
    if (cost <= 0) return;
    setLoading(true);
    try {
      await pending.onConfirm();
    } finally {
      setLoading(false);
      setPending(null);
    }
  }, [pending, cost]);

  const handleCancel = useCallback(() => {
    setPending(null);
  }, []);

  const trigger: UpsellTrigger | null = resolveUpsellTrigger({
    balance,
    requiredCredits: cost > 0 ? cost : undefined,
  });
  const suggestedPath = suggestMonetizationPath({ balance });

  return {
    open: !!pending,
    cost,
    balance,
    featureLabel: feature?.label ?? "Action IA",
    benefit: pending?.benefit,
    loading,
    featureReady,
    trigger,
    suggestedPath,
    hasEnough: balance >= cost,
    requestConfirmation,
    handleConfirm,
    handleCancel,
    setOpen: (o: boolean) => {
      if (!o) handleCancel();
    },
  };
}
