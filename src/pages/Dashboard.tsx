import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useActiveDog, useDogs } from "@/hooks/useDogs";
import { useAdaptiveSuggestion } from "@/hooks/useAdaptive";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dog, Play, BookOpen, BarChart3, ClipboardList, AlertTriangle, Plus, Shield, TrendingUp, TrendingDown, ChevronRight, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getDayById } from "@/data/program";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeDog = useActiveDog();
  const { data: dogs } = useDogs();
  const adaptiveSuggestion = useAdaptiveSuggestion();

  const { data: progress } = useQuery({
    queryKey: ["day_progress", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase.from("day_progress").select("*").eq("dog_id", activeDog!.id);
      return data || [];
    },
    enabled: !!activeDog,
  });

  const { data: lastLog } = useQuery({
    queryKey: ["last_behavior_log", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("behavior_logs").select("*").eq("dog_id", activeDog!.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!activeDog,
  });

  const { data: activePlan } = useQuery({
    queryKey: ["active_plan_dashboard", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("training_plans").select("id, summary, security_level, axes")
        .eq("dog_id", activeDog!.id).eq("is_active", true)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!activeDog,
  });

  // No dogs state
  if (!dogs || dogs.length === 0) {
    return (
      <AppLayout>
        <div className="pt-16 space-y-8 text-center animate-fade-in">
          <div className="mx-auto w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center">
            <Dog className="h-12 w-12 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Bienvenue sur PawPlan</h1>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">Votre compagnon d'éducation canine personnalisée</p>
          </div>
          <Button onClick={() => navigate("/dogs/new")} size="xl" className="gap-2">
            <Plus className="h-5 w-5" /> Ajouter mon chien
          </Button>
        </div>
      </AppLayout>
    );
  }

  const validated = progress?.filter(p => p.validated).length || 0;
  const inProgress = progress?.find(p => p.status === "in_progress" && !p.validated);
  const completionRate = Math.round((validated / 28) * 100);
  const currentDay = validated + 1;
  const todayData = getDayById(Math.min(currentDay, 28));
  const hasAlerts = activeDog && (activeDog.muzzle_required || activeDog.bite_history);
  const planAxes = activePlan?.axes as any[] | null;

  // Determine resume target
  const resumeDay = inProgress ? inProgress.day_id : Math.min(currentDay, 28);
  const hasPlan = !!activePlan;

  return (
    <AppLayout>
      <div className="pt-6 pb-4 space-y-4 animate-fade-in">
        {/* Header with dog selector */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Bonjour 👋</p>
            <h1 className="text-2xl font-bold text-foreground">Accueil</h1>
          </div>
          {activeDog && (
            <button onClick={() => navigate("/dogs")} className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-card border border-border active:scale-95 transition-all">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Dog className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">{activeDog.name}</span>
            </button>
          )}
        </div>

        {/* Security alerts */}
        {hasAlerts && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 flex items-start gap-3 animate-fade-in">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm space-y-0.5">
              <p className="font-semibold text-destructive">Alerte sécurité</p>
              {activeDog!.muzzle_required && <p className="text-muted-foreground text-xs">Muselière obligatoire en extérieur</p>}
              {activeDog!.bite_history && <p className="text-muted-foreground text-xs">Antécédent de morsure — Aucun contact direct</p>}
            </div>
          </div>
        )}

        {/* Adaptive suggestion */}
        {adaptiveSuggestion && (
          <div className={`rounded-2xl border p-4 flex items-start gap-3 animate-fade-in ${
            adaptiveSuggestion.type === "warning" ? "border-warning/20 bg-warning/5" :
            adaptiveSuggestion.type === "success" ? "border-success/20 bg-success/5" :
            "border-border bg-card"
          }`}>
            {adaptiveSuggestion.type === "warning" ? <TrendingDown className="h-5 w-5 text-warning shrink-0" /> :
             adaptiveSuggestion.type === "success" ? <TrendingUp className="h-5 w-5 text-success shrink-0" /> :
             <Sparkles className="h-5 w-5 text-muted-foreground shrink-0" />}
            <p className="text-sm text-foreground">{adaptiveSuggestion.message}</p>
          </div>
        )}

        {/* Big Today Card */}
        <Card className="overflow-hidden border-primary/10 card-press" onClick={() => todayData && navigate(hasPlan ? `/day/${resumeDay}?source=plan` : `/day/${resumeDay}`)}>
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    {inProgress ? "Reprendre" : "Aujourd'hui"}
                  </p>
                  <h2 className="text-xl font-bold text-foreground">Jour {resumeDay}</h2>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
                  <Play className="h-7 w-7 text-primary-foreground ml-0.5" />
                </div>
              </div>
              {todayData && (
                <p className="text-sm text-muted-foreground line-clamp-1">{todayData.title}</p>
              )}
              {inProgress && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>En cours</span>
                    <span>{inProgress.completed_exercises?.length || 0} exercice(s) fait(s)</span>
                  </div>
                  <Progress value={((inProgress.completed_exercises?.length || 0) / 3) * 100} className="h-1.5" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Progress strip */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-card border border-border p-3 text-center">
            <p className="text-2xl font-bold text-primary tabular-nums">{validated}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Jours validés</p>
          </div>
          <div className="rounded-2xl bg-card border border-border p-3 text-center">
            <p className="text-2xl font-bold text-foreground tabular-nums">{completionRate}%</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Progression</p>
          </div>
          <div className="rounded-2xl bg-card border border-border p-3 text-center">
            <p className="text-2xl font-bold tabular-nums" style={{ color: lastLog?.tension_level && lastLog.tension_level > 3 ? "hsl(var(--destructive))" : "hsl(var(--success))" }}>
              {lastLog?.tension_level || "–"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Tension</p>
          </div>
        </div>

        {/* Active plan summary */}
        {activePlan && (
          <Card className="card-press" onClick={() => navigate("/plan")}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Plan personnalisé</p>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{activePlan.summary}</p>
                  {planAxes && planAxes.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {planAxes.slice(0, 3).map((a: any, i: number) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{a.label}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick actions grid */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => navigate("/plan")} className="flex items-center gap-3 rounded-2xl bg-card border border-border p-4 text-left active:scale-[0.98] transition-all">
            <BookOpen className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Plan</p>
              <p className="text-[10px] text-muted-foreground">Voir le programme</p>
            </div>
          </button>
          <button onClick={() => navigate("/journal")} className="flex items-center gap-3 rounded-2xl bg-card border border-border p-4 text-left active:scale-[0.98] transition-all">
            <ClipboardList className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Journal</p>
              <p className="text-[10px] text-muted-foreground">Historique</p>
            </div>
          </button>
          <button onClick={() => navigate("/stats")} className="flex items-center gap-3 rounded-2xl bg-card border border-border p-4 text-left active:scale-[0.98] transition-all">
            <BarChart3 className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Stats</p>
              <p className="text-[10px] text-muted-foreground">Progression</p>
            </div>
          </button>
          <button onClick={() => navigate("/safety")} className="flex items-center gap-3 rounded-2xl bg-card border border-border p-4 text-left active:scale-[0.98] transition-all">
            <AlertTriangle className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Sécurité</p>
              <p className="text-[10px] text-muted-foreground">Méthode</p>
            </div>
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
