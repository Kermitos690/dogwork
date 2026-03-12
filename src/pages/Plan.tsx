import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useActiveDog } from "@/hooks/useDogs";
import { useAuth } from "@/hooks/useAuth";
import { useAdaptiveSuggestion } from "@/hooks/useAdaptive";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Target, ClipboardCheck, AlertTriangle, BookOpen, Zap, Shield, ChevronRight, ChevronDown, Loader2, Info, Sparkles, Lock } from "lucide-react";
import { useHasFeature } from "@/hooks/useSubscription";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PROGRAM } from "@/data/program";
import { generatePersonalizedPlan, type PersonalizedPlan } from "@/lib/planGenerator";
import { toast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  done: "bg-success text-success-foreground",
  in_progress: "bg-accent text-accent-foreground",
  todo: "bg-muted text-muted-foreground",
};
const statusLabels: Record<string, string> = {
  done: "Validé", in_progress: "En cours", todo: "À faire",
};
const securityColors: Record<string, string> = {
  standard: "text-success", "élevé": "text-warning", critique: "text-destructive",
};

export default function PlanPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeDog = useActiveDog();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("personalized");
  const [generating, setGenerating] = useState(false);
  const [showPrecautions, setShowPrecautions] = useState(false);
  const [showPrereqs, setShowPrereqs] = useState(false);
  const hasAiPlan = useHasFeature("ai_plan");
  const adaptiveSuggestion = useAdaptiveSuggestion();

  const { data: savedPlan, refetch: refetchPlan } = useQuery({
    queryKey: ["training_plan", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase.from("training_plans").select("*")
        .eq("dog_id", activeDog!.id).eq("is_active", true)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!data) return null;
      return {
        id: data.id, dogName: data.title, summary: data.summary,
        axes: data.axes as any[], precautions: data.precautions as any[],
        frequency: data.frequency, averageDuration: data.average_duration,
        totalDays: data.total_days,
        securityLevel: data.security_level as "standard" | "élevé" | "critique",
        days: data.days as any[],
      } as PersonalizedPlan;
    },
    enabled: !!activeDog,
  });

  const { data: progress } = useQuery({
    queryKey: ["day_progress_all", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase.from("day_progress").select("*").eq("dog_id", activeDog!.id);
      const map: Record<number, any> = {};
      data?.forEach(p => { map[p.day_id] = p; });
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
      const { data } = await supabase.from("dog_evaluations").select("*").eq("dog_id", activeDog!.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!activeDog,
  });

  const canGenerate = activeDog && problems && problems.length > 0;

  const handleGenerate = async () => {
    if (!activeDog || !problems || !user) return;
    setGenerating(true);
    try {
      const plan = generatePersonalizedPlan({
        dog: activeDog,
        problems: problems.map(p => ({ problem_key: p.problem_key, intensity: p.intensity, frequency: p.frequency })),
        objectives: (objectives || []).map(o => ({ objective_key: o.objective_key, is_priority: o.is_priority || false })),
        evaluation: evaluation || null,
      });
      await supabase.from("training_plans").update({ is_active: false }).eq("dog_id", activeDog.id).eq("user_id", user.id);
      await supabase.from("training_plans").insert({
        dog_id: activeDog.id, user_id: user.id, plan_type: "personalized",
        title: plan.dogName, summary: plan.summary,
        axes: plan.axes as any, precautions: plan.precautions as any,
        frequency: plan.frequency, average_duration: plan.averageDuration,
        total_days: plan.totalDays, security_level: plan.securityLevel,
        days: plan.days as any,
      });
      refetchPlan();
      toast({ title: "✓ Plan généré", description: `Plan pour ${activeDog.name} enregistré.` });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  if (!activeDog) {
    return (
      <AppLayout>
        <div className="pt-12 text-center space-y-4">
          <p className="text-muted-foreground">Ajoutez d'abord un chien.</p>
          <Button onClick={() => navigate("/dogs/new")}>Ajouter un chien</Button>
        </div>
      </AppLayout>
    );
  }

  const plan = savedPlan;

  return (
    <AppLayout>
      <div className="pt-6 pb-4 space-y-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Plan d'entraînement</h1>
          <p className="text-sm text-muted-foreground">{activeDog.name}</p>
        </div>

        {/* Quick links */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <Button variant="outline" size="sm" className="shrink-0 gap-1 rounded-xl" onClick={() => navigate("/evaluation")}>
            <ClipboardCheck className="h-3 w-3" /> Évaluation
          </Button>
          <Button variant="outline" size="sm" className="shrink-0 gap-1 rounded-xl" onClick={() => navigate("/problems")}>
            <AlertTriangle className="h-3 w-3" /> Problématiques
          </Button>
          <Button variant="outline" size="sm" className="shrink-0 gap-1 rounded-xl" onClick={() => navigate("/objectives")}>
            <Target className="h-3 w-3" /> Objectifs
          </Button>
          <Button variant="outline" size="sm" className="shrink-0 gap-1 rounded-xl" onClick={() => navigate("/exercises")}>
            <BookOpen className="h-3 w-3" /> Bibliothèque
          </Button>
        </div>

        {/* Adaptive suggestion */}
        {adaptiveSuggestion && plan && (
          <div className={`rounded-2xl border p-3 flex items-start gap-2 ${
            adaptiveSuggestion.type === "warning" ? "border-warning/20 bg-warning/5" :
            adaptiveSuggestion.type === "success" ? "border-success/20 bg-success/5" :
            "border-border bg-card"
          }`}>
            <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
            <p className="text-xs text-foreground">{adaptiveSuggestion.message}</p>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full rounded-xl">
            <TabsTrigger value="personalized" className="flex-1 text-xs rounded-lg">Plan personnalisé</TabsTrigger>
            <TabsTrigger value="standard" className="flex-1 text-xs rounded-lg">Programme 28 jours</TabsTrigger>
          </TabsList>

          <TabsContent value="personalized" className="space-y-4 mt-4">
            {!plan ? (
              <div className="space-y-4">
                <Card className="rounded-2xl">
                  <CardContent className="p-6 space-y-4 text-center">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Zap className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground">Générer mon plan</h2>
                    <p className="text-sm text-muted-foreground">
                      Un plan sur mesure basé sur le profil de {activeDog.name}, ses problématiques et vos objectifs.
                    </p>
                    {!canGenerate && (
                      <div className="rounded-xl bg-warning/10 border border-warning/20 p-3">
                        <p className="text-xs text-warning">Renseignez au moins une problématique pour générer le plan.</p>
                      </div>
                    )}
                    {!hasAiPlan ? (
                      <Button onClick={() => navigate("/subscription")} className="w-full h-12 rounded-xl text-base bg-accent hover:bg-accent/90">
                        <Lock className="h-5 w-5" /> Débloquer avec le plan Pro
                      </Button>
                    ) : (
                      <Button onClick={handleGenerate} disabled={!canGenerate || generating} className="w-full h-12 rounded-xl text-base">
                        {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                        {generating ? "Génération..." : "Générer mon plan"}
                      </Button>
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Données utilisées</p>
                  <CheckItem label="Fiche chien" done={!!activeDog.breed || !!activeDog.weight_kg} action={() => navigate(`/dogs/${activeDog.id}`)} />
                  <CheckItem label="Évaluation initiale" done={!!evaluation} action={() => navigate("/evaluation")} />
                  <CheckItem label="Problématiques" done={(problems?.length || 0) > 0} action={() => navigate("/problems")} />
                  <CheckItem label="Objectifs" done={(objectives?.length || 0) > 0} action={() => navigate("/objectives")} />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary card */}
                <Card className="rounded-2xl overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-foreground">{plan.dogName}</h2>
                      <Badge variant="outline" className={`rounded-full ${securityColors[plan.securityLevel]}`}>
                        {plan.securityLevel === "critique" ? "🔴 Critique" : plan.securityLevel === "élevé" ? "🟠 Élevé" : "🟢 Standard"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.summary}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>📅 {plan.totalDays}j</span>
                      <span>⏱ {plan.averageDuration}</span>
                      <span>🔄 {plan.frequency}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Priority explanation */}
                {(plan as any).priorityExplanation && (
                  <div className="rounded-2xl border border-border bg-card p-3 flex items-start gap-2">
                    <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">{(plan as any).priorityExplanation}</p>
                  </div>
                )}

                {/* Axes - numbered */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Axes prioritaires</p>
                  {plan.axes.map((axis: any, i: number) => (
                    <div key={axis.key} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3">
                      <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">{i + 1}</div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{axis.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{axis.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Precautions - collapsible */}
                {plan.precautions.filter((p: any) => p.type === "safety" || p.type === "health").length > 0 && (
                  <Collapsible open={showPrecautions} onOpenChange={setShowPrecautions}>
                    <CollapsibleTrigger className="w-full">
                      <div className="rounded-2xl border border-warning/20 bg-warning/5 p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-warning" />
                          <span className="text-sm font-semibold text-warning">Précautions</span>
                          <span className="text-xs text-muted-foreground">({plan.precautions.filter((p: any) => p.type !== "method").length})</span>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-warning transition-transform ${showPrecautions ? "rotate-180" : ""}`} />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-1.5">
                      {plan.precautions.filter((p: any) => p.type === "safety" || p.type === "health").map((p: any, i: number) => (
                        <p key={i} className="text-xs text-muted-foreground pl-4">• {p.text}</p>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Prerequisites missing */}
                {(plan as any).prerequisitesMissing && (plan as any).prerequisitesMissing.length > 0 && (
                  <Collapsible open={showPrereqs} onOpenChange={setShowPrereqs}>
                    <CollapsibleTrigger className="w-full">
                      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold text-primary">Prérequis</span>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-primary transition-transform ${showPrereqs ? "rotate-180" : ""}`} />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-1.5">
                      {(plan as any).prerequisitesMissing.map((p: string, i: number) => (
                        <p key={i} className="text-xs text-muted-foreground pl-4">• {p}</p>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Days by week */}
                {[1, 2, 3, 4].map((week) => (
                  <div key={week} className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Semaine {week}</h3>
                {plan.days.filter((d: any) => d.week === week).map((day: any) => {
                      const p = progress?.[day.dayNumber];
                      const status = p?.status || "todo";
                      const prevDayProgress = day.dayNumber > 1 ? progress?.[day.dayNumber - 1] : null;
                      const isLocked = day.dayNumber > 1 && !prevDayProgress?.validated;
                      const firstUnlocked = plan.days.findIndex((d: any) => {
                        const dp = progress?.[d.dayNumber];
                        return !dp?.validated;
                      });
                      const isCurrentDay = plan.days[firstUnlocked]?.dayNumber === day.dayNumber;
                      return (
                        <Card
                          key={day.dayNumber}
                          className={`rounded-2xl ${isLocked ? "opacity-50" : "card-press"}`}
                          onClick={() => {
                            if (isLocked) {
                              toast({ title: "🔒 Jour verrouillé", description: "Validez le jour précédent pour débloquer celui-ci.", variant: "destructive" });
                              return;
                            }
                            navigate(`/day/${day.dayNumber}?source=plan`);
                          }}
                        >
                          <CardContent className="p-3 flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${isLocked ? "bg-muted text-muted-foreground" : statusColors[status]}`}>
                              {isLocked ? <Lock className="h-3.5 w-3.5" /> : day.dayNumber}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground break-words">{day.title}</p>
                              <p className="text-xs text-muted-foreground">{day.duration} · {day.difficulty}</p>
                            </div>
                            {isCurrentDay && !isLocked && <Badge className="text-[10px] shrink-0 rounded-full bg-primary/15 text-primary border-0">En cours</Badge>}
                            {!isCurrentDay && <Badge variant="secondary" className="text-[10px] shrink-0 rounded-full">{isLocked ? "🔒" : statusLabels[status]}</Badge>}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ))}

                <Button variant="outline" onClick={handleGenerate} disabled={generating} className="w-full rounded-xl">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Régénérer le plan
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="standard" className="space-y-4 mt-4">
            {[1, 2, 3, 4].map((week) => (
              <div key={week} className="space-y-2">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Semaine {week}</h2>
                {PROGRAM.filter(d => d.week === week).map((day, i) => {
                  const p = progress?.[day.id];
                  const status = p?.status || "todo";
                  const prevProgress = day.id > 1 ? progress?.[day.id - 1] : null;
                  const isLocked = day.id > 1 && !prevProgress?.validated;
                  return (
                    <Card key={day.id} className="card-press rounded-2xl stagger-item" style={{ animationDelay: `${i * 50}ms` }} onClick={() => navigate(`/day/${day.id}`)}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${statusColors[status]}`}>
                          {day.id}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{day.title}</p>
                          <p className="text-xs text-muted-foreground">{day.duration} · {day.difficulty}</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0 rounded-full">{statusLabels[status]}</Badge>
                      </CardContent>
                    </Card>
                  );
                })}
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
    <button onClick={action} className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left active:scale-[0.98] transition-all">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${done ? "bg-success text-success-foreground" : "border-2 border-muted-foreground/30"}`}>
        {done && "✓"}
      </div>
      <span className={`text-sm flex-1 ${done ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
