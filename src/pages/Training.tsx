import { useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, Plus, Minus, CheckCircle2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AppLayout } from "@/components/AppLayout";
import { Timer } from "@/components/Timer";
import { getDayById } from "@/data/program";
import { useActiveDog } from "@/hooks/useDogs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import type { PlanDay } from "@/lib/planGenerator";
import { upsertDayProgress } from "@/lib/dayProgress";
import { ZoneSelector } from "@/components/ZoneSelector";
import { ZoneBadge } from "@/components/ZoneBadge";
import type { Zone } from "@/lib/zones";
import { DayJourneyHeader } from "@/components/DayJourneyHeader";
import { NoActiveDogState } from "@/components/NoActiveDogState";

export default function Training() {
  const { dayId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeDog = useActiveDog();
  const id = Number(dayId);
  const source = searchParams.get("source");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reps, setReps] = useState(0);
  const [showSteps, setShowSteps] = useState(false);
  const [sessionZone, setSessionZone] = useState<Zone | null>(null);
  const [zoneSaving, setZoneSaving] = useState(false);


  const { data: planDay } = useQuery({
    queryKey: ["training_plan_day", activeDog?.id, id],
    queryFn: async () => {
      const { data } = await supabase.from("training_plans").select("days")
        .eq("dog_id", activeDog!.id).eq("is_active", true)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!data?.days) return null;
      return (data.days as unknown as PlanDay[]).find(d => d.dayNumber === id) || null;
    },
    enabled: !!activeDog && source === "plan",
  });

  const standardDay = getDayById(id);
  const isPersonalized = source === "plan" && planDay;

  const planExercises = isPersonalized
    ? planDay.exercises.map((e: any, i: number) => ({
        id: e.id || `plan-ex-${i}`,
        name: e.name,
        slug: e.slug || "",
        description: e.description || "",
        instructions: e.instructions,
        repetitionsTarget: e.repetitions,
        timerSuggested: e.timerSeconds,
        tutorialSteps: e.tutorialSteps || [],
        validationProtocol: e.validationProtocol || e.successCriteria || "",
        dayId: id,
      }))
    : [];

  const exercises = planExercises.length > 0 ? planExercises : (standardDay?.exercises || []);

  const { data: progress, refetch } = useQuery({
    queryKey: ["day_progress_training", activeDog?.id, id],
    queryFn: async () => {
      const { data } = await supabase.from("day_progress").select("*")
        .eq("dog_id", activeDog!.id).eq("day_id", id).maybeSingle();
      return data;
    },
    enabled: !!activeDog && !!id,
  });

  const exercise = exercises[currentIndex] as any;
  const totalExercises = exercises.length;
  const completedExercises: string[] = progress?.completed_exercises || [];
  const isExDone = exercise ? completedExercises.includes(exercise.id) : false;
  const completedCount = completedExercises.filter((eid: string) => exercises.some((e: any) => e.id === eid)).length;
  const sessionPct = Math.round((completedCount / Math.max(totalExercises, 1)) * 100);

  const completeExercise = useCallback(async () => {
    if (!exercise || !activeDog || !user) return;
    try {
      if (!isExDone) {
        const newCompleted = [...completedExercises, exercise.id];
        await upsertDayProgress(activeDog.id, user.id, id, {
          completed_exercises: newCompleted,
          status: newCompleted.length >= totalExercises ? "done" : "in_progress",
        });
      }
      await supabase.from("exercise_sessions").insert({
        dog_id: activeDog.id, user_id: user.id, day_id: id,
        exercise_id: exercise.id, repetitions_done: reps, completed: true,
      });
      await refetch();
      toast({ title: "✓ Exercice terminé", description: exercise.name });
      if (currentIndex < totalExercises - 1) {
        setCurrentIndex(currentIndex + 1);
        setReps(0);
        setShowSteps(false);
      }
    } catch (err: any) {
      console.error("Exercise completion error:", err);
      toast({ title: "Erreur", description: "Impossible de valider l'exercice. Réessayez.", variant: "destructive" });
    }
  }, [isExDone, completedExercises, exercise, id, reps, currentIndex, totalExercises, activeDog, user, refetch]);

  const goNext = () => { if (currentIndex < totalExercises - 1) { setCurrentIndex(currentIndex + 1); setReps(0); setShowSteps(false); } };
  const goPrev = () => { if (currentIndex > 0) { setCurrentIndex(currentIndex - 1); setReps(0); setShowSteps(false); } };

  if (!activeDog) {
    return (
      <AppLayout>
        <NoActiveDogState
          title="Séance d'entraînement"
          description="Sélectionnez un chien pour démarrer sa séance du jour."
        />
      </AppLayout>
    );
  }

  if ((!standardDay && !planDay) || exercises.length === 0 || !exercise) {
    return (
      <AppLayout>
        <div className="pt-4 text-center space-y-4">
          <p className="text-muted-foreground">Jour non trouvé ou aucun exercice.</p>
          <Button variant="outline" onClick={() => navigate("/plan")}>Voir le plan</Button>
        </div>
      </AppLayout>
    );
  }

  const backUrl = source === "plan" ? `/day/${id}?source=plan` : `/day/${id}`;
  const allDone = completedCount >= totalExercises;
  const hasSteps = exercise.tutorialSteps && exercise.tutorialSteps.length > 0;
  const hasDescription = exercise.description && exercise.description.length > 0;

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-4 pt-4">
        {/* Premium day journey header keeps continuity with DayDetail */}
        <DayJourneyHeader
          dayId={id}
          totalDays={28}
          week={(planDay as any)?.week ?? standardDay?.week}
          state={progress?.validated ? "done" : (allDone ? "done" : (completedCount > 0 ? "in_progress" : "in_progress"))}
          completion={totalExercises > 0 ? completedCount / totalExercises : 0}
          hasPrev={id > 1}
          hasNext={id < 28 && (progress?.validated ?? false)}
          source={source}
        />

        {/* Quick header — focused session controls */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(backUrl)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Vue du jour
          </button>
          <span className="text-xs font-bold text-primary">Exercice {currentIndex + 1}/{totalExercises}</span>
        </div>

        <Progress value={sessionPct} className="h-2" />

        {/* Exercise card — enriched */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">{exercise.name}</h2>
            {isExDone && (
              <span className="flex items-center gap-1 text-xs font-semibold text-success">
                <CheckCircle2 className="h-4 w-4" /> Fait
              </span>
            )}
          </div>

          {hasDescription && (
            <p className="text-sm text-muted-foreground leading-relaxed">{exercise.description}</p>
          )}

          {exercise.instructions && (
            <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">
              {exercise.instructions}
            </div>
          )}

          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>🎯 {exercise.repetitionsTarget} rép.</span>
            {exercise.timerSuggested && <span>⏱ {exercise.timerSuggested}s</span>}
          </div>

          {hasSteps && (
            <div>
              <button
                onClick={() => setShowSteps(!showSteps)}
                className="flex items-center gap-1 text-xs font-medium text-primary"
              >
                <ChevronDown className={`h-3 w-3 transition-transform ${showSteps ? "rotate-180" : ""}`} />
                {showSteps ? "Masquer le guide détaillé" : "Voir le guide détaillé"}
              </button>

              {showSteps && (
                <div className="mt-2 space-y-2">
                  {exercise.tutorialSteps.map((step: any, i: number) => (
                    <div key={i} className="rounded-xl bg-muted/50 p-3 space-y-1">
                      <p className="text-xs font-semibold text-foreground">
                        {i + 1}. {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                      {step.tip && (
                        <p className="text-xs text-primary italic">💡 {step.tip}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {exercise.validationProtocol && (
            <div className="rounded-xl bg-success/5 border border-success/20 p-3">
              <p className="text-xs font-semibold text-success">✓ Critère de réussite</p>
              <p className="text-xs text-foreground mt-0.5">{exercise.validationProtocol}</p>
            </div>
          )}

          {exercise.slug && (
            <Link to={`/exercises/${exercise.slug}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
              <BookOpen className="h-3 w-3" />
              Voir la fiche complète
            </Link>
          )}
        </div>

        {/* Timer */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <Timer presets={exercise.timerSuggested ? [30, exercise.timerSuggested, 180] : [30, 60, 180]} />
        </div>

        {/* Repetition counter */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-center text-xs text-muted-foreground mb-3">Compteur de répétitions</p>
          <div className="flex items-center justify-center gap-8">
            <Button variant="outline" onClick={() => setReps(Math.max(0, reps - 1))} className="h-16 w-16 rounded-2xl p-0">
              <Minus className="h-7 w-7" />
            </Button>
            <div className="text-center">
              <span className="text-5xl font-bold tabular-nums text-foreground">{reps}</span>
              <p className="text-xs text-muted-foreground mt-1">/ {exercise.repetitionsTarget}</p>
            </div>
            <Button onClick={() => setReps(reps + 1)} className="h-16 w-16 rounded-2xl p-0">
              <Plus className="h-7 w-7" />
            </Button>
          </div>
        </div>

        {/* Main CTA */}
        <Button className="w-full h-16 rounded-2xl bg-success hover:bg-success/90 text-success-foreground text-lg font-bold" onClick={completeExercise}>
          <CheckCircle2 className="h-6 w-6" /> Terminer
        </Button>

        {/* Nav */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={goPrev} disabled={currentIndex === 0}>
            <ChevronLeft className="h-4 w-4" /> Précédent
          </Button>
          <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={goNext} disabled={currentIndex === totalExercises - 1}>
            Suivant <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* All done */}
        {allDone && (
          <div className="rounded-2xl border-2 border-success/30 bg-success/5 p-5 space-y-4 animate-fade-in">
            <div className="text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
              <p className="text-base font-bold text-success">Séance terminée !</p>
              <p className="text-xs text-muted-foreground">
                Comment était votre chien pendant cette séance ?
              </p>
            </div>

            <ZoneSelector
              value={sessionZone}
              onChange={async (z) => {
                setSessionZone(z);
                if (!z || !activeDog) return;
                setZoneSaving(true);
                try {
                  const { data: lastSession } = await supabase
                    .from("exercise_sessions")
                    .select("id")
                    .eq("dog_id", activeDog.id)
                    .eq("day_id", id)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();
                  if (lastSession?.id) {
                    await supabase
                      .from("exercise_sessions")
                      .update({ zone_state: z })
                      .eq("id", lastSession.id);
                  }
                  toast({
                    title: "Zone enregistrée",
                    description: `Cette séance : ${z === "green" ? "🟢 verte" : z === "orange" ? "🟠 orange" : "🔴 rouge"}`,
                  });
                } catch {
                  toast({ title: "Erreur", description: "Zone non sauvegardée.", variant: "destructive" });
                } finally {
                  setZoneSaving(false);
                }
              }}
              label="Zone observée pendant la séance"
            />
            {sessionZone && (
              <div className="flex justify-center">
                <ZoneBadge zone={sessionZone} size="md" />
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => navigate(`/behavior/${id}`)} disabled={zoneSaving}>
                Suivi détaillé
              </Button>
              <Button className="flex-1 rounded-xl" onClick={() => navigate(backUrl)} disabled={zoneSaving}>
                Retour au jour
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
