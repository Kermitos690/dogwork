import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Play, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { getDayById } from "@/data/program";
import { getDayProgress, saveDayProgress, getSettings, saveSettings } from "@/lib/storage";
import type { DayProgress } from "@/types";

export default function DayDetail() {
  const { dayId } = useParams();
  const navigate = useNavigate();
  const id = Number(dayId);
  const day = getDayById(id);
  const [progress, setProgress] = useState<DayProgress | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const p = getDayProgress(id);
    if (p) { setProgress(p); setNotes(p.notes); }
    else {
      const init: DayProgress = { dayId: id, status: "todo", completedExercises: [], notes: "", validated: false, lastUpdated: new Date().toISOString() };
      setProgress(init);
    }
  }, [id]);

  if (!day || !progress) return <Layout><p className="pt-10 text-center">Jour non trouvé</p></Layout>;

  const toggleExercise = (exId: string) => {
    const updated = { ...progress };
    if (updated.completedExercises.includes(exId)) {
      updated.completedExercises = updated.completedExercises.filter((e) => e !== exId);
    } else {
      updated.completedExercises = [...updated.completedExercises, exId];
    }
    if (updated.status === "todo") updated.status = "in_progress";
    setProgress(updated);
    saveDayProgress(updated);
  };

  const markInProgress = () => {
    const updated = { ...progress, status: "in_progress" as const };
    setProgress(updated);
    saveDayProgress(updated);
  };

  const validateDay = () => {
    const updated = { ...progress, status: "done" as const, validated: true, notes };
    setProgress(updated);
    saveDayProgress(updated);
    // Advance current day
    const settings = getSettings();
    if (settings.currentDay === id && id < 28) {
      saveSettings({ ...settings, currentDay: id + 1 });
    }
  };

  const saveNotes = () => {
    const updated = { ...progress, notes };
    setProgress(updated);
    saveDayProgress(updated);
  };

  const completedCount = progress.completedExercises.length;
  const totalExercises = day.exercises.length;
  const exercisePct = Math.round((completedCount / totalExercises) * 100);

  return (
    <Layout>
      <div className="animate-fade-in space-y-5 pt-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>

        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Jour {day.id} — Semaine {day.week}</p>
            <h1 className="text-xl font-bold">{day.title}</h1>
          </div>
          <StatusBadge status={progress.status} />
        </div>

        <p className="text-sm text-muted-foreground">{day.objective}</p>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-muted px-3 py-1 text-xs">⏱ {day.duration}</span>
          <span className="rounded-full bg-muted px-3 py-1 text-xs">📊 {day.difficulty}</span>
          {day.functions.map((f) => (
            <span key={f} className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary font-medium">{f}</span>
          ))}
        </div>

        {/* Progress */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Exercices</span>
            <span className="text-muted-foreground">{completedCount}/{totalExercises} ({exercisePct}%)</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-muted">
            <div className="h-full rounded-full bg-success transition-all" style={{ width: `${exercisePct}%` }} />
          </div>
        </div>

        {/* Exercises */}
        <div className="space-y-2">
          {day.exercises.map((ex) => {
            const done = progress.completedExercises.includes(ex.id);
            return (
              <button
                key={ex.id}
                onClick={() => toggleExercise(ex.id)}
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                  done ? "border-success/30 bg-success/5" : "border-border bg-card"
                }`}
              >
                <div className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                  done ? "bg-success border-success" : "border-muted-foreground/30"
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

        {/* Vigilance */}
        <div className="rounded-xl border border-zone-orange/30 bg-warning/5 p-4">
          <p className="text-sm font-medium text-warning">⚠️ Point de vigilance</p>
          <p className="mt-1 text-sm text-foreground">{day.vigilance}</p>
        </div>

        {/* Validation criteria */}
        <div className="rounded-xl border border-success/30 bg-success/5 p-4">
          <p className="text-sm font-medium text-success">✅ Critère de validation</p>
          <p className="mt-1 text-sm text-foreground">{day.validationCriteria}</p>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Notes du jour</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Vos observations, réussites, difficultés..."
            className="w-full rounded-xl border border-border bg-card p-3 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button variant="outline" size="sm" onClick={saveNotes}>
            Enregistrer mes notes
          </Button>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pb-4">
          <Button size="xl" className="w-full" onClick={() => navigate(`/training/${day.id}`)}>
            <Play className="h-5 w-5" /> Mode entraînement
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate(`/behavior/${day.id}`)}>
            Suivi comportemental
          </Button>
          {!progress.validated && progress.status !== "in_progress" && (
            <Button variant="secondary" className="w-full" onClick={markInProgress}>
              Marquer en cours
            </Button>
          )}
          {!progress.validated && (
            <Button variant="success" size="xl" className="w-full" onClick={validateDay}>
              <CheckCircle2 className="h-5 w-5" /> Valider ce jour
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
}
