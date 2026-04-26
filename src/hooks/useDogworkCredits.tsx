import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DebitParams {
  feature_key: string;
  module_slug?: string | null;
  organization_id?: string | null;
  reference_id?: string | null;
  metadata?: Record<string, unknown>;
}

interface DebitResult {
  success: boolean;
  error?: string;
  balance?: number;
  required?: number;
  module_slug?: string;
  message?: string;
}

/**
 * Hook unifié pour débiter des Crédits DogWork via l'edge function sécurisée.
 * - Vérifie le module requis côté serveur (has_module)
 * - Débite atomiquement via debit_dogwork_credits RPC
 * - Affiche feedback toast adapté
 */
export function useDogworkCredits() {
  const qc = useQueryClient();

  const debit = useMutation({
    mutationFn: async (params: DebitParams): Promise<DebitResult> => {
      const { data, error } = await supabase.functions.invoke("debit-dogwork-credits", {
        body: params,
      });
      if (error) throw new Error(error.message);
      return data as DebitResult;
    },
    onSuccess: (res) => {
      if (res.success) {
        qc.invalidateQueries({ queryKey: ["credit_balance"] });
        qc.invalidateQueries({ queryKey: ["ai_wallet"] });
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erreur lors du débit de crédits");
    },
  });

  return {
    debit: debit.mutateAsync,
    isDebiting: debit.isPending,
  };
}
