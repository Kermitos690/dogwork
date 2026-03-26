import { useIsShelterEmployee } from "@/hooks/useCoach";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

export function EmployeeGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { data: isEmployee, isLoading: empLoading } = useIsShelterEmployee();

  const { data: isAdmin, isLoading: adminLoading } = useQuery({
    queryKey: ["is_admin", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return data === true;
    },
    enabled: !!user,
  });

  if (empLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (isAdmin) return <>{children}</>;
  if (!isEmployee) return <Navigate to="/" replace />;

  return <>{children}</>;
}
