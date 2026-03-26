import { useIsCoach } from "@/hooks/useCoach";
import { useEducatorSubscription } from "@/hooks/useEducatorSubscription";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";

export function CoachGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { data: isCoach, isLoading: roleLoading } = useIsCoach();
  const { subscribed, loading: subLoading } = useEducatorSubscription();
  const location = useLocation();

  // Check if user is admin (admins bypass all guards)
  const { data: isAdmin, isLoading: adminLoading } = useQuery({
    queryKey: ["is_admin", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return data === true;
    },
    enabled: !!user,
  });

  if (roleLoading || subLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  // Admin bypasses everything
  if (isAdmin) {
    return <>{children}</>;
  }

  if (!isCoach) {
    return <Navigate to="/" replace />;
  }

  // Allow access to subscription page even without active subscription
  if (location.pathname === "/coach/subscription") {
    return <>{children}</>;
  }

  // Block all other coach pages if subscription is not active
  if (!subscribed) {
    return <Navigate to="/coach/subscription" replace />;
  }

  return <>{children}</>;
}
