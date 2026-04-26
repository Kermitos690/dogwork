import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Coach "Vérifié charte" status:
 * - charte acceptée
 * - aucun scan marketplace bloqué (status = 'blocked') sur les 90 derniers jours
 */
export function useCoachVerified(coachUserId?: string | null) {
  return useQuery({
    queryKey: ["coach-verified", coachUserId],
    enabled: !!coachUserId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!coachUserId) return { verified: false, reason: "no_user" as const };

      const { data: charter } = await supabase
        .from("coach_charter_acceptances")
        .select("accepted_at")
        .eq("user_id", coachUserId)
        .maybeSingle();

      if (!charter) return { verified: false, reason: "charter_missing" as const };

      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("marketplace_content_scans")
        .select("id", { count: "exact", head: true })
        .eq("educator_user_id", coachUserId)
        .eq("status", "blocked")
        .gte("created_at", since);

      if ((count ?? 0) > 0) return { verified: false, reason: "compliance_blocked" as const };
      return { verified: true, reason: "ok" as const, acceptedAt: charter.accepted_at };
    },
  });
}
