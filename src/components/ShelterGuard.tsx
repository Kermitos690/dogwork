import { useIsShelter } from "@/hooks/useCoach";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

export function ShelterGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { data: isShelter, isLoading: shelterLoading } = useIsShelter();

  // Check if user is admin (admins bypass all guards)
  const { data: isAdmin, isLoading: adminLoading } = useQuery({
    queryKey: ["is_admin", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return data === true;
    },
    enabled: !!user,
  });

  if (shelterLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  // Admin bypasses shelter guard
  if (isAdmin) {
    return <>{children}</>;
  }

  if (!isShelter) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
