import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useActiveDog } from "@/hooks/useDogs";
import { useAuth } from "@/hooks/useAuth";
import { useAdaptiveSuggestion } from "@/hooks/useAdaptive";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Target, ClipboardCheck, AlertTriangle, BookOpen, Zap, Shield, ChevronRight, ChevronDown, Loader2, Info, Sparkles, Lock, Crown, Star } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PROGRAM } from "@/data/program";
import { generatePersonalizedPlan, setDbExercises, type PersonalizedPlan } from "@/lib/planGenerator";
import { tierGrantsFullAccess } from "@/lib/plans";
import { toast } from "@/hooks/use-toast";
import { useSaveAIDocument } from "@/hooks/useAIDocuments";
import { NoActiveDogState } from "@/components/NoActiveDogState";
import { resolveDayState } from "@/hooks/useDayLockState";
import { useAIBalance, useAIFeatures } from "@/hooks/useAICredits";
import { useCreditConfirmation } from "@/hooks/useCreditConfirmation";
import { CreditConfirmDialog } from "@/components/CreditConfirmDialog";

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
  const [durationDays, setDurationDays] = useState(28);
  const { tier } = useSubscription();
  // Personalized AI plan is reserved for Expert / Educator / Shelter (full access tiers)
  const hasAiPlan = tierGrantsFullAccess(tier);
  const adaptiveSuggestion = useAdaptiveSuggestion();
  const saveDoc = useSaveAIDocument();
  const { data: wallet } = useAIBalance();
  const { data: features } = useAIFeatures();
  const credit = useCreditConfirmation();
  const [searchParams, setSearchParams] = useSearchParams();
  const planFeature = features?.find((f) => f.code === "ai_plan_generation");
  const planCost = planFeature?.credits_cost ?? 10;
  const planBalance = wallet?.balance ?? 0;

  const { data: savedPlan, refetch: refetchPlan } = useQuery({
    queryKey: ["training_plan", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase.from("training_plans").select("*")
        .eq("dog_id", activeDog!.id).eq("is_active", true)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!data) return null;

      // Normalize axes: templates store plain strings, personalized stores objects
      const rawAxes = data.axes as any[];
      const axes = (rawAxes || []).map((a: any, i: number) => {
        if (typeof a === "string") return { key: a, label: a.charAt(0).toUpperCase() + a.slice(1), reason: "" };
        return a;
      });

      // Normalize precautions: templates store plain strings
      const rawPrecautions = data.precautions as any[];
      const precautions = (rawPrecautions || []).map((p: any) => {
        if (typeof p === "string") return { type: "safety", text: p };
        return p;
      });

      // Normalize days: templates use {day, theme, exercises} format
      const rawDays = data.days as any[];
      const totalDays = data.total_days || rawDays?.length || 0;
      const days = (rawDays || []).map((d: any, i: number) => {
        if (d.dayNumber !== undefined) return d; // already normalized
        const dayNum = d.day ?? (i + 1);
        const week = Math.ceil(dayNum / 7) || 1;
        const exCount = d.exercises?.length || 0;
        const totalDur = d.exercises?.reduce((sum: number, ex: any) => {
          const mins = parseInt(ex.duration) || 5;
          return sum + mins;
        }, 0) || 15;
        return {
          dayNumber: dayNum,
          week,
          title: d.theme || d.title || `Jour ${dayNum}`,
          duration: `${totalDur} min`,
          difficulty: week <= 2 ? "Facile" : "Intermédiaire",
          exercises: (d.exercises || []).map((ex: any, ei: number) => ({
            id: ex.slug || `ex-${dayNum}-${ei}`,
            slug: ex.slug,
            name: ex.slug?.replace(/-/g, " ") || `Exercice ${ei + 1}`,
            repetitions: ex.repetitions || "5x",
            duration: ex.duration || "5 min",
            note: ex.note || "",
          })),
        };
      });

      return {
        id: data.id, dogName: data.title, summary: data.summary,
        axes, precautions,
        frequency: data.frequency, averageDuration: data.average_duration,
        totalDays,
        securityLevel: data.security_level as "standard" | "élevé" | "critique",
        days,
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

  const runGeneration = async () => {
    if (!activeDog || !problems || !user) return;
    setGenerating(true);
    try {
      // 1. Server-side debit FIRST (universal pricing, single source of truth).
      const { data: debitData, error: debitErr } = await supabase.functions.invoke("ai-debit", {
        body: {
          feature_code: "ai_plan_generation",
          metadata: { dog_id: activeDog.id, dog_name: activeDog.name, duration_days: durationDays, tier },
        },
      });
      if (debitErr) {
        const ctx = (debitErr as any).context?.body;
        let msg = debitErr.message;
        try {
          const parsed = typeof ctx === "string" ? JSON.parse(ctx) : ctx;
          if (parsed?.code === "INSUFFICIENT_CREDITS") {
            toast({
              title: "Crédits insuffisants",
              description: `Il vous manque ${(parsed.required ?? 0) - (parsed.balance ?? 0)} crédit(s). Rechargez dans le Shop.`,
              variant: "destructive",
            });
            return;
          }
          msg = parsed?.error ?? msg;
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      const creditsSpent = (debitData as any)?.credits_spent ?? planCost;

      // 2. Load exercises catalog for the generator.
      const { data: dbExercises } = await supabase.from("exercises").select("id, slug, name, description, objective, summary, dedication, short_instruction, steps, tutorial_steps, success_criteria, contraindications, priority_axis, tags, target_problems, level, difficulty, compatible_reactivity, compatible_senior, compatible_puppy, compatible_muzzle, exercise_type, is_professional");
      if (dbExercises && dbExercises.length > 0) {
        setDbExercises(dbExercises);
      }

      // 3. Adaptive behavior data (Expert / pro tiers).
      let behaviorData = undefined;
      if (tierGrantsFullAccess(tier)) {
        const { data: logs } = await supabase
          .from("behavior_logs")
          .select("*")
          .eq("dog_id", activeDog.id)
          .order("created_at", { ascending: false })
          .limit(10);
        const { data: progress } = await supabase
          .from("day_progress")
          .select("*")
          .eq("dog_id", activeDog.id);
        const { data: journalEntries } = await supabase
          .from("journal_entries")
          .select("incidents")
          .eq("dog_id", activeDog.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (logs && logs.length >= 3) {
          const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
          const score = (field: string, goodValue: string) => {
            const vals = logs.slice(0, 7).map((l: any) => l[field]).filter(Boolean);
            if (!vals.length) return 50;
            return Math.round((vals.filter((v: string) => v === goodValue).length / vals.length) * 100);
          };
          behaviorData = {
            avgTension: avg(logs.map(l => l.tension_level || 0).filter(Boolean)),
            avgDogReaction: avg(logs.map(l => l.dog_reaction_level || 0).filter(Boolean)),
            avgHumanReaction: avg(logs.map((l: any) => l.human_reaction_level || 0).filter(Boolean)),
            stopScore: score("stop_response", "oui"),
            focusScore: score("focus_quality", "bon"),
            recoveryRate: score("recovery_after_trigger", "rapide"),
            incidentCount: (journalEntries || []).filter(e => e.incidents && e.incidents.length > 0).length,
            daysCompleted: (progress || []).filter(p => p.validated).length,
          };
        }
      }

      // 4. Generate plan (client-side intelligence engine).
      const plan = generatePersonalizedPlan({
        dog: activeDog,
        problems: problems.map(p => ({ problem_key: p.problem_key, intensity: p.intensity, frequency: p.frequency })),
        objectives: (objectives || []).map(o => ({ objective_key: o.objective_key, is_priority: o.is_priority || false })),
        evaluation: evaluation || null,
      }, { tier, behaviorData, totalDays: durationDays });

      // 5. Persist as the active training plan.
      await supabase.from("training_plans").update({ is_active: false }).eq("dog_id", activeDog.id).eq("user_id", user.id);
      await supabase.from("training_plans").insert({
        dog_id: activeDog.id, user_id: user.id, plan_type: tierGrantsFullAccess(tier) ? "expert" : "personalized",
        title: plan.dogName, summary: plan.summary,
        axes: plan.axes as any, precautions: plan.precautions as any,
        frequency: plan.frequency, average_duration: plan.averageDuration,
        total_days: plan.totalDays, security_level: plan.securityLevel,
        days: plan.days as any,
      });
      refetchPlan();

      // 6. Mirror in the AI documents library with the real price paid.
      try {
        await saveDoc.mutateAsync({
          dog_id: activeDog.id,
          feature_code: "ai_plan_generation",
          document_type: "training_plan",
          title: `Plan ${plan.totalDays}j — ${activeDog.name}`,
          summary: plan.summary,
          content: plan as any,
          credits_spent: creditsSpent,
          metadata: { duration_days: plan.totalDays, tier, dog_id: activeDog.id, dog_name: activeDog.name },
        });
      } catch (e) {
        console.error("[Plan] auto-save failed:", e);
      }

      qc.invalidateQueries({ queryKey: ["ai-balance"] });
      qc.invalidateQueries({ queryKey: ["ai-documents"] });
      toast({ title: "✨ Plan IA généré", description: `Plan ${plan.totalDays} jours pour ${activeDog.name}. ${creditsSpent} crédit${creditsSpent > 1 ? "s" : ""} débité${creditsSpent > 1 ? "s" : ""}. Disponible dans Mes documents.` });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = () => {
    if (!canGenerate) return;
    credit.requestConfirmation({
      featureCode: "ai_plan_generation",
      benefit: `Génère un plan ${durationDays} jours sur mesure pour ${activeDog?.name}, basé sur ses problématiques, objectifs et évaluation.`,
      onConfirm: () => runGeneration(),
    });
  };

  // Auto-trigger from Outils hub (?autogen=1)
  useEffect(() => {
    if (searchParams.get("autogen") === "1" && canGenerate && !generating && hasAiPlan) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("autogen");
      setSearchParams(newParams, { replace: true });
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, canGenerate, hasAiPlan]);

  if (!activeDog) {
    return (
      <AppLayout>
        <NoActiveDogState
          title="Plan d'entraînement"
          description="Sélectionnez un chien pour générer ou consulter son plan personnalisé."
        />
      </AppLayout>
    );
  }

  const plan = savedPlan;

  return (
    <AppLayout>
      <div className="pb-4 space-y-4 animate-fade-in">
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
            <TabsTrigger value="personalized" className="flex-1 text-xs rounded-lg">Mon plan</TabsTrigger>
            <TabsTrigger value="templates" className="flex-1 text-xs rounded-lg">Programmes</TabsTrigger>
            <TabsTrigger value="standard" className="flex-1 text-xs rounded-lg">28 jours</TabsTrigger>
          </TabsList>

          <TabsContent value="personalized" className="space-y-4 mt-4">
            {!plan ? (
              <div className="space-y-4">
                <Card className="rounded-2xl">
                  <CardContent className="p-6 space-y-4 text-center">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground">Plan IA personnalisé</h2>
                    <p className="text-sm text-muted-foreground">
                      Une intelligence parcourt les 480+ exercices et compose un plan sur mesure pour {activeDog.name},
                      en tenant compte de son profil, ses problèmes et vos objectifs.
                    </p>
                    {!canGenerate && (
                      <div className="rounded-xl bg-warning/10 border border-warning/20 p-3">
                        <p className="text-xs text-warning">Renseignez au moins une problématique pour générer le plan.</p>
                      </div>
                    )}
                    {!hasAiPlan ? (
                      <>
                        <div className="rounded-xl bg-accent/10 border border-accent/20 p-3 text-left">
                          <p className="text-xs text-foreground font-medium flex items-center gap-1.5">
                            <Crown className="h-3.5 w-3.5 text-accent" />
                            Réservé au plan Expert
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Le plan IA personnalisé est inclus dans Expert (19,90 CHF/mois) et tous les paliers professionnels.
                          </p>
                        </div>
                        <Button onClick={() => navigate("/subscription")} className="w-full h-12 rounded-xl text-base bg-accent hover:bg-accent/90">
                          <Lock className="h-5 w-5" /> Passer à Expert
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2 text-left">
                          <label className="text-xs font-medium text-foreground">Durée du plan</label>
                          <div className="grid grid-cols-4 gap-2">
                            {[7, 14, 21, 28].map(d => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setDurationDays(d)}
                                className={`rounded-xl border-2 py-2 text-xs font-medium transition-all ${
                                  durationDays === d
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border bg-card text-muted-foreground"
                                }`}
                              >
                                {d}j
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="number"
                              min={3}
                              max={90}
                              value={durationDays}
                              onChange={(e) => setDurationDays(Math.max(3, Math.min(90, Number(e.target.value) || 28)))}
                              className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm"
                            />
                            <span className="text-xs text-muted-foreground">jours (3 à 90)</span>
                          </div>
                        </div>
                        <Button onClick={handleGenerate} disabled={!canGenerate || generating} className="w-full h-12 rounded-xl text-base">
                          {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                          {generating ? "Génération..." : `Générer mon plan (${durationDays}j)`}
                        </Button>
                      </>
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
                {Array.from(new Set(plan.days.map((d: any) => d.week))).sort((a: number, b: number) => a - b).map((week: number) => (
                  <div key={week} className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Semaine {week}</h3>
                {plan.days.filter((d: any) => d.week === week).map((day: any) => {
                      const snap = resolveDayState(day.dayNumber, progress || {});
                      const status = snap.validated ? "done" : (snap.state === "in_progress" ? "in_progress" : "todo");
                      const isLocked = snap.locked;
                      const firstUnlocked = plan.days.findIndex((d: any) => {
                        const dp = progress?.[d.dayNumber];
                        return !dp?.validated;
                      });
                      const isCurrentDay = plan.days[firstUnlocked]?.dayNumber === day.dayNumber;
                      return (
                        <Card
                          key={day.dayNumber}
                          className={`rounded-2xl overflow-hidden transition-all ${
                            isLocked ? "opacity-50" : "card-press"
                          } ${isCurrentDay && !isLocked ? "ring-2 ring-primary/40 border-primary/30" : ""}`}
                          onClick={() => {
                            if (isLocked) {
                              toast({ title: "🔒 Jour verrouillé", description: "Validez le jour précédent pour débloquer celui-ci.", variant: "destructive" });
                              return;
                            }
                            navigate(`/day/${day.dayNumber}?source=plan`);
                          }}
                        >
                          <CardContent className="p-3 flex items-center gap-3 relative">
                            {isCurrentDay && !isLocked && (
                              <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-primary" aria-hidden />
                            )}
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${isLocked ? "bg-muted text-muted-foreground" : statusColors[status]}`}>
                              {isLocked ? <Lock className="h-3.5 w-3.5" /> : day.dayNumber}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground break-words leading-snug">{day.title}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{day.duration} · {day.difficulty}</p>
                            </div>
                            {isCurrentDay && !isLocked ? (
                              <Badge className="text-[10px] shrink-0 rounded-full bg-primary text-primary-foreground border-0">Aujourd'hui</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] shrink-0 rounded-full">{isLocked ? "Verrouillé" : statusLabels[status]}</Badge>
                            )}
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

          <TabsContent value="templates" className="space-y-4 mt-4">
            <TemplatesList onActivated={() => { refetchPlan(); setActiveTab("personalized"); }} />
          </TabsContent>

          <TabsContent value="standard" className="space-y-4 mt-4">
            {[1, 2, 3, 4].map((week) => (
              <div key={week} className="space-y-2">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Semaine {week}</h2>
                {PROGRAM.filter(d => d.week === week).map((day, i) => {
                  const snap = resolveDayState(day.id, progress || {});
                  const status = snap.validated ? "done" : (snap.state === "in_progress" ? "in_progress" : "todo");
                  const isLocked = snap.locked;
                  return (
                    <Card
                      key={day.id}
                      className={`rounded-2xl stagger-item ${isLocked ? "opacity-50" : "card-press"}`}
                      style={{ animationDelay: `${i * 50}ms` }}
                      onClick={() => {
                        if (isLocked) {
                          toast({ title: "🔒 Jour verrouillé", description: "Validez le jour précédent pour débloquer celui-ci.", variant: "destructive" });
                          return;
                        }
                        navigate(`/day/${day.id}`);
                      }}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${isLocked ? "bg-muted text-muted-foreground" : statusColors[status]}`}>
                          {isLocked ? <Lock className="h-3.5 w-3.5" /> : day.id}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground break-words">{day.title}</p>
                          <p className="text-xs text-muted-foreground">{day.duration} · {day.difficulty}</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0 rounded-full">{isLocked ? "🔒" : statusLabels[status]}</Badge>
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

function TemplatesList({ onActivated }: { onActivated: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeDog = useActiveDog();
  const { tier } = useSubscription();
  // Pro templates accessible to: pro, expert, educator, shelter
  const isPro = tier === "pro" || tierGrantsFullAccess(tier);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["plan-templates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("training_plans")
        .select("id, title, summary, template_tier, template_category, total_days, average_duration")
        .eq("is_template", true)
        .order("template_tier")
        .order("title");
      return data || [];
    },
  });

  const handleActivate = async (template: any) => {
    if (!activeDog || !user) {
      toast({ title: "Sélectionnez un chien", variant: "destructive" });
      return;
    }
    if (template.template_tier === "pro" && !isPro) {
      navigate("/subscription");
      return;
    }
    // Load full template
    const { data: full } = await supabase
      .from("training_plans")
      .select("*")
      .eq("id", template.id)
      .single();
    if (!full) return;

    // Deactivate current plans
    await supabase.from("training_plans").update({ is_active: false }).eq("dog_id", activeDog.id).eq("user_id", user.id);
    // Insert as user's active plan
    await supabase.from("training_plans").insert({
      dog_id: activeDog.id, user_id: user.id, plan_type: "template",
      title: full.title, summary: full.summary,
      axes: full.axes, precautions: full.precautions,
      frequency: full.frequency, average_duration: full.average_duration,
      total_days: full.total_days, security_level: full.security_level,
      days: full.days,
    });
    toast({ title: "✓ Programme activé", description: `${full.title} appliqué à ${activeDog.name}.` });
    onActivated();
  };

  const freeTemplates = templates.filter((t: any) => t.template_tier === "free");
  const proTemplates = templates.filter((t: any) => t.template_tier === "pro");

  if (isLoading) return <div className="text-center py-8 text-muted-foreground text-sm animate-pulse">Chargement...</div>;

  return (
    <div className="space-y-6">
      {/* Free section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Programmes Freemium</h3>
          <Badge variant="secondary" className="text-[10px] rounded-full">{freeTemplates.length} gratuits</Badge>
        </div>
        {freeTemplates.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Aucun programme disponible pour le moment.</p>
        )}
        {freeTemplates.map((t: any) => (
          <Card key={t.id} className="rounded-2xl card-press" onClick={() => handleActivate(t)}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{t.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.summary}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">📅 {t.total_days}j · ⏱ {t.average_duration}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pro section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-warning" />
          <h3 className="text-sm font-semibold text-foreground">Programmes Pro</h3>
          <Badge className="text-[10px] rounded-full bg-warning/15 text-warning border-0">{proTemplates.length} programmes</Badge>
        </div>
        {!isPro && (
          <div className="rounded-2xl border border-warning/20 bg-warning/5 p-3 flex items-center gap-3">
            <Lock className="h-4 w-4 text-warning shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-foreground font-medium">{proTemplates.length} programmes exclusifs</p>
              <p className="text-[10px] text-muted-foreground">Débloquez avec l'abonnement Pro</p>
            </div>
            <Button size="sm" variant="outline" className="shrink-0 text-xs" onClick={() => navigate("/subscription")}>
              Voir l'offre
            </Button>
          </div>
        )}
        {proTemplates.map((t: any) => (
          <Card
            key={t.id}
            className={`rounded-2xl ${isPro ? "card-press" : "opacity-60"}`}
            onClick={() => handleActivate(t)}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{t.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.summary}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">📅 {t.total_days}j · ⏱ {t.average_duration}</p>
                </div>
                {isPro ? (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                ) : (
                  <Lock className="h-4 w-4 text-warning shrink-0 mt-1" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
