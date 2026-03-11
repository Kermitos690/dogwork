import { useIsCoach } from "@/hooks/useCoach";
import { useEducatorSubscription } from "@/hooks/useEducatorSubscription";
import { Navigate, useLocation } from "react-router-dom";

export function CoachGuard({ children }: { children: React.ReactNode }) {
  const { data: isCoach, isLoading: roleLoading } = useIsCoach();
  const { subscribed, loading: subLoading } = useEducatorSubscription();
  const location = useLocation();

  if (roleLoading || subLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
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
