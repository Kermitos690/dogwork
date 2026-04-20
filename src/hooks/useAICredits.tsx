/**
 * Centralized AI credits hook.
 * Uses canonical SQL functions: get_my_credit_balance(), v_active_credit_packs, v_my_credit_orders
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface AIWallet {
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
  sort_order: number;
}

export interface CreditOrder {
  id: string;
  description: string | null;
  credits: number;
  amount_chf: number;
  status: string;
  stripe_payment_id: string | null;
  created_at: string;
}

// ─── Wallet balance via RPC ───────────────────────────────────────
export function useAIBalance() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ai-balance", user?.id],
    queryFn: async (): Promise<AIWallet> => {
      if (!user) throw new Error("Non connecté");

      const normalizeWallet = (row?: Partial<AIWallet> | null): AIWallet => ({
        balance: row?.balance ?? 0,
        lifetime_purchased: row?.lifetime_purchased ?? 0,
        lifetime_consumed: row?.lifetime_consumed ?? 0,
        lifetime_refunded: row?.lifetime_refunded ?? 0,
      });

      const { data: walletRow, error: walletError } = await supabase
        .from("ai_credit_wallets")
        .select("balance, lifetime_purchased, lifetime_consumed, lifetime_refunded")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!walletError && walletRow) {
        return normalizeWallet(walletRow);
      }

      const { data: rpcData, error: rpcError } = await supabase.rpc("get_my_credit_balance" as any);
      const rpcRow = Array.isArray(rpcData) ? rpcData[0] : rpcData;

      if (!rpcError && rpcRow) {
        return normalizeWallet(rpcRow);
      }

      const { error: ensureError } = await supabase.rpc("ensure_credit_wallet" as any);
      if (ensureError) {
        throw walletError || rpcError || ensureError;
      }

      const { data: ensuredWallet, error: ensuredWalletError } = await supabase
        .from("ai_credit_wallets")
        .select("balance, lifetime_purchased, lifetime_consumed, lifetime_refunded")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ensuredWalletError) {
        throw walletError || rpcError || ensuredWalletError;
      }

      return normalizeWallet(ensuredWallet);
    },
    enabled: !!user,
    staleTime: 15_000,
  });
}

// ─── Active credit packs via view ─────────────────────────────────
export function useAICreditPacks() {
  return useQuery({
    queryKey: ["ai-credit-packs"],
    queryFn: async (): Promise<AICreditPack[]> => {
      const { data, error } = await supabase
        .from("v_active_credit_packs" as any)
        .select("*")
        .order("sort_order");

      if (error) throw error;
      return (data || []) as unknown as AICreditPack[];
    },
    staleTime: 5 * 60_000,
  });
}

// ─── Credit orders history via view ───────────────────────────────
export function useCreditOrders() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["credit-orders", user?.id],
    queryFn: async (): Promise<CreditOrder[]> => {
      const { data, error } = await supabase
        .from("v_my_credit_orders" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as CreditOrder[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

// ─── Ledger history (full activity) ──────────────────────────────
export function useAILedger(limit = 20) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ai-ledger", user?.id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_credit_ledger")
        .select("id, created_at, credits_delta, operation_type, balance_after, feature_code, description, public_price_chf, status, metadata, user_id, wallet_id, stripe_payment_id")
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

// ─── Feature catalog ─────────────────────────────────────────────
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

// ─── Purchase credit pack ────────────────────────────────────────
export function usePurchaseCreditPack() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (packSlug: string) => {
      const newWindow = window.open("about:blank", "_blank");

      const session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        newWindow?.close();
        throw new Error("Non connecté");
      }

      const { data, error } = await supabase.functions.invoke("create-credits-checkout", {
        body: { pack_slug: packSlug },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        newWindow?.close();
        throw error;
      }
      if (data?.url) {
        if (newWindow) newWindow.location.href = data.url;
        else window.location.href = data.url;
      } else {
        newWindow?.close();
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de l'achat de crédits");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-balance"] });
      queryClient.invalidateQueries({ queryKey: ["credit-orders"] });
    },
  });
}

// ─── AI Call with credits ────────────────────────────────────────
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
        if (err.code === "COOLDOWN_ACTIVE") {
          throw Object.assign(new Error(err.error || `Veuillez patienter ${err.retry_after || 30}s`), {
            code: "COOLDOWN_ACTIVE",
            retry_after: err.retry_after,
          });
        }
        throw new Error(err.error || "Erreur IA");
      }

      if (stream) return resp;
      return resp.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-balance"] });
    },
  });
}

// ─── Stream AI with credits ──────────────────────────────────────
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
