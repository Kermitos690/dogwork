import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useActiveDog } from "@/hooks/useDogs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PROGRAM } from "@/data/program";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, CartesianGrid } from "recharts";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus as MinusIcon } from "lucide-react";

export default function Stats() {
  const navigate = useNavigate();
  const activeDog = useActiveDog();

  const { data: progressData } = useQuery({
    queryKey: ["stats_progress", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase.from("day_progress").select("*").eq("dog_id", activeDog!.id);
      return data || [];
    },
    enabled: !!activeDog,
  });

  const { data: behaviorData } = useQuery({
    queryKey: ["stats_behavior", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase.from("behavior_logs").select("*").eq("dog_id", activeDog!.id).order("day_id");
      return data || [];
    },
    enabled: !!activeDog,
  });

  const { data: sessionsData } = useQuery({
    queryKey: ["stats_sessions", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase.from("exercise_sessions").select("*").eq("dog_id", activeDog!.id);
      return data || [];
    },
    enabled: !!activeDog,
  });

  const stats = useMemo(() => {
    const progress = progressData || [];
    const logs = behaviorData || [];
    const sessions = sessionsData || [];

    const completedDays = progress.filter((p) => p.validated).length;
    const completionRate = Math.round((completedDays / 28) * 100);
    const totalSessions = sessions.length;

    const weeklyProgress = [1, 2, 3, 4].map((w) =>
      PROGRAM.filter((d) => d.week === w).filter((d) => progress.some(p => p.day_id === d.id && p.validated)).length
    );

    const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;
    const avgTension = avg(logs.map((l) => l.tension_level || 0).filter(Boolean));
    const avgDogReaction = avg(logs.map((l) => l.dog_reaction_level || 0).filter(Boolean));

    // Human reactivity (using dog_reaction_level as proxy since no separate human column)
    const avgHumanReaction = avg(logs.map((l) => l.dog_reaction_level || 0).filter(Boolean));

    const score = (field: string, good: string) => {
      const vals = logs.map((l) => (l as any)[field]).filter(Boolean);
      if (!vals.length) return 0;
      return Math.round((vals.filter((v: string) => v === good).length / vals.length) * 100);
    };

    const stopScore = score("stop_response", "oui");
    const noScore = score("no_response", "oui");
    const focusScore = score("focus_quality", "bon");
    const leashScore = score("leash_walk_quality", "bonne");

    // Tension chart
    const tensionChart = logs.map((log) => ({
      jour: `J${log.day_id}`,
      tension: log.tension_level,
      réactivité: log.dog_reaction_level,
    }));

    // Weekly bar chart
    const weeklyBarData = [1, 2, 3, 4].map((w) => ({
      semaine: `S${w}`,
      validés: weeklyProgress[w - 1],
      total: 7,
    }));

    // Best and hardest days
    const hardestDays = [...logs].sort((a, b) => (b.tension_level || 0) - (a.tension_level || 0)).slice(0, 3).map(l => l.day_id);
    const bestDays = [...logs].sort((a, b) => (a.tension_level || 0) - (b.tension_level || 0)).slice(0, 3).map(l => l.day_id);

    // Trend
    const recentLogs = logs.slice(-5);
    const olderLogs = logs.slice(0, Math.max(logs.length - 5, 0));
    const recentAvg = avg(recentLogs.map(l => l.tension_level || 0));
    const olderAvg = avg(olderLogs.map(l => l.tension_level || 0));
    const trend = olderLogs.length > 0 ? (recentAvg < olderAvg ? "down" : recentAvg > olderAvg ? "up" : "stable") : "stable";

    return {
      completedDays, completionRate, totalSessions,
      weeklyProgress, weeklyBarData,
      avgTension, avgDogReaction, avgHumanReaction,
      stopScore, noScore, focusScore, leashScore,
      tensionChart, hardestDays, bestDays, trend,
    };
  }, [progressData, behaviorData, sessionsData]);

  const StatCard = ({ label, value, unit, color, size = "default" }: { label: string; value: string | number; unit?: string; color?: string; size?: string }) => (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`${size === "large" ? "text-3xl" : "text-2xl"} font-bold ${color || "text-foreground"}`}>{value}{unit}</p>
    </div>
  );

  const ScoreBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{value}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );

  if (!activeDog) return <AppLayout><p className="pt-12 text-center text-muted-foreground">Ajoutez d'abord un chien.</p></AppLayout>;

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-5 pt-4 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Statistiques</h1>
          <p className="text-sm text-muted-foreground">{activeDog.name} — Vue d'ensemble</p>
        </div>

        {/* Main stats */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Jours validés" value={stats.completedDays} unit="/28" />
          <StatCard label="Séances" value={stats.totalSessions} />
          <StatCard label="Progression" value={stats.completionRate} unit="%" color="text-primary" />
        </div>

        {/* Trend */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            {stats.trend === "down" ? (
              <><TrendingDown className="h-5 w-5 text-success" /><p className="text-sm text-foreground">La tension diminue 📉 Bonne progression !</p></>
            ) : stats.trend === "up" ? (
              <><TrendingUp className="h-5 w-5 text-destructive" /><p className="text-sm text-foreground">La tension augmente 📈 Ajustez la difficulté.</p></>
            ) : (
              <><MinusIcon className="h-5 w-5 text-muted-foreground" /><p className="text-sm text-foreground">Tendance stable. Continuez le travail.</p></>
            )}
          </CardContent>
        </Card>

        {/* Scores */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Scores comportementaux</p>
          <ScoreBar label="Score Stop" value={stats.stopScore} color="bg-primary" />
          <ScoreBar label="Score Non" value={stats.noScore} color="bg-primary" />
          <ScoreBar label="Score Focus" value={stats.focusScore} color="bg-success" />
          <ScoreBar label="Score Marche" value={stats.leashScore} color="bg-success" />
        </div>

        {/* Averages */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Moyenne tension" value={stats.avgTension} unit="/5" color={stats.avgTension > 3 ? "text-destructive" : "text-success"} />
          <StatCard label="Moyenne réactivité" value={stats.avgDogReaction} unit="/5" color={stats.avgDogReaction > 3 ? "text-destructive" : "text-success"} />
        </div>

        {/* Weekly progress */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Progression par semaine</h3>
          {stats.weeklyBarData.length > 0 && (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={stats.weeklyBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="semaine" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 7]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="validés" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tension chart */}
        {stats.tensionChart.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Évolution tension & réactivité</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={stats.tensionChart}>
                <XAxis dataKey="jour" tick={{ fontSize: 10 }} />
                <YAxis domain={[1, 5]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="tension" stroke="hsl(var(--warning))" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="réactivité" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 justify-center mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-warning inline-block" /> Tension</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-destructive inline-block" /> Réactivité</span>
            </div>
          </div>
        )}

        {/* Best and hardest */}
        <div className="grid grid-cols-2 gap-3">
          {stats.bestDays.length > 0 && (
            <div className="rounded-xl border border-success/20 bg-success/5 p-3">
              <p className="text-xs font-semibold text-success mb-1">Meilleurs jours</p>
              <div className="flex gap-1 flex-wrap">
                {stats.bestDays.map(d => (
                  <Badge key={d} variant="secondary" className="text-xs">J{d}</Badge>
                ))}
              </div>
            </div>
          )}
          {stats.hardestDays.length > 0 && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
              <p className="text-xs font-semibold text-destructive mb-1">Jours difficiles</p>
              <div className="flex gap-1 flex-wrap">
                {stats.hardestDays.map(d => (
                  <Badge key={d} variant="secondary" className="text-xs">J{d}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {stats.tensionChart.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-muted-foreground text-sm">Pas encore de données de suivi.</p>
            <p className="text-xs text-muted-foreground mt-1">Remplissez le suivi comportemental après chaque séance.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
