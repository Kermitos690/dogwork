import { useState, useCallback } from "react";
import { useAIBalance, useAIFeatures } from "@/hooks/useAICredits";

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

  const feature = pending ? features?.find((f) => f.code === pending.featureCode) : undefined;
  const cost = feature?.credits_cost ?? 0;
  const balance = wallet?.balance ?? 0;

  const requestConfirmation = useCallback((action: PendingAction) => {
    setPending(action);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!pending) return;
    setLoading(true);
    try {
      await pending.onConfirm();
    } finally {
      setLoading(false);
      setPending(null);
    }
  }, [pending]);

  const handleCancel = useCallback(() => {
    setPending(null);
  }, []);

  return {
    open: !!pending,
    cost,
    balance,
    featureLabel: feature?.label ?? "Action IA",
    benefit: pending?.benefit,
    loading,
    requestConfirmation,
    handleConfirm,
    handleCancel,
    setOpen: (o: boolean) => {
      if (!o) handleCancel();
    },
  };
}
