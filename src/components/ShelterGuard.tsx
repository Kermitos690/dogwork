import { useIsShelter } from "@/hooks/useCoach";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";
import { SHELTER_PRODUCT_ID } from "@/lib/plans";

export function ShelterGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const { data: isShelter, isLoading: shelterLoading } = useIsShelter();

  // Check if user is admin
  const { data: isAdmin, isLoading: adminLoading } = useQuery({
    queryKey: ["is_admin", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return data === true;
    },
    enabled: !!user,
  });

  // Check shelter subscription status
  const { data: shelterSub, isLoading: subLoading } = useQuery({
    queryKey: ["shelter-subscription-guard", user?.id],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { subscribed: false };
      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) return { subscribed: false };
      return {
        subscribed: data?.subscribed === true && data?.product_id === SHELTER_PRODUCT_ID,
      };
    },
    enabled: !!user && isShelter === true,
    staleTime: 5 * 60_000,
  });

  if (shelterLoading || adminLoading || (isShelter && subLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  // Admin bypasses shelter guard
  if (isAdmin) return <>{children}</>;

  if (!isShelter) return <Navigate to="/" replace />;

  // Allow access to subscription page without active subscription
  if (location.pathname === "/shelter/subscription") {
    return <>{children}</>;
  }

  // Block all other shelter pages if subscription is not active
  if (!shelterSub?.subscribed) {
    return <Navigate to="/shelter/subscription" replace />;
  }

  return <>{children}</>;
}
