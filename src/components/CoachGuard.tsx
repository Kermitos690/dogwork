import { useIsCoach } from "@/hooks/useCoach";
import { Navigate } from "react-router-dom";

export function CoachGuard({ children }: { children: React.ReactNode }) {
  const { data: isCoach, isLoading } = useIsCoach();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!isCoach) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
