import { useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Minus, CheckCircle2, Play, Pause, RotateCcw } from "lucide-react";
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
        id: e.id || `plan-ex-${i}`, name: e.name, instructions: e.instructions,
        repetitionsTarget: e.repetitions, timerSuggested: e.timerSeconds, dayId: id,
      }))
    : [];

  // Fall back to standard exercises when plan day exists but has no exercises
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

  const exercise = exercises[currentIndex];
  const totalExercises = exercises.length;
  const completedExercises: string[] = progress?.completed_exercises || [];
  const isExDone = exercise ? completedExercises.includes(exercise.id) : false;
  const completedCount = completedExercises.filter((eid: string) => exercises.some((e: any) => e.id === eid)).length;
  const sessionPct = Math.round((completedCount / Math.max(totalExercises, 1)) * 100);

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

  const goNext = () => { if (currentIndex < totalExercises - 1) { setCurrentIndex(currentIndex + 1); setReps(0); } };
  const goPrev = () => { if (currentIndex > 0) { setCurrentIndex(currentIndex - 1); setReps(0); } };

  if ((!standardDay && !planDay) || exercises.length === 0 || !exercise) {
    return (
      <AppLayout>
        <div className="pt-10 text-center space-y-4">
          <p className="text-muted-foreground">Jour non trouvé ou aucun exercice.</p>
          <Button variant="outline" onClick={() => navigate("/plan")}>Voir le plan</Button>
        </div>
      </AppLayout>
    );
  }

  const backUrl = source === "plan" ? `/day/${id}?source=plan` : `/day/${id}`;
  const allDone = completedCount >= totalExercises;

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-4 pt-4">
        {/* Minimal header */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(backUrl)} className="flex items-center gap-1 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Jour {id}
          </button>
          <span className="text-xs font-bold text-primary">{currentIndex + 1}/{totalExercises}</span>
        </div>

        {/* Session progress */}
        <Progress value={sessionPct} className="h-2" />

        {/* Exercise card — large and clear */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">{exercise.name}</h2>
            {isExDone && (
              <span className="flex items-center gap-1 text-xs font-semibold text-success">
                <CheckCircle2 className="h-4 w-4" /> Fait
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{(exercise as any).instructions}</p>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>🎯 {exercise.repetitionsTarget} rép.</span>
            {exercise.timerSuggested && <span>⏱ {exercise.timerSuggested}s</span>}
          </div>
        </div>

        {/* Timer — big and centered */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <Timer presets={exercise.timerSuggested ? [30, exercise.timerSuggested, 180] : [30, 60, 180]} />
        </div>

        {/* Repetition counter — big buttons */}
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
          <div className="rounded-2xl border-2 border-success/30 bg-success/5 p-5 text-center space-y-3 animate-fade-in">
            <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
            <p className="text-base font-bold text-success">Séance terminée !</p>
            <p className="text-xs text-muted-foreground">Pensez au suivi comportemental.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => navigate(`/behavior/${id}`)}>
                Suivi
              </Button>
              <Button className="flex-1 rounded-xl" onClick={() => navigate(backUrl)}>
                Retour au jour
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
