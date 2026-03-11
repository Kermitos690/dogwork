import { useNavigate } from "react-router-dom";
import { useActiveDog } from "@/hooks/useDogs";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Target, ClipboardCheck, AlertTriangle, BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PROGRAM } from "@/data/program";

const statusColors: Record<string, string> = {
  done: "bg-success text-success-foreground",
  in_progress: "bg-accent text-accent-foreground",
  todo: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  done: "Validé",
  in_progress: "En cours",
  todo: "À faire",
};

export default function PlanPage() {
  const navigate = useNavigate();
  const activeDog = useActiveDog();
  const days = PROGRAM;

  const { data: progress } = useQuery({
    queryKey: ["day_progress_all", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("day_progress")
        .select("*")
        .eq("dog_id", activeDog!.id);
      const map: Record<number, any> = {};
      data?.forEach((p) => { map[p.day_id] = p; });
      return map;
    },
    enabled: !!activeDog,
  });

  if (!activeDog) {
    return (
      <AppLayout>
        <div className="pt-12 text-center space-y-4">
          <p className="text-muted-foreground">Ajoutez d'abord un chien pour voir le plan.</p>
          <Button onClick={() => navigate("/dogs/new")}>Ajouter un chien</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="pt-6 pb-4 space-y-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Plan personnalisé</h1>
          <p className="text-sm text-muted-foreground">Neutralité, contrôle, progression.</p>
        </div>

        {/* Quick links */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <Button variant="outline" size="sm" className="shrink-0 gap-1" onClick={() => navigate("/evaluation")}>
            <ClipboardCheck className="h-3 w-3" /> Évaluation
          </Button>
          <Button variant="outline" size="sm" className="shrink-0 gap-1" onClick={() => navigate("/problems")}>
            <AlertTriangle className="h-3 w-3" /> Problématiques
          </Button>
          <Button variant="outline" size="sm" className="shrink-0 gap-1" onClick={() => navigate("/objectives")}>
            <Target className="h-3 w-3" /> Objectifs
          </Button>
          <Button variant="outline" size="sm" className="shrink-0 gap-1" onClick={() => navigate("/exercises")}>
            <BookOpen className="h-3 w-3" /> Bibliothèque
          </Button>
        </div>

        {/* Program days */}
        {[1, 2, 3, 4].map((week) => (
          <div key={week} className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Semaine {week}
            </h2>
            <div className="space-y-2">
              {days.filter((d) => d.week === week).map((day, i) => {
                const p = progress?.[day.id];
                const status = p?.status || "todo";
                return (
                  <Card
                    key={day.id}
                    className="card-press stagger-item"
                    style={{ animationDelay: `${i * 50}ms` }}
                    onClick={() => navigate(`/day/${day.id}`)}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${statusColors[status]}`}>
                        {day.id}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{day.title}</p>
                        <p className="text-xs text-muted-foreground">{day.duration} · {day.difficulty}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {statusLabels[status]}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
