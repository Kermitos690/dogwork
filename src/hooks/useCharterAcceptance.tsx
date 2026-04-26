import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Coach Charter acceptance — gates marketplace publication.
 * One-time action per coach (versioned).
 */
export function useCharterAcceptance() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["charter-acceptance", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_charter_acceptances")
        .select("id, charter_version, accepted_at")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const accept = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("coach_charter_acceptances").insert({
        user_id: user!.id,
        charter_version: "2026-04-26",
        user_agent: navigator.userAgent.slice(0, 500),
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["charter-acceptance"] }),
  });

  return { hasAccepted: !!data, isLoading, accept };
}
