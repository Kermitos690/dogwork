import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const TIERS = {
  starter: {
    name: "Starter",
    price_id: null,
    product_id: null,
    price: 0,
    label: "Gratuit",
  },
  pro: {
    name: "Pro",
    price_id: "price_1T9nakPshPrEibTgfEAogTJY",
    product_id: "prod_U83i1wbeLdd3EI",
    price: 7.9,
    label: "7.90 CHF/mois",
  },
  expert: {
    name: "Expert",
    price_id: "price_1T9nbAPshPrEibTgo3JA1m5S",
    product_id: "prod_U83inCbv8JMMgf",
    price: 12.9,
    label: "12.90 CHF/mois",
  },
} as const;

export type TierKey = keyof typeof TIERS;

export function getTierByProductId(productId: string | null): TierKey {
  if (!productId) return "starter";
  for (const [key, tier] of Object.entries(TIERS)) {
    if (tier.product_id === productId) return key as TierKey;
  }
  return "starter";
}

export function getTierByPriceId(priceId: string | null): TierKey {
  if (!priceId) return "starter";
  for (const [key, tier] of Object.entries(TIERS)) {
    if (tier.price_id === priceId) return key as TierKey;
  }
  return "starter";
}

interface SubscriptionState {
  subscribed: boolean;
  tier: TierKey;
  subscriptionEnd: string | null;
  loading: boolean;
  checkSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionState>({
  subscribed: false,
  tier: "starter",
  subscriptionEnd: null,
  loading: true,
  checkSubscription: async () => {},
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [tier, setTier] = useState<TierKey>("starter");
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setSubscribed(false);
      setTier("starter");
      setSubscriptionEnd(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      setSubscribed(data.subscribed ?? false);
      setTier(getTierByProductId(data.product_id));
      setSubscriptionEnd(data.subscription_end ?? null);
    } catch (e) {
      console.error("Error checking subscription:", e);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  // Check on mount and auth change
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Auto-refresh every 60s
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [session, checkSubscription]);

  return (
    <SubscriptionContext.Provider value={{ subscribed, tier, subscriptionEnd, loading, checkSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}

export function useHasFeature(feature: "ai_plan" | "ai_chat"): boolean {
  const { tier } = useSubscription();
  if (feature === "ai_plan") return tier === "pro" || tier === "expert";
  if (feature === "ai_chat") return tier === "expert";
  return false;
}
