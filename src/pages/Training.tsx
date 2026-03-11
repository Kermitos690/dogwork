import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Minus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { Timer } from "@/components/Timer";
import { getDayById } from "@/data/program";
import { useActiveDog } from "@/hooks/useDogs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function Training() {
  const { dayId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeDog = useActiveDog();
  const id = Number(dayId);
  const day = getDayById(id);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reps, setReps] = useState(0);

  const { data: progress, refetch } = useQuery({
    queryKey: ["day_progress_training", activeDog?.id, id],
    queryFn: async () => {
      const { data } = await supabase
        .from("day_progress")
        .select("*")
        .eq("dog_id", activeDog!.id)
        .eq("day_id", id)
        .single();
      return data;
    },
    enabled: !!activeDog && !!id,
  });

  const exercises = day?.exercises || [];
  const exercise = exercises[currentIndex];
  const totalExercises = exercises.length;
  const completedExercises: string[] = progress?.completed_exercises || [];

  const isExDone = exercise ? completedExercises.includes(exercise.id) : false;
  const completedCount = completedExercises.filter((eid) =>
    exercises.some((e) => e.id === eid)
  ).length;

  const completeExercise = useCallback(async () => {
    if (!exercise || !activeDog || !user) return;
    if (!isExDone) {
      const newCompleted = [...completedExercises, exercise.id];
      if (progress) {
        await supabase.from("day_progress").update({
          completed_exercises: newCompleted,
          status: "in_progress",
        }).eq("id", progress.id);
      } else {
        await supabase.from("day_progress").insert({
          dog_id: activeDog.id, user_id: user.id, day_id: id,
          completed_exercises: newCompleted, status: "in_progress",
        });
      }
    }
    // Save session
    await supabase.from("exercise_sessions").insert({
      dog_id: activeDog.id, user_id: user.id, day_id: id,
      exercise_id: exercise.id, repetitions_done: reps, completed: true,
    });
    refetch();
    if (currentIndex < totalExercises - 1) {
      setCurrentIndex(currentIndex + 1);
      setReps(0);
    }
  }, [isExDone, completedExercises, progress, exercise, id, reps, currentIndex, totalExercises, activeDog, user, refetch]);

  const sessionPct = Math.round((completedCount / Math.max(totalExercises, 1)) * 100);

  if (!day || !exercise) return <AppLayout><p className="pt-10 text-center">Jour non trouvé</p></AppLayout>;

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-5 pt-4">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(`/day/${id}`)} className="flex items-center gap-1 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Jour {id}
          </button>
          <span className="text-xs text-muted-foreground">{currentIndex + 1}/{totalExercises}</span>
        </div>

        <div className="h-2 rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${sessionPct}%` }} />
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{exercise.name}</h2>
            {isExDone && <span className="text-success text-xs font-medium">✓ Fait</span>}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{exercise.instructions}</p>
          {exercise.repetitionsTarget > 1 && (
            <p className="text-xs text-muted-foreground">Objectif : {exercise.repetitionsTarget} répétitions</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 text-center text-sm font-medium text-muted-foreground">Démarrer le chronomètre</h3>
          <Timer presets={exercise.timerSuggested ? [30, exercise.timerSuggested, 180] : [30, 60, 180]} />
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 text-center text-sm font-medium text-muted-foreground">Compteur de répétitions</h3>
          <div className="flex items-center justify-center gap-6">
            <Button variant="outline" onClick={() => setReps(Math.max(0, reps - 1))} className="h-14 w-14 rounded-full p-0">
              <Minus className="h-6 w-6" />
            </Button>
            <div className="text-center">
              <span className="text-4xl font-bold tabular-nums">{reps}</span>
              <p className="text-xs text-muted-foreground">/ {exercise.repetitionsTarget}</p>
            </div>
            <Button onClick={() => setReps(reps + 1)} className="h-14 w-14 rounded-full p-0">
              <Plus className="h-6 w-6" />
            </Button>
          </div>
        </div>

        <Button className="w-full h-12 bg-success hover:bg-success/90 text-success-foreground" onClick={completeExercise}>
          <CheckCircle2 className="h-5 w-5" /> Terminer l'exercice
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => { if (currentIndex > 0) { setCurrentIndex(currentIndex - 1); setReps(0); } }} disabled={currentIndex === 0}>
            <ChevronLeft className="h-4 w-4" /> Précédent
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => { if (currentIndex < totalExercises - 1) { setCurrentIndex(currentIndex + 1); setReps(0); } }} disabled={currentIndex === totalExercises - 1}>
            Suivant <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
