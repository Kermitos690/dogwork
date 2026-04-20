import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const EDUCATOR_PRODUCT_ID = "prod_U8CxlV7PMpHAgA";
export const EDUCATOR_PRICE_ID = "price_1T9wXlPshPrEibTgEM0BNrSm";

interface EducatorSubState {
  subscribed: boolean;
  subscriptionEnd: string | null;
  loading: boolean;
  checkSubscription: () => Promise<void>;
}

const EducatorSubContext = createContext<EducatorSubState>({
  subscribed: false,
  subscriptionEnd: null,
  loading: true,
  checkSubscription: async () => {},
});

export function EducatorSubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setSubscribed(false);
      setSubscriptionEnd(null);
      setLoading(false);
      return;
    }

    try {
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
        setSubscriptionEnd(null);
        await supabase.auth.signOut().catch(() => {});
        return;
      }

      if (error) throw error;

      if (data?.subscribed && data?.product_id === EDUCATOR_PRODUCT_ID) {
        setSubscribed(true);
        setSubscriptionEnd(data.subscription_end ?? null);
      } else {
        setSubscribed(false);
        setSubscriptionEnd(null);
      }
    } catch (e) {
      console.error("Error checking educator subscription:", e);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  useEffect(() => {
    if (!session) return;
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [session, checkSubscription]);

  return (
    <EducatorSubContext.Provider value={{ subscribed, subscriptionEnd, loading, checkSubscription }}>
      {children}
    </EducatorSubContext.Provider>
  );
}

export function useEducatorSubscription() {
  return useContext(EducatorSubContext);
}
