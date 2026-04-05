/**
 * Centralized AI credits hook.
 * Provides balance, history, debit check, and pack purchase.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface AIWallet {
  id: string;
  user_id: string;
  balance: number;
  lifetime_purchased: number;
  lifetime_consumed: number;
  lifetime_refunded: number;
}

export interface AILedgerEntry {
  id: string;
  operation_type: string;
  credits_delta: number;
  balance_after: number;
  feature_code: string | null;
  description: string | null;
  provider_cost_usd: number | null;
  public_price_chf: number | null;
  status: string;
  created_at: string;
}

export interface AIFeature {
  code: string;
  label: string;
  description: string | null;
  credits_cost: number;
  is_active: boolean;
}

export interface AICreditPack {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  credits: number;
  price_chf: number;
  is_active: boolean;
  sort_order: number;
}

export function useAIBalance() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ai-balance", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_credit_wallets")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;

      // If no wallet yet, trigger creation via RPC
      if (!data) {
        await supabase.rpc("ensure_ai_wallet", { _user_id: user!.id } as any);
        const { data: wallet } = await supabase
          .from("ai_credit_wallets")
          .select("*")
          .eq("user_id", user!.id)
          .single();
        return wallet as unknown as AIWallet;
      }

      return data as unknown as AIWallet;
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useAILedger(limit = 20) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ai-ledger", user?.id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_credit_ledger")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as unknown as AILedgerEntry[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useAIFeatures() {
  return useQuery({
    queryKey: ["ai-features"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_feature_catalog_public" as any)
        .select("code, label, description, credits_cost, is_active")
        .eq("is_active", true)
        .order("credits_cost");

      if (error) throw error;
      return (data || []) as unknown as AIFeature[];
    },
    staleTime: 5 * 60_000,
  });
}

export function useAICreditPacks() {
  return useQuery({
    queryKey: ["ai-credit-packs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_credit_packs_public" as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      return (data || []) as unknown as AICreditPack[];
    },
    staleTime: 5 * 60_000,
  });
}

export function usePurchaseCreditPack() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (packSlug: string) => {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("Non connecté");

      const { data, error } = await supabase.functions.invoke("create-credits-checkout", {
        body: { pack_slug: packSlug },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.url) {
        // Open in new tab (iframe compatible)
        const w = window.open("about:blank", "_blank");
        if (w) w.location.href = data.url;
        else window.location.href = data.url;
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de l'achat de crédits");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-balance"] });
    },
  });
}

/**
 * Centralized AI call with credits.
 * Returns a mutation that handles credits debit, AI call, and error/refund.
 */
export function useAICall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      featureCode,
      messages,
      systemPrompt,
      stream = false,
    }: {
      featureCode: string;
      messages: Array<{ role: string; content: string }>;
      systemPrompt?: string;
      stream?: boolean;
    }) => {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("Non connecté");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-with-credits`;

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          feature_code: featureCode,
          messages,
          system_prompt: systemPrompt,
          stream,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (err.code === "INSUFFICIENT_CREDITS") {
          throw Object.assign(new Error("Crédits IA insuffisants"), {
            code: "INSUFFICIENT_CREDITS",
            balance: err.balance,
            required: err.required,
          });
        }
        throw new Error(err.error || "Erreur IA");
      }

      if (stream) {
        return resp; // Return raw response for streaming
      }

      return resp.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-balance"] });
    },
  });
}

/**
 * Stream AI response with credits, token by token.
 */
export async function streamAIWithCredits({
  featureCode,
  messages,
  systemPrompt,
  onDelta,
  onDone,
  onError,
}: {
  featureCode: string;
  messages: Array<{ role: string; content: string }>;
  systemPrompt?: string;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError?: (err: Error) => void;
}) {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) {
    onError?.(new Error("Non connecté"));
    return;
  }

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-with-credits`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({
      feature_code: featureCode,
      messages,
      system_prompt: systemPrompt,
      stream: true,
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    onError?.(Object.assign(new Error(err.error || "Erreur IA"), { code: err.code, balance: err.balance, required: err.required }));
    return;
  }

  if (!resp.body) {
    onError?.(new Error("No response body"));
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") {
        onDone();
        return;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  onDone();
}
