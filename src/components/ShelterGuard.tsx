import { useIsShelter } from "@/hooks/useCoach";
import { Navigate } from "react-router-dom";

export function ShelterGuard({ children }: { children: React.ReactNode }) {
  const { data: isShelter, isLoading } = useIsShelter();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!isShelter) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
