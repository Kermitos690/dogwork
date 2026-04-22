import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveDog } from "@/hooks/useDogs";
import { subDays, parseISO, isAfter, format } from "date-fns";
import { zoneFromTension, type Zone } from "@/lib/zones";

export interface ZoneDistribution {
  green: number;
  orange: number;
  red: number;
  total: number;
  greenPct: number;
  orangePct: number;
  redPct: number;
}

export interface ZoneTrendPoint {
  date: string;          // ISO date (yyyy-MM-dd)
  green: number;
  orange: number;
  red: number;
}

export interface StatsSummary {
  completedDays: number;
  totalSessions: number;
  completionRate: number;
  avgTension: number;
  avgDogReaction: number;
  avgHumanReaction: number;
  stopScore: number;
  noScore: number;
  focusScore: number;
  leashScore: number;
  avgComfortDistance: number;
  avgRecovery: string;
  incidentRate: number;
  tensionTrend: "improving" | "worsening" | "stable";
  reactionTrend: "improving" | "worsening" | "stable";
  distanceTrend: "improving" | "worsening" | "stable";
  streakDays: number;
  tensionChart: { jour: string; tension: number | null; chiens: number | null; humains: number | null; date: string }[];
  distanceChart: { jour: string; distance: number | null; date: string }[];
  weeklyData: { semaine: string; validés: number; total: number }[];
  recommendations: Recommendation[];
  planScore: PlanScore;
  recentHighlights: Highlight[];
  // ─── Nouveaux KPI tendances ───
  dayStatusBreakdown: { green: number; orange: number; red: number; pending: number; greenPct: number; orangePct: number; redPct: number };
  totalTrainingSeconds: number;
  avgSessionSeconds: number;
  completedSessionsCount: number;
  exerciseProgress: { exercise_id: string; total: number; completed: number; rate: number; totalSeconds: number }[];
  // ─── Nouveau : zones comportementales réelles ───
  /** Zone distribution from behavior_logs.zone_state (fallback: derived from tension_level). */
  behaviorZoneDistribution: ZoneDistribution;
  /** Zone distribution from exercise_sessions.zone_state. */
  sessionZoneDistribution: ZoneDistribution;
  /** Combined distribution across both sources — primary indicator. */
  combinedZoneDistribution: ZoneDistribution;
  /** Day-by-day zone counts over the period (for trend line/area chart). */
  zoneTrend: ZoneTrendPoint[];
  /** Dominant zone over the most recent 7 days, or null if no data. */
  recentDominantZone: Zone | null;
  /** Share of zone observations that came from explicit zone_state vs derived fallback. */
  zoneDataQuality: { explicit: number; derived: number; total: number; explicitPct: number };
}



export interface Recommendation {
  type: "success" | "warning" | "info" | "danger";
  title: string;
  description: string;
  icon: string;
}

export interface PlanScore {
  label: string;
  level: "excellent" | "good" | "warning" | "danger";
  score: number;
  description: string;
}

export interface Highlight {
  type: "improvement" | "milestone" | "alert";
  text: string;
}

const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;

const qualityScore = (values: (string | null)[], goodValue: string) => {
  const valid = values.filter(Boolean) as string[];
  if (!valid.length) return 0;
  return Math.round((valid.filter(v => v === goodValue).length / valid.length) * 100);
};

const getTrend = (recent: number[], older: number[]): "improving" | "worsening" | "stable" => {
  if (!recent.length || !older.length) return "stable";
  const recentAvg = avg(recent);
  const olderAvg = avg(older);
  const diff = olderAvg - recentAvg;
  if (Math.abs(diff) < 0.3) return "stable";
  return diff > 0 ? "improving" : "worsening";
};

const getDistanceTrend = (recent: number[], older: number[]): "improving" | "worsening" | "stable" => {
  if (!recent.length || !older.length) return "stable";
  const recentAvg = avg(recent);
  const olderAvg = avg(older);
  const diff = recentAvg - olderAvg;
  if (Math.abs(diff) < 2) return "stable";
  return diff < 0 ? "improving" : "worsening";
};

export function useStats(period: "7" | "14" | "30" | "all" = "all", loadAdvanced = true) {
  const activeDog = useActiveDog();

  const { data: progressData } = useQuery({
    queryKey: ["stats_progress", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase.from("day_progress")
        .select("day_id, status, validated, completed_exercises")
        .eq("dog_id", activeDog!.id);
      return data || [];
    },
    enabled: !!activeDog,
  });

  // Only load behavior logs for advanced stats (Pro+)
  const { data: behaviorData } = useQuery({
    queryKey: ["stats_behavior", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase.from("behavior_logs")
        .select("day_id, tension_level, dog_reaction_level, human_reaction_level, comfort_distance_meters, stop_response, no_response, focus_quality, leash_walk_quality, recovery_after_trigger, jump_on_human, barking, created_at, zone_state")
        .eq("dog_id", activeDog!.id)
        .order("created_at");
      return data || [];
    },
    enabled: !!activeDog && loadAdvanced,
  });

  const { data: sessionsData } = useQuery({
    queryKey: ["stats_sessions", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase.from("exercise_sessions")
        .select("id, exercise_id, completed, duration_actual, day_id, zone_state, created_at")
        .eq("dog_id", activeDog!.id);
      return data || [];
    },
    enabled: !!activeDog,
  });

  // Only load journal for advanced stats (Pro+)
  const { data: journalData } = useQuery({
    queryKey: ["stats_journal", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase.from("journal_entries")
        .select("tension_level, success_level, created_at")
        .eq("dog_id", activeDog!.id)
        .order("created_at");
      return data || [];
    },
    enabled: !!activeDog && loadAdvanced,
  });

  return useMemo((): StatsSummary | null => {
    if (!activeDog) return null;
    const progress = progressData || [];
    const logs = behaviorData || [];
    const sessions = sessionsData || [];
    const journal = journalData || [];

    // Period filter
    const cutoff = period !== "all" ? subDays(new Date(), parseInt(period)) : null;
    const filteredLogs = cutoff ? logs.filter(l => isAfter(parseISO(l.created_at), cutoff)) : logs;

    const completedDays = progress.filter(p => p.validated).length;
    const totalDays = progress.length || 1;
    const completionRate = Math.round((completedDays / Math.max(totalDays, 1)) * 100);
    const totalSessions = sessions.length;

    // ─── Répartition vert/orange/rouge des journées ───
    // Convention : validated=true → green, status="in_progress" → orange, status="todo" mais entrée présente → red (manquée), absence d'entrée → pending
    const greenDays = progress.filter(p => p.validated || p.status === "done").length;
    const orangeDays = progress.filter(p => !p.validated && p.status === "in_progress").length;
    const redDays = progress.filter(p => !p.validated && p.status === "todo" && Array.isArray(p.completed_exercises) && p.completed_exercises.length > 0).length;
    const pendingDays = Math.max(0, progress.length - greenDays - orangeDays - redDays);
    const totalTracked = greenDays + orangeDays + redDays || 1;
    const dayStatusBreakdown = {
      green: greenDays,
      orange: orangeDays,
      red: redDays,
      pending: pendingDays,
      greenPct: Math.round((greenDays / totalTracked) * 100),
      orangePct: Math.round((orangeDays / totalTracked) * 100),
      redPct: Math.round((redDays / totalTracked) * 100),
    };

    // ─── Durée au chronomètre ───
    const durations = sessions.map(s => s.duration_actual || 0).filter(d => d > 0);
    const totalTrainingSeconds = durations.reduce((a, b) => a + b, 0);
    const completedSessionsCount = sessions.filter(s => s.completed).length;
    const avgSessionSeconds = durations.length ? Math.round(totalTrainingSeconds / durations.length) : 0;

    // ─── Progression par exercice ───
    const byExercise = new Map<string, { total: number; completed: number; totalSeconds: number }>();
    for (const s of sessions) {
      if (!s.exercise_id) continue;
      const cur = byExercise.get(s.exercise_id) || { total: 0, completed: 0, totalSeconds: 0 };
      cur.total += 1;
      if (s.completed) cur.completed += 1;
      cur.totalSeconds += s.duration_actual || 0;
      byExercise.set(s.exercise_id, cur);
    }
    const exerciseProgress = Array.from(byExercise.entries())
      .map(([exercise_id, v]) => ({
        exercise_id,
        total: v.total,
        completed: v.completed,
        totalSeconds: v.totalSeconds,
        rate: v.total ? Math.round((v.completed / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // Averages
    const tensions = filteredLogs.map(l => l.tension_level).filter((v): v is number => v != null && v > 0);
    const dogReactions = filteredLogs.map(l => l.dog_reaction_level).filter((v): v is number => v != null && v > 0);
    const humanReactions = filteredLogs.map(l => l.human_reaction_level).filter((v): v is number => v != null && v > 0);
    const distances = filteredLogs.map(l => l.comfort_distance_meters).filter((v): v is number => v != null);

    const avgTension = avg(tensions);
    const avgDogReaction = avg(dogReactions);
    const avgHumanReaction = avg(humanReactions);
    const avgComfortDistance = avg(distances);

    // Scores
    const stopScore = qualityScore(filteredLogs.map(l => l.stop_response), "oui");
    const noScore = qualityScore(filteredLogs.map(l => l.no_response), "oui");
    const focusScore = qualityScore(filteredLogs.map(l => l.focus_quality), "bon");
    const leashScore = qualityScore(filteredLogs.map(l => l.leash_walk_quality), "bonne");

    // Recovery
    const recoveries = filteredLogs.map(l => l.recovery_after_trigger).filter(Boolean) as string[];
    const avgRecovery = recoveries.length === 0 ? "–"
      : recoveries.filter(r => r === "rapide").length > recoveries.length / 2 ? "rapide"
      : recoveries.filter(r => r === "lente").length > recoveries.length / 2 ? "lente"
      : "moyenne";

    // Incidents
    const incidentCount = filteredLogs.filter(l => l.jump_on_human || l.barking).length;
    const incidentRate = filteredLogs.length ? Math.round((incidentCount / filteredLogs.length) * 100) : 0;

    // Trends (split in half)
    const mid = Math.floor(filteredLogs.length / 2);
    const olderHalf = filteredLogs.slice(0, mid);
    const recentHalf = filteredLogs.slice(mid);

    const tensionTrend = getTrend(
      recentHalf.map(l => l.tension_level || 0).filter(Boolean),
      olderHalf.map(l => l.tension_level || 0).filter(Boolean)
    );
    const reactionTrend = getTrend(
      recentHalf.map(l => l.dog_reaction_level || 0).filter(Boolean),
      olderHalf.map(l => l.dog_reaction_level || 0).filter(Boolean)
    );
    const distanceTrend = getDistanceTrend(
      recentHalf.map(l => Number(l.comfort_distance_meters) || 0).filter(Boolean),
      olderHalf.map(l => Number(l.comfort_distance_meters) || 0).filter(Boolean)
    );

    // Streak
    let streakDays = 0;
    const sortedProgress = [...progress].sort((a, b) => b.day_id - a.day_id);
    for (const p of sortedProgress) {
      if (p.validated) streakDays++;
      else break;
    }

    // Charts
    const tensionChart = filteredLogs.map(log => ({
      jour: `J${log.day_id}`,
      tension: log.tension_level,
      chiens: log.dog_reaction_level,
      humains: log.human_reaction_level,
      date: log.created_at,
    }));

    const distanceChart = filteredLogs.map(log => ({
      jour: `J${log.day_id}`,
      distance: log.comfort_distance_meters ? Number(log.comfort_distance_meters) : null,
      date: log.created_at,
    }));

    // Weekly data
    const maxWeek = Math.ceil(Math.max(...progress.map(p => p.day_id), 7) / 7);
    const weeklyData = Array.from({ length: Math.min(maxWeek, 8) }, (_, i) => {
      const week = i + 1;
      const weekDays = progress.filter(p => Math.ceil(p.day_id / 7) === week);
      return {
        semaine: `S${week}`,
        validés: weekDays.filter(p => p.validated).length,
        total: 7,
      };
    });

    // Recommendations
    const recommendations: Recommendation[] = [];

    if (tensionTrend === "improving") {
      recommendations.push({ type: "success", title: "Tension en baisse", description: "La tension moyenne diminue. Bonne progression, continuez ainsi.", icon: "📉" });
    } else if (tensionTrend === "worsening") {
      recommendations.push({ type: "warning", title: "Tension en hausse", description: "La tension augmente. Envisagez de réduire la difficulté ou d'augmenter les pauses.", icon: "📈" });
    }

    if (avgDogReaction > 3.5) {
      recommendations.push({ type: "danger", title: "Réactivité chiens élevée", description: "Restez à grande distance et privilégiez les exercices de désensibilisation douce.", icon: "🐕" });
    }

    if (focusScore > 70) {
      recommendations.push({ type: "success", title: "Focus excellent", description: "Le focus progresse bien. Vous pouvez introduire des exercices légèrement plus complexes.", icon: "🎯" });
    } else if (focusScore < 30 && filteredLogs.length > 3) {
      recommendations.push({ type: "warning", title: "Focus à renforcer", description: "Renforcez les exercices de focus et attention avant de progresser.", icon: "👁️" });
    }

    if (avgRecovery === "lente") {
      recommendations.push({ type: "warning", title: "Récupération lente", description: "La récupération reste difficile. Allégez les séances et prolongez les temps de pause.", icon: "⏳" });
    }

    if (streakDays >= 5) {
      recommendations.push({ type: "success", title: "Belle régularité", description: `${streakDays} jours consécutifs validés. La constance est la clé du progrès.`, icon: "🔥" });
    }

    if (incidentRate > 50) {
      recommendations.push({ type: "danger", title: "Incidents fréquents", description: "Plus de la moitié des séances contiennent des incidents. Simplifiez le contexte d'entraînement.", icon: "⚠️" });
    }

    if (distanceTrend === "improving" && avgComfortDistance < 15) {
      recommendations.push({ type: "info", title: "Distance en réduction", description: "La distance de confort diminue progressivement. Progression positive sur la désensibilisation.", icon: "📏" });
    }

    // Plan score
    let planScoreValue = 70;
    if (tensionTrend === "improving") planScoreValue += 10;
    if (tensionTrend === "worsening") planScoreValue -= 15;
    if (avgTension > 4) planScoreValue -= 10;
    if (avgTension < 2.5) planScoreValue += 10;
    if (focusScore > 60) planScoreValue += 5;
    if (incidentRate > 40) planScoreValue -= 10;
    if (avgRecovery === "rapide") planScoreValue += 5;
    if (avgRecovery === "lente") planScoreValue -= 10;
    if (completionRate > 60) planScoreValue += 5;
    planScoreValue = Math.max(0, Math.min(100, planScoreValue));

    const planScore: PlanScore = planScoreValue >= 80
      ? { label: "Plan bien calibré", level: "excellent", score: planScoreValue, description: "Le plan est adapté au profil et les progrès sont visibles." }
      : planScoreValue >= 60
      ? { label: "Progression stable", level: "good", score: planScoreValue, description: "Le plan fonctionne, quelques ajustements mineurs possibles." }
      : planScoreValue >= 40
      ? { label: "Plan à surveiller", level: "warning", score: planScoreValue, description: "Des signes de difficulté émergent. Envisagez de simplifier." }
      : { label: "Simplification recommandée", level: "danger", score: planScoreValue, description: "Le plan semble trop ambitieux. Réduisez la difficulté." };

    // Highlights
    const recentHighlights: Highlight[] = [];
    if (completedDays > 0 && completedDays % 7 === 0) {
      recentHighlights.push({ type: "milestone", text: `${completedDays} jours complétés !` });
    }
    if (tensionTrend === "improving" && filteredLogs.length >= 5) {
      recentHighlights.push({ type: "improvement", text: "La tension diminue sur la période récente." });
    }
    if (streakDays >= 3) {
      recentHighlights.push({ type: "milestone", text: `Série de ${streakDays} jours consécutifs !` });
    }
    if (focusScore >= 80) {
      recentHighlights.push({ type: "improvement", text: "Focus excellent maintenu." });
    }
    if (avgTension > 4 && filteredLogs.length > 3) {
      recentHighlights.push({ type: "alert", text: "Tension élevée persistante. Vigilance renforcée." });
    }

    return {
      completedDays, totalSessions, completionRate,
      avgTension, avgDogReaction, avgHumanReaction,
      stopScore, noScore, focusScore, leashScore,
      avgComfortDistance, avgRecovery, incidentRate,
      tensionTrend, reactionTrend, distanceTrend,
      streakDays, tensionChart, distanceChart, weeklyData,
      recommendations, planScore, recentHighlights,
      dayStatusBreakdown, totalTrainingSeconds, avgSessionSeconds, completedSessionsCount,
      exerciseProgress,
    };
  }, [activeDog, progressData, behaviorData, sessionsData, journalData, period]);
}
