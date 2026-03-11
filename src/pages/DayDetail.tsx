import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Play, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { getDayById } from "@/data/program";
import { useActiveDog } from "@/hooks/useDogs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function DayDetail() {
  const { dayId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeDog = useActiveDog();
  const qc = useQueryClient();
  const id = Number(dayId);
  const day = getDayById(id);
  const [notes, setNotes] = useState("");

  const { data: progress, refetch } = useQuery({
    queryKey: ["day_progress", activeDog?.id, id],
    queryFn: async () => {
      const { data } = await supabase
        .from("day_progress")
        .select("*")
        .eq("dog_id", activeDog!.id)
        .eq("day_id", id)
        .single();
      return data;
    },
    enabled: !!activeDog,
  });

  useEffect(() => {
    if (progress?.notes) setNotes(progress.notes);
  }, [progress]);

  if (!day) return <AppLayout><p className="pt-10 text-center">Jour non trouvé</p></AppLayout>;
  if (!activeDog) return <AppLayout><p className="pt-10 text-center">Ajoutez d'abord un chien.</p></AppLayout>;

  const completedExercises: string[] = progress?.completed_exercises || [];
  const status = progress?.status || "todo";

  const toggleExercise = async (exId: string) => {
    const newCompleted = completedExercises.includes(exId)
      ? completedExercises.filter((e) => e !== exId)
      : [...completedExercises, exId];
    const newStatus = newCompleted.length > 0 ? "in_progress" : "todo";

    if (progress) {
      await supabase.from("day_progress").update({
        completed_exercises: newCompleted,
        status: progress.validated ? "done" : newStatus,
      }).eq("id", progress.id);
    } else {
      await supabase.from("day_progress").insert({
        dog_id: activeDog.id,
        user_id: user!.id,
        day_id: id,
        completed_exercises: newCompleted,
        status: newStatus,
      });
    }
    refetch();
  };

  const markInProgress = async () => {
    if (progress) {
      await supabase.from("day_progress").update({ status: "in_progress" }).eq("id", progress.id);
    } else {
      await supabase.from("day_progress").insert({
        dog_id: activeDog.id, user_id: user!.id, day_id: id, status: "in_progress",
      });
    }
    refetch();
  };

  const validateDay = async () => {
    if (progress) {
      await supabase.from("day_progress").update({ status: "done", validated: true, notes }).eq("id", progress.id);
    } else {
      await supabase.from("day_progress").insert({
        dog_id: activeDog.id, user_id: user!.id, day_id: id, status: "done", validated: true, notes,
      });
    }
    refetch();
    qc.invalidateQueries({ queryKey: ["day_progress"] });
  };

  const saveNotes = async () => {
    if (progress) {
      await supabase.from("day_progress").update({ notes }).eq("id", progress.id);
    } else {
      await supabase.from("day_progress").insert({
        dog_id: activeDog.id, user_id: user!.id, day_id: id, notes,
      });
    }
    refetch();
  };

  const completedCount = completedExercises.length;
  const totalExercises = day.exercises.length;
  const exercisePct = Math.round((completedCount / totalExercises) * 100);

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-5 pt-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>

        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Jour {day.id} — Semaine {day.week}</p>
            <h1 className="text-xl font-bold">{day.title}</h1>
          </div>
          <StatusBadge status={status} />
        </div>

        <p className="text-sm text-muted-foreground">{day.objective}</p>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-muted px-3 py-1 text-xs">⏱ {day.duration}</span>
          <span className="rounded-full bg-muted px-3 py-1 text-xs">📊 {day.difficulty}</span>
          {day.functions.map((f) => (
            <span key={f} className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary font-medium">{f}</span>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Exercices</span>
            <span className="text-muted-foreground">{completedCount}/{totalExercises} ({exercisePct}%)</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-muted">
            <div className="h-full rounded-full bg-success transition-all" style={{ width: `${exercisePct}%` }} />
          </div>
        </div>

        <div className="space-y-2">
          {day.exercises.map((ex, i) => {
            const done = completedExercises.includes(ex.id);
            return (
              <button
                key={ex.id}
                onClick={() => toggleExercise(ex.id)}
                className={`card-press flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                  done ? "border-success/30 bg-success/5" : "border-border bg-card"
                }`}
              >
                <div className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                  done ? "bg-success border-success animate-bounce-check" : "border-muted-foreground/30"
                }`}>
                  {done && <CheckCircle2 className="h-4 w-4 text-success-foreground" />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : ""}`}>{ex.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{ex.instructions}</p>
                  <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
                    <span>×{ex.repetitionsTarget} rép.</span>
                    {ex.timerSuggested && <span>⏱ {ex.timerSuggested}s</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-zone-orange/30 bg-warning/5 p-4">
          <p className="text-sm font-medium text-warning">⚠️ Point de vigilance</p>
          <p className="mt-1 text-sm text-foreground">{day.vigilance}</p>
        </div>

        <div className="rounded-xl border border-success/30 bg-success/5 p-4">
          <p className="text-sm font-medium text-success">✅ Critère de validation</p>
          <p className="mt-1 text-sm text-foreground">{day.validationCriteria}</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Notes du jour</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Vos observations, réussites, difficultés..."
            className="w-full rounded-xl border border-border bg-card p-3 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button variant="outline" size="sm" onClick={saveNotes}>Enregistrer mes notes</Button>
        </div>

        <div className="flex flex-col gap-2 pb-4">
          <Button className="w-full h-12" onClick={() => navigate(`/training/${day.id}`)}>
            <Play className="h-5 w-5" /> Mode entraînement
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate(`/behavior/${day.id}`)}>
            Suivi comportemental
          </Button>
          {!progress?.validated && status !== "in_progress" && (
            <Button variant="secondary" className="w-full" onClick={markInProgress}>Marquer en cours</Button>
          )}
          {!progress?.validated && (
            <Button className="w-full h-12 bg-success hover:bg-success/90 text-success-foreground" onClick={validateDay}>
              <CheckCircle2 className="h-5 w-5" /> Valider ce jour
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
