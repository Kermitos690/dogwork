import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveDog } from "@/hooks/useDogs";
import { getAdaptiveSuggestions, type AdaptiveSignals } from "@/lib/planGenerator";

export function useAdaptiveSuggestion() {
  const activeDog = useActiveDog();

  const { data: logs } = useQuery({
    queryKey: ["adaptive_logs", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("behavior_logs")
        .select("*")
        .eq("dog_id", activeDog!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!activeDog,
  });

  const { data: progress } = useQuery({
    queryKey: ["adaptive_progress", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("day_progress")
        .select("*")
        .eq("dog_id", activeDog!.id);
      return data || [];
    },
    enabled: !!activeDog,
  });

  const { data: journalEntries } = useQuery({
    queryKey: ["adaptive_journal", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("journal_entries")
        .select("incidents")
        .eq("dog_id", activeDog!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!activeDog,
  });

  return useMemo(() => {
    if (!logs || logs.length < 3) return null;

    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const recentLogs = logs.slice(0, 7);

    const score = (field: string, goodValue: string) => {
      const vals = recentLogs.map((l: any) => l[field]).filter(Boolean);
      if (!vals.length) return 50;
      return Math.round((vals.filter((v: string) => v === goodValue).length / vals.length) * 100);
    };

    const signals: AdaptiveSignals = {
      avgTension: avg(recentLogs.map(l => l.tension_level || 0).filter(Boolean)),
      avgDogReaction: avg(recentLogs.map(l => l.dog_reaction_level || 0).filter(Boolean)),
      avgHumanReaction: avg(recentLogs.map((l: any) => l.human_reaction_level || 0).filter(Boolean)),
      stopScore: score("stop_response", "oui"),
      focusScore: score("focus_quality", "bon"),
      recoveryRate: score("recovery_after_trigger", "rapide"),
      incidentCount: (journalEntries || []).filter(e => e.incidents && e.incidents.length > 0).length,
      daysCompleted: (progress || []).filter(p => p.validated).length,
    };

    return getAdaptiveSuggestions(signals);
  }, [logs, progress, journalEntries]);
}
