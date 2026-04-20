import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import {
  PLANS,
  EDUCATOR_PRODUCT_ID,
  SHELTER_PRODUCT_ID,
  type OwnerTier,
} from "@/lib/plans";

export { PLANS, type OwnerTier };
// Extended tier including B2B paliers (educator, shelter) which grant expert-level rights.
export type TierKey = OwnerTier | "educator" | "shelter";

// Re-export for backward compat
export const TIERS = {
  starter: { name: "Freemium", price_id: null, product_id: null, price: 0, label: "Gratuit" },
  pro: { name: "Pro", price_id: PLANS.pro.price_id, product_id: PLANS.pro.product_id, price: 9.9, label: "9.90 CHF/mois" },
  expert: { name: "Expert", price_id: PLANS.expert.price_id, product_id: PLANS.expert.product_id, price: 19.9, label: "19.90 CHF/mois" },
} as const;

/** Resolve any active product (including Educator/Shelter overrides) to a TierKey. */
export function getTierByProductId(productId: string | null): TierKey {
  if (!productId) return "starter";
  if (productId === EDUCATOR_PRODUCT_ID) return "educator";
  if (productId === SHELTER_PRODUCT_ID) return "shelter";
  for (const plan of Object.values(PLANS)) {
    if (plan.product_id === productId) return plan.slug;
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
      // Always get a fresh session to avoid expired token errors
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      const token = freshSession?.access_token ?? session.access_token;

      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Stale/revoked session → purge local auth silently and stop polling
      const isAuthError =
        (error && (error as any)?.context?.status === 401) ||
        data?.error === "auth_error";

      if (isAuthError) {
        setSubscribed(false);
        setTier("starter");
        setSubscriptionEnd(null);
        await supabase.auth.signOut().catch(() => {});
        return;
      }

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

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  useEffect(() => {
    if (!session) return;
    const interval = setInterval(checkSubscription, 5 * 60_000);
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

/**
 * @deprecated Use credit-based gating instead.
 * AI features are now gated by credits (wallet balance), not by plan tier.
 * Kept for backward compatibility but always returns true so credits are the sole gate.
 */
export function useHasFeature(feature: "ai_plan" | "ai_chat"): boolean {
  // Credits are now the sole gate for AI features.
  // Any authenticated user with credits can access AI.
  return true;
}
