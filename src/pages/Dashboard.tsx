import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useActiveDog, useDogs } from "@/hooks/useDogs";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dog, Play, BookOpen, BarChart3, ClipboardList, AlertTriangle, Plus, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getDayById } from "@/data/program";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeDog = useActiveDog();
  const { data: dogs } = useDogs();

  const { data: progress } = useQuery({
    queryKey: ["day_progress", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("day_progress")
        .select("*")
        .eq("dog_id", activeDog!.id);
      return data || [];
    },
    enabled: !!activeDog,
  });

  const { data: lastLog } = useQuery({
    queryKey: ["last_behavior_log", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("behavior_logs")
        .select("*")
        .eq("dog_id", activeDog!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!activeDog,
  });

  const { data: activePlan } = useQuery({
    queryKey: ["active_plan_dashboard", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("training_plans")
        .select("id, summary, security_level")
        .eq("dog_id", activeDog!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!activeDog,
  });

  if (!dogs || dogs.length === 0) {
    return (
      <AppLayout>
        <div className="pt-12 space-y-6 text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Dog className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Bienvenue sur PawPlan</h1>
            <p className="text-muted-foreground">Commencez par ajouter votre premier chien</p>
          </div>
          <Button onClick={() => navigate("/dogs/new")} className="h-12 text-base gap-2">
            <Plus className="h-5 w-5" /> Ajouter un chien
          </Button>
        </div>
      </AppLayout>
    );
  }

  const validated = progress?.filter((p) => p.validated).length || 0;
  const completionRate = Math.round((validated / 28) * 100);
  const currentDay = (progress?.filter((p) => p.validated).length || 0) + 1;
  const todayData = getDayById(Math.min(currentDay, 28));

  const hasAlerts = activeDog && (activeDog.muzzle_required || activeDog.bite_history);

  return (
    <AppLayout>
      <div className="pt-6 pb-4 space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Accueil</h1>
            <p className="text-sm text-muted-foreground">Reste sous seuil. Travaille proprement.</p>
          </div>
          {activeDog && (
            <button onClick={() => navigate("/dogs")} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border">
              <Dog className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{activeDog.name}</span>
            </button>
          )}
        </div>

        {/* Alerts */}
        {hasAlerts && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-3 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-destructive">Attention sécurité</p>
                {activeDog.muzzle_required && <p className="text-muted-foreground">Port de muselière obligatoire</p>}
                {activeDog.bite_history && <p className="text-muted-foreground">Antécédent de morsure signalé</p>}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active plan summary */}
        {activePlan && (
          <Card className="card-press" onClick={() => navigate("/plan")}>
            <CardContent className="p-4 flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Plan personnalisé actif</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{activePlan.summary}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current day + progression */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="card-press" onClick={() => todayData && navigate(`/day/${currentDay}`)}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Jour actuel</p>
              <p className="text-3xl font-bold text-primary">{Math.min(currentDay, 28)}</p>
              <p className="text-xs text-muted-foreground">/28</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-2">Progression globale</p>
              <p className="text-2xl font-bold text-foreground">{completionRate}%</p>
              <Progress value={completionRate} className="h-2 mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <Button
          onClick={() => todayData && navigate(`/training/${Math.min(currentDay, 28)}`)}
          className="w-full h-14 text-base font-semibold gap-2"
        >
          <Play className="h-5 w-5" /> Reprendre aujourd'hui
        </Button>

        {/* Today's exercises preview */}
        {todayData && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-semibold text-foreground">Exercices du jour</p>
              {todayData.exercises.slice(0, 3).map((ex) => (
                <div key={ex.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{ex.name}</span>
                  <span className="text-xs text-muted-foreground">{ex.repetitionsTarget} rép.</span>
                </div>
              ))}
              {todayData.exercises.length > 3 && (
                <p className="text-xs text-muted-foreground">+{todayData.exercises.length - 3} exercice(s)</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Last log summary */}
        {lastLog && (
          <Card>
            <CardContent className="p-4 space-y-1">
              <p className="text-sm font-semibold text-foreground">Dernier suivi</p>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Tension</span><span className="font-medium text-foreground">{lastLog.tension_level}/5</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Réactivité chiens</span><span className="font-medium text-foreground">{lastLog.dog_reaction_level}/5</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Réactivité humains</span><span className="font-medium text-foreground">{(lastLog as any).human_reaction_level || "–"}/5</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick access */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-12 gap-2" onClick={() => navigate("/journal")}>
            <ClipboardList className="h-4 w-4" /> Journal
          </Button>
          <Button variant="outline" className="h-12 gap-2" onClick={() => navigate("/stats")}>
            <BarChart3 className="h-4 w-4" /> Statistiques
          </Button>
          <Button variant="outline" className="h-12 gap-2" onClick={() => navigate("/plan")}>
            <BookOpen className="h-4 w-4" /> Plan personnalisé
          </Button>
          <Button variant="outline" className="h-12 gap-2" onClick={() => navigate("/safety")}>
            <AlertTriangle className="h-4 w-4" /> Sécurité
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
