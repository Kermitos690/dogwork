import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useActiveDog } from "@/hooks/useDogs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PROGRAM } from "@/data/program";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

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

  const stats = useMemo(() => {
    const progress = progressData || [];
    const logs = behaviorData || [];

    const completedDays = progress.filter((p) => p.validated).length;
    const completionRate = Math.round((completedDays / 28) * 100);

    const progressMap: Record<number, any> = {};
    progress.forEach((p) => { progressMap[p.day_id] = p; });

    const weeklyProgress = [1, 2, 3, 4].map((w) =>
      PROGRAM.filter((d) => d.week === w).filter((d) => progressMap[d.id]?.validated).length
    );

    const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;
    const avgTension = avg(logs.map((l) => l.tension_level || 0));
    const avgDogReaction = avg(logs.map((l) => l.dog_reaction_level || 0));

    const score = (field: string, good: string) => {
      const vals = logs.map((l) => (l as any)[field]).filter(Boolean);
      if (!vals.length) return 0;
      return Math.round((vals.filter((v: string) => v === good).length / vals.length) * 100);
    };

    const chartData = logs.map((log) => ({
      jour: `J${log.day_id}`,
      tension: log.tension_level,
      réactivité: log.dog_reaction_level,
    }));

    return {
      completedDays, completionRate, weeklyProgress, avgTension, avgDogReaction,
      stopScore: score("stop_response", "oui"),
      noScore: score("no_response", "oui"),
      focusScore: score("focus_quality", "bon"),
      leashScore: score("leash_walk_quality", "bonne"),
      chartData,
    };
  }, [progressData, behaviorData]);

  const StatCard = ({ label, value, unit, color }: { label: string; value: string | number; unit?: string; color?: string }) => (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${color || "text-foreground"}`}>{value}{unit}</p>
    </div>
  );

  if (!activeDog) return <AppLayout><p className="pt-12 text-center text-muted-foreground">Ajoutez d'abord un chien.</p></AppLayout>;

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-5 pt-4">
        <h1 className="text-2xl font-bold">Statistiques</h1>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Jours validés" value={stats.completedDays} unit="/28" />
          <StatCard label="Score de progression" value={stats.completionRate} unit="%" color="text-primary" />
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Progression par semaine</h3>
          <div className="space-y-2">
            {stats.weeklyProgress.map((count, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-8">S{i + 1}</span>
                <div className="flex-1 h-3 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(count / 7) * 100}%` }} />
                </div>
                <span className="text-xs font-medium w-8 text-right">{count}/7</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Score Stop" value={stats.stopScore} unit="%" />
          <StatCard label="Score Non" value={stats.noScore} unit="%" />
          <StatCard label="Score Focus" value={stats.focusScore} unit="%" />
          <StatCard label="Score Marche" value={stats.leashScore} unit="%" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Moyenne tension" value={stats.avgTension} unit="/5" color={stats.avgTension > 3 ? "text-destructive" : "text-success"} />
          <StatCard label="Moyenne réactivité" value={stats.avgDogReaction} unit="/5" color={stats.avgDogReaction > 3 ? "text-destructive" : "text-success"} />
        </div>

        {stats.chartData.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">Tension par jour</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={stats.chartData}>
                <XAxis dataKey="jour" tick={{ fontSize: 10 }} />
                <YAxis domain={[1, 5]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="tension" stroke="hsl(var(--warning))" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="réactivité" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {stats.chartData.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-muted-foreground">Pas encore de données de suivi.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
