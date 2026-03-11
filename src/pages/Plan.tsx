import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useActiveDog } from "@/hooks/useDogs";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, ClipboardCheck, AlertTriangle, BookOpen, Zap, Shield, ChevronRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PROGRAM } from "@/data/program";
import { generatePersonalizedPlan, type PersonalizedPlan } from "@/lib/planGenerator";

const statusColors: Record<string, string> = {
  done: "bg-success text-success-foreground",
  in_progress: "bg-accent text-accent-foreground",
  todo: "bg-muted text-muted-foreground",
};
const statusLabels: Record<string, string> = {
  done: "Validé", in_progress: "En cours", todo: "À faire",
};

const securityColors: Record<string, string> = {
  standard: "text-success",
  "élevé": "text-warning",
  critique: "text-destructive",
};

export default function PlanPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeDog = useActiveDog();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("personalized");
  const [generatedPlan, setGeneratedPlan] = useState<PersonalizedPlan | null>(null);

  const { data: progress } = useQuery({
    queryKey: ["day_progress_all", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase.from("day_progress").select("*").eq("dog_id", activeDog!.id);
      const map: Record<number, any> = {};
      data?.forEach((p) => { map[p.day_id] = p; });
      return map;
    },
    enabled: !!activeDog,
  });

  const { data: problems } = useQuery({
    queryKey: ["dog_problems_plan", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase.from("dog_problems").select("*").eq("dog_id", activeDog!.id);
      return data || [];
    },
    enabled: !!activeDog,
  });

  const { data: objectives } = useQuery({
    queryKey: ["dog_objectives_plan", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase.from("dog_objectives").select("*").eq("dog_id", activeDog!.id);
      return data || [];
    },
    enabled: !!activeDog,
  });

  const { data: evaluation } = useQuery({
    queryKey: ["dog_evaluation_plan", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase.from("dog_evaluations").select("*").eq("dog_id", activeDog!.id).order("created_at", { ascending: false }).limit(1).single();
      return data;
    },
    enabled: !!activeDog,
  });

  const canGenerate = activeDog && problems && problems.length > 0;

  const handleGenerate = () => {
    if (!activeDog || !problems) return;
    const plan = generatePersonalizedPlan({
      dog: activeDog,
      problems: problems.map(p => ({ problem_key: p.problem_key, intensity: p.intensity, frequency: p.frequency })),
      objectives: (objectives || []).map(o => ({ objective_key: o.objective_key, is_priority: o.is_priority || false })),
      evaluation: evaluation || null,
    });
    setGeneratedPlan(plan);
  };

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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="personalized" className="flex-1 text-xs">Plan personnalisé</TabsTrigger>
            <TabsTrigger value="standard" className="flex-1 text-xs">Programme 28 jours</TabsTrigger>
          </TabsList>

          <TabsContent value="personalized" className="space-y-4 mt-4">
            {!generatedPlan ? (
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-5 space-y-3 text-center">
                    <Zap className="h-10 w-10 text-primary mx-auto" />
                    <h2 className="text-lg font-bold text-foreground">Générer mon plan</h2>
                    <p className="text-sm text-muted-foreground">
                      Un plan sur mesure basé sur le profil de {activeDog.name}, ses problématiques et vos objectifs.
                    </p>
                    {!canGenerate && (
                      <div className="rounded-lg bg-warning/10 border border-warning/20 p-3">
                        <p className="text-xs text-warning">
                          Renseignez au moins une problématique pour générer le plan.
                        </p>
                      </div>
                    )}
                    <Button onClick={handleGenerate} disabled={!canGenerate} className="w-full h-12 text-base">
                      <Zap className="h-5 w-5" /> Générer mon plan
                    </Button>
                  </CardContent>
                </Card>

                {/* Pre-requisites checklist */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Données utilisées</p>
                  <CheckItem label="Fiche chien complète" done={!!activeDog.breed || !!activeDog.weight_kg} action={() => navigate(`/dogs/${activeDog.id}`)} />
                  <CheckItem label="Évaluation initiale" done={!!evaluation} action={() => navigate("/evaluation")} />
                  <CheckItem label="Problématiques renseignées" done={(problems?.length || 0) > 0} action={() => navigate("/problems")} />
                  <CheckItem label="Objectifs définis" done={(objectives?.length || 0) > 0} action={() => navigate("/objectives")} />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Plan summary */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-foreground">Plan pour {generatedPlan.dogName}</h2>
                      <Badge variant="outline" className={securityColors[generatedPlan.securityLevel]}>
                        {generatedPlan.securityLevel === "critique" ? "🔴 Critique" : generatedPlan.securityLevel === "élevé" ? "🟠 Élevé" : "🟢 Standard"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{generatedPlan.summary}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>📅 {generatedPlan.totalDays} jours</span>
                      <span>⏱ {generatedPlan.averageDuration}</span>
                      <span>🔄 {generatedPlan.frequency}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Axes */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Axes prioritaires</p>
                  {generatedPlan.axes.map((axis, i) => (
                    <Card key={axis.key}>
                      <CardContent className="p-3 flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{axis.label}</p>
                          <p className="text-xs text-muted-foreground">{axis.reason}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Precautions */}
                {generatedPlan.precautions.filter(p => p.type === "safety" || p.type === "health").length > 0 && (
                  <Card className="border-warning/30 bg-warning/5">
                    <CardContent className="p-4 space-y-2">
                      <p className="text-sm font-semibold text-warning flex items-center gap-1">
                        <Shield className="h-4 w-4" /> Précautions
                      </p>
                      {generatedPlan.precautions
                        .filter(p => p.type === "safety" || p.type === "health")
                        .map((p, i) => (
                          <p key={i} className="text-xs text-muted-foreground">• {p.text}</p>
                        ))}
                    </CardContent>
                  </Card>
                )}

                {/* Days */}
                {[1, 2, 3, 4].map((week) => (
                  <div key={week} className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Semaine {week}
                    </h3>
                    {generatedPlan.days.filter(d => d.week === week).map((day) => (
                      <Card key={day.dayNumber} className="card-press" onClick={() => navigate(`/day/${day.dayNumber}`)}>
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {day.dayNumber}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{day.title}</p>
                            <p className="text-xs text-muted-foreground">{day.duration} · {day.difficulty}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ))}

                <Button variant="outline" onClick={() => setGeneratedPlan(null)} className="w-full">
                  Régénérer le plan
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="standard" className="space-y-4 mt-4">
            {[1, 2, 3, 4].map((week) => (
              <div key={week} className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Semaine {week}
                </h2>
                <div className="space-y-2">
                  {PROGRAM.filter((d) => d.week === week).map((day, i) => {
                    const p = progress?.[day.id];
                    const status = p?.status || "todo";
                    return (
                      <Card key={day.id} className="card-press stagger-item" style={{ animationDelay: `${i * 50}ms` }} onClick={() => navigate(`/day/${day.id}`)}>
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
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function CheckItem({ label, done, action }: { label: string; done: boolean; action: () => void }) {
  return (
    <button onClick={action} className="w-full flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left card-press">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${done ? "bg-success text-success-foreground" : "border-2 border-muted-foreground/30"}`}>
        {done && "✓"}
      </div>
      <span className={`text-sm flex-1 ${done ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
