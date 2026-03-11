import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Layout } from "@/components/Layout";
import { getAllProgress, getAllBehavior } from "@/lib/storage";
import { PROGRAM } from "@/data/program";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

export default function Stats() {
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const progress = getAllProgress();
    const behavior = getAllBehavior();

    const completedDays = Object.values(progress).filter((p) => p.validated).length;
    const completionRate = Math.round((completedDays / 28) * 100);

    const weeklyProgress = [1, 2, 3, 4].map((w) =>
      PROGRAM.filter((d) => d.week === w).filter((d) => progress[d.id]?.validated).length
    );

    const logs = Object.values(behavior);
    const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;

    const avgTension = avg(logs.map((l) => l.tensionLevel));
    const avgDogReaction = avg(logs.map((l) => l.dogReactionLevel));

    const score = (field: keyof typeof logs[0], good: string) => {
      const vals = logs.map((l) => l[field]).filter(Boolean);
      if (!vals.length) return 0;
      return Math.round((vals.filter((v) => v === good).length / vals.length) * 100);
    };

    const stopScore = score("stopResponse", "oui");
    const noScore = score("noResponse", "oui");
    const focusScore = score("focusQuality", "bon");
    const leashScore = score("leashWalkQuality", "bonne");

    // Charts data
    const chartData = Object.entries(behavior)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([dayId, log]) => ({
        jour: `J${dayId}`,
        tension: log.tensionLevel,
        réactivité: log.dogReactionLevel,
      }));

    // Best/hardest days
    const hardestDays = logs.sort((a, b) => b.tensionLevel - a.tensionLevel).slice(0, 3).map((l) => l.dayId);
    const bestDays = logs.sort((a, b) => a.tensionLevel - b.tensionLevel).slice(0, 3).map((l) => l.dayId);

    return { completedDays, completionRate, weeklyProgress, avgTension, avgDogReaction, stopScore, noScore, focusScore, leashScore, chartData, hardestDays, bestDays };
  }, []);

  const StatCard = ({ label, value, unit, color }: { label: string; value: string | number; unit?: string; color?: string }) => (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${color || "text-foreground"}`}>{value}{unit}</p>
    </div>
  );

  return (
    <Layout>
      <div className="animate-fade-in space-y-5 pt-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>

        <h1 className="text-2xl font-bold">Statistiques</h1>

        {/* Overview */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Jours validés" value={stats.completedDays} unit="/28" />
          <StatCard label="Score de progression" value={stats.completionRate} unit="%" color="text-primary" />
        </div>

        {/* Weekly */}
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

        {/* Scores */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Score Stop" value={stats.stopScore} unit="%" />
          <StatCard label="Score Non" value={stats.noScore} unit="%" />
          <StatCard label="Score Focus" value={stats.focusScore} unit="%" />
          <StatCard label="Score Marche" value={stats.leashScore} unit="%" />
        </div>

        {/* Averages */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Tension moyenne" value={stats.avgTension} unit="/5" color={stats.avgTension > 3 ? "text-destructive" : "text-success"} />
          <StatCard label="Réactivité moy." value={stats.avgDogReaction} unit="/5" color={stats.avgDogReaction > 3 ? "text-destructive" : "text-success"} />
        </div>

        {/* Tension chart */}
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
            <div className="mt-2 flex gap-4 justify-center text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" />Tension</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" />Réactivité</span>
            </div>
          </div>
        )}

        {/* Best/Hardest */}
        {stats.hardestDays.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Jours les plus difficiles</p>
              <div className="flex gap-1 flex-wrap">
                {stats.hardestDays.map((d) => (
                  <span key={d} className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">J{d}</span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Meilleurs jours</p>
              <div className="flex gap-1 flex-wrap">
                {stats.bestDays.map((d) => (
                  <span key={d} className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">J{d}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {stats.chartData.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-muted-foreground">Pas encore de données de suivi.</p>
            <p className="text-sm text-muted-foreground mt-1">Remplissez le suivi comportemental pour voir vos statistiques ici.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
