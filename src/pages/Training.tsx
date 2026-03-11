import { useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Minus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

  // Fetch personalized plan day if source=plan
  const { data: planDay } = useQuery({
    queryKey: ["training_plan_day", activeDog?.id, id],
    queryFn: async () => {
      const { data } = await supabase
        .from("training_plans")
        .select("days")
        .eq("dog_id", activeDog!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data?.days) return null;
      const days = data.days as PlanDay[];
      return days.find(d => d.dayNumber === id) || null;
    },
    enabled: !!activeDog && source === "plan",
  });

  const standardDay = getDayById(id);
  const isPersonalized = source === "plan" && planDay;

  // Normalize exercises
  const exercises = isPersonalized
    ? planDay.exercises.map((e: any, i: number) => ({
        id: e.id || `plan-ex-${i}`,
        name: e.name,
        instructions: e.instructions,
        repetitionsTarget: e.repetitions,
        timerSuggested: e.timerSeconds,
        dayId: id,
      }))
    : standardDay?.exercises || [];

  const { data: progress, refetch } = useQuery({
    queryKey: ["day_progress_training", activeDog?.id, id],
    queryFn: async () => {
      const { data } = await supabase
        .from("day_progress")
        .select("*")
        .eq("dog_id", activeDog!.id)
        .eq("day_id", id)
        .maybeSingle();
      return data;
    },
    enabled: !!activeDog && !!id,
  });

  const exercise = exercises[currentIndex];
  const totalExercises = exercises.length;
  const completedExercises: string[] = progress?.completed_exercises || [];

  const isExDone = exercise ? completedExercises.includes(exercise.id) : false;
  const completedCount = completedExercises.filter((eid: string) =>
    exercises.some((e: any) => e.id === eid)
  ).length;

  const completeExercise = useCallback(async () => {
    if (!exercise || !activeDog || !user) return;
    if (!isExDone) {
      const newCompleted = [...completedExercises, exercise.id];
      if (progress) {
        await supabase.from("day_progress").update({
          completed_exercises: newCompleted,
          status: newCompleted.length >= totalExercises ? "done" : "in_progress",
        }).eq("id", progress.id);
      } else {
        await supabase.from("day_progress").insert({
          dog_id: activeDog.id, user_id: user.id, day_id: id,
          completed_exercises: newCompleted, status: "in_progress",
        });
      }
    }
    await supabase.from("exercise_sessions").insert({
      dog_id: activeDog.id, user_id: user.id, day_id: id,
      exercise_id: exercise.id, repetitions_done: reps, completed: true,
    });
    refetch();
    toast({ title: "✓ Exercice terminé", description: exercise.name });
    if (currentIndex < totalExercises - 1) {
      setCurrentIndex(currentIndex + 1);
      setReps(0);
    }
  }, [isExDone, completedExercises, progress, exercise, id, reps, currentIndex, totalExercises, activeDog, user, refetch]);

  const goNext = () => {
    if (currentIndex < totalExercises - 1) {
      setCurrentIndex(currentIndex + 1);
      setReps(0);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setReps(0);
    }
  };

  const sessionPct = Math.round((completedCount / Math.max(totalExercises, 1)) * 100);

  if ((!standardDay && !planDay) || !exercise) {
    return (
      <AppLayout>
        <div className="pt-10 text-center space-y-4">
          <p className="text-muted-foreground">Jour non trouvé ou aucun exercice disponible.</p>
          <Button variant="outline" onClick={() => navigate("/plan")}>Voir le plan</Button>
        </div>
      </AppLayout>
    );
  }

  const backUrl = source === "plan" ? `/day/${id}?source=plan` : `/day/${id}`;

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-4 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(backUrl)} className="flex items-center gap-1 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Jour {id}
          </button>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Mode entraînement</p>
            <p className="text-xs font-semibold text-primary">{currentIndex + 1}/{totalExercises}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <Progress value={sessionPct} className="h-2.5" />
          <p className="text-xs text-muted-foreground text-right">{completedCount}/{totalExercises} terminé(s)</p>
        </div>

        {/* Exercise card */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">{exercise.name}</h2>
            {isExDone && (
              <span className="flex items-center gap-1 text-xs font-medium text-success">
                <CheckCircle2 className="h-4 w-4" /> Fait
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{exercise.instructions}</p>
          {exercise.repetitionsTarget > 1 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>🎯 Objectif : {exercise.repetitionsTarget} répétitions</span>
              {exercise.timerSuggested && <span>⏱ {exercise.timerSuggested}s</span>}
            </div>
          )}
        </div>

        {/* Timer */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 text-center text-sm font-medium text-muted-foreground">Chronomètre</h3>
          <Timer presets={exercise.timerSuggested ? [30, exercise.timerSuggested, 180] : [30, 60, 180]} />
        </div>

        {/* Repetition counter */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 text-center text-sm font-medium text-muted-foreground">Compteur de répétitions</h3>
          <div className="flex items-center justify-center gap-6">
            <Button variant="outline" onClick={() => setReps(Math.max(0, reps - 1))} className="h-14 w-14 rounded-full p-0">
              <Minus className="h-6 w-6" />
            </Button>
            <div className="text-center">
              <span className="text-4xl font-bold tabular-nums text-foreground">{reps}</span>
              <p className="text-xs text-muted-foreground">/ {exercise.repetitionsTarget}</p>
            </div>
            <Button onClick={() => setReps(reps + 1)} className="h-14 w-14 rounded-full p-0">
              <Plus className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Action buttons */}
        <Button className="w-full h-14 bg-success hover:bg-success/90 text-success-foreground text-base font-semibold" onClick={completeExercise}>
          <CheckCircle2 className="h-5 w-5" /> Terminer l'exercice
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 h-12" onClick={goPrev} disabled={currentIndex === 0}>
            <ChevronLeft className="h-4 w-4" /> Précédent
          </Button>
          <Button variant="outline" className="flex-1 h-12" onClick={goNext} disabled={currentIndex === totalExercises - 1}>
            Suivant <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* All done? */}
        {completedCount >= totalExercises && (
          <Card className="border-success/30 bg-success/5">
            <div className="p-4 text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-success mx-auto" />
              <p className="text-sm font-semibold text-success">Séance terminée !</p>
              <p className="text-xs text-muted-foreground">Pensez à remplir le suivi comportemental.</p>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" className="flex-1" onClick={() => navigate(`/behavior/${id}`)}>
                  Suivi comportemental
                </Button>
                <Button className="flex-1" onClick={() => navigate(backUrl)}>
                  Retour au jour
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
