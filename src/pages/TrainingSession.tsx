import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  SkipForward,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  X,
  Sparkles,
  BookOpen,
  ListChecks,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveDog } from "@/hooks/useDogs";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { upsertDayProgress } from "@/lib/dayProgress";
import { getDayById } from "@/data/program";
import type { PlanDay } from "@/lib/planGenerator";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { QuickJournalSheet } from "@/components/training/QuickJournalSheet";
import { SessionInstructionsSheet } from "@/components/training/SessionInstructionsSheet";
import { SessionDayOutlineSheet } from "@/components/training/SessionDayOutlineSheet";
import { enqueue } from "@/lib/offlineQueue";
import { SyncStatusBadge } from "@/components/SyncStatusBadge";

type Result = "success" | "difficult" | "fail" | "skip";

interface SessionExercise {
  id: string;
  name: string;
  shortInstruction: string;
  repetitionsTarget: number;
  timerSeconds?: number;
  slug?: string;
}

const RESULT_META: Record<
  Result,
  {
    label: string;
    icon: typeof CheckCircle2;
    classes: string;
    vibrate: number | number[];
    toast: string;
  }
> = {
  success: {
    label: "Réussi",
    icon: CheckCircle2,
    classes: "bg-success text-success-foreground hover:bg-success/90",
    vibrate: 30,
    toast: "Bien joué",
  },
  difficult: {
    label: "Difficile",
    icon: AlertTriangle,
    classes: "bg-warning text-warning-foreground hover:bg-warning/90",
    vibrate: [20, 40, 20],
    toast: "Noté — on continue",
  },
  fail: {
    label: "Échec",
    icon: XCircle,
    classes: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    vibrate: [60, 40, 60],
    toast: "Ce n'est pas grave",
  },
  skip: {
    label: "Passer",
    icon: SkipForward,
    classes: "bg-muted text-muted-foreground hover:bg-muted/80",
    vibrate: 10,
    toast: "Exercice ignoré",
  },
};

/**
 * Field training mode — distraction-free, full-screen, one-exercise-per-screen.
 * Designed for outdoor use: large thumb targets, voice playback, vibration
 * feedback, auto-advance. Persists each result into exercise_sessions and
 * keeps day_progress aligned for the standard plan flow.
 */
export default function TrainingSession() {
  const { dayId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeDog = useActiveDog();
  const id = Number(dayId);
  const source = searchParams.get("source");
  const tts = useTextToSpeech();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [flash, setFlash] = useState<Result | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [journalOpen, setJournalOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [persisting, setPersisting] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  // Wall-clock fallback for duration tracking when no timer is configured.
  const exerciseStartedAtRef = useRef<number>(Date.now());
  // Tracks which exercise ids already produced an exercise_sessions row to
  // avoid duplicate inserts if the user double-taps a result button.
  const persistedIdsRef = useRef<Set<string>>(new Set());

  // Load personalized plan day if applicable, else fall back to standard.
  const { data: planDay, isLoading: planLoading } = useQuery({
    queryKey: ["session_plan_day", activeDog?.id, id],
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
      return (data.days as unknown as PlanDay[]).find((d) => d.dayNumber === id) || null;
    },
    enabled: !!activeDog && source === "plan",
  });

  const exercises = useMemo<SessionExercise[]>(() => {
    if (planDay) {
      return planDay.exercises.map((e: any, i: number) => ({
        // Stable id priority: slug (survives plan regeneration) → db id → index fallback.
        id: e.slug || e.id || `plan-ex-${id}-${i}`,
        name: e.name,
        shortInstruction: trimToTwoLines(e.instructions || e.description || ""),
        repetitionsTarget: e.repetitions ?? 5,
        timerSeconds: e.timerSeconds,
        slug: e.slug,
      }));
    }
    const std = getDayById(id);
    return (std?.exercises || []).map((e: any, i: number) => ({
      id: e.slug || e.id || `std-ex-${id}-${i}`,
      name: e.name,
      shortInstruction: "",
      repetitionsTarget: e.repetitionsTarget ?? 5,
      timerSeconds: e.timerSuggested,
      slug: e.slug,
    }));
  }, [planDay, id]);

  const total = exercises.length;
  const exercise = exercises[currentIndex];
  const allDone = total > 0 && completedIds.length >= total;

  // Initialise timer + wall-clock when the active exercise changes.
  useEffect(() => {
    setTimerSeconds(exercise?.timerSeconds ?? null);
    setTimerRunning(false);
    exerciseStartedAtRef.current = Date.now();
  }, [currentIndex, exercise?.timerSeconds]);

  // Voice playback when toggled or exercise changes.
  useEffect(() => {
    if (!voiceEnabled || !exercise) return;
    const text = `${exercise.name}. ${exercise.shortInstruction}`;
    tts.speak(text);
    return () => tts.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceEnabled, currentIndex]);

  // Timer tick.
  useEffect(() => {
    if (!timerRunning || timerSeconds == null) return;
    intervalRef.current = setInterval(() => {
      setTimerSeconds((s) => {
        if (s == null) return s;
        if (s <= 1) {
          setTimerRunning(false);
          if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerRunning, timerSeconds]);

  // Cleanup on unmount: stop voice and timer.
  useEffect(() => {
    return () => {
      tts.stop();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistResult = useCallback(
    async (result: Result) => {
      if (!exercise || !activeDog || !user) return;
      // Guard against double-tap / re-entry: a single exercise must produce
      // at most one exercise_sessions row per visit.
      if (persistedIdsRef.current.has(exercise.id)) return;
      persistedIdsRef.current.add(exercise.id);

      const newCompleted = completedIds.includes(exercise.id)
        ? completedIds
        : [...completedIds, exercise.id];
      setCompletedIds(newCompleted);

      // duration_actual: prefer timer delta; otherwise fall back to wall-clock
      // since the exercise card was mounted (more accurate than null for stats).
      const wallClockSec = Math.max(
        1,
        Math.round((Date.now() - exerciseStartedAtRef.current) / 1000),
      );
      const durationActual = exercise.timerSeconds
        ? exercise.timerSeconds - (timerSeconds ?? exercise.timerSeconds)
        : wallClockSec;

      const sessionPayload = {
        dog_id: activeDog.id,
        user_id: user.id,
        day_id: id,
        exercise_id: exercise.id,
        repetitions_done: exercise.repetitionsTarget,
        duration_actual: durationActual,
        completed: result === "success" || result === "difficult",
      };

      // Offline path: queue everything and confirm locally. The replay
      // runner will flush when the network returns.
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        enqueue({ kind: "insert", table: "exercise_sessions", payload: sessionPayload });
        if (result !== "skip") {
          enqueue({
            kind: "upsertDayProgress",
            dogId: activeDog.id,
            userId: user.id,
            dayId: id,
            updates: {
              completed_exercises: newCompleted,
              status: newCompleted.length >= total ? "done" : "in_progress",
            },
          });
        }
        return;
      }

      try {
        const { error } = await supabase.from("exercise_sessions").insert(sessionPayload);
        if (error) throw error;
        if (result !== "skip") {
          await upsertDayProgress(activeDog.id, user.id, id, {
            completed_exercises: newCompleted,
            status: newCompleted.length >= total ? "done" : "in_progress",
          });
        }
      } catch (err: any) {
        const msg = String(err?.message || err);
        const looksOffline =
          msg.includes("Failed to fetch") ||
          msg.includes("NetworkError") ||
          msg.includes("network error");
        if (looksOffline) {
          // Network blip: queue both writes so the user keeps their flow.
          enqueue({ kind: "insert", table: "exercise_sessions", payload: sessionPayload });
          if (result !== "skip") {
            enqueue({
              kind: "upsertDayProgress",
              dogId: activeDog.id,
              userId: user.id,
              dayId: id,
              updates: {
                completed_exercises: newCompleted,
                status: newCompleted.length >= total ? "done" : "in_progress",
              },
            });
          }
          return;
        }
        // Roll back the dedupe guard so the user can retry.
        persistedIdsRef.current.delete(exercise.id);
        console.error("TrainingSession persist error:", err);
        toast({
          title: "Erreur",
          description: "Le résultat n'a pas pu être enregistré.",
          variant: "destructive",
        });
      }
    },
    [exercise, activeDog, user, id, completedIds, total, timerSeconds],
  );

  const handleResult = useCallback(
    (result: Result) => {
      // Block re-entry while a previous tap is still being persisted.
      if (persisting || flash) return;
      const meta = RESULT_META[result];
      if (navigator.vibrate) navigator.vibrate(meta.vibrate);
      setFlash(result);
      tts.stop();
      setPersisting(true);
      // Fire-and-forget: persistence runs in parallel with the flash so the
      // visual feedback stays snappy even on slow networks.
      void persistResult(result).finally(() => setPersisting(false));

      window.setTimeout(() => {
        setFlash(null);
        if (currentIndex < total - 1) {
          setCurrentIndex((i) => i + 1);
        }
      }, 380);
    },
    [persistResult, currentIndex, total, tts, persisting, flash],
  );

  const exitSession = () => {
    tts.stop();
    if (intervalRef.current) clearInterval(intervalRef.current);
    const back = source === "plan" ? `/day/${id}?source=plan` : `/day/${id}`;
    navigate(back);
  };

  // ─── Empty / loading states ────────────────────────────────────────
  if (!activeDog) {
    return (
      <FullscreenShell onExit={() => navigate("/dogs")}>
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">Aucun chien actif</p>
          <Button onClick={() => navigate("/dogs")}>Sélectionner un chien</Button>
        </div>
      </FullscreenShell>
    );
  }

  if (planLoading) {
    return (
      <FullscreenShell onExit={exitSession}>
        <p className="text-sm text-muted-foreground">Chargement de la séance…</p>
      </FullscreenShell>
    );
  }

  if (total === 0 || !exercise) {
    return (
      <FullscreenShell onExit={exitSession}>
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">Aucun exercice pour ce jour.</p>
          <Button variant="outline" onClick={exitSession}>
            Retour
          </Button>
        </div>
      </FullscreenShell>
    );
  }

  // ─── End-of-session screen ─────────────────────────────────────────
  if (allDone) {
    return (
      <FullscreenShell onExit={exitSession}>
        <div className="text-center space-y-6 max-w-sm">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-auto w-20 h-20 rounded-3xl bg-success/15 flex items-center justify-center"
          >
            <CheckCircle2 className="h-10 w-10 text-success" />
          </motion.div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Séance terminée</h1>
            <p className="text-sm text-muted-foreground">
              {completedIds.length}/{total} exercices enregistrés.
            </p>
          </div>
          <div className="space-y-2">
            <Button
              size="lg"
              className="w-full h-14 rounded-2xl text-base"
              onClick={() => setJournalOpen(true)}
            >
              <Sparkles className="h-5 w-5" /> Journal rapide
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full h-12 rounded-2xl"
              onClick={exitSession}
            >
              Retour au jour
            </Button>
          </div>
        </div>

        <QuickJournalSheet
          open={journalOpen}
          onOpenChange={setJournalOpen}
          dayId={id}
          onSaved={exitSession}
        />
      </FullscreenShell>
    );
  }

  const progressPct = Math.round((currentIndex / total) * 100);
  const flashMeta = flash ? RESULT_META[flash] : null;

  // ─── Active session screen ─────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[60] bg-background text-foreground flex flex-col overflow-hidden">
      {/* Top bar : Quitter · barre de progression · Voix */}
      <header className="px-3 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2 flex items-center justify-between gap-2">
        <button
          onClick={exitSession}
          aria-label="Quitter la séance"
          className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center active:scale-95 transition-transform shrink-0"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={false}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="mt-1 flex items-center justify-center gap-2">
            <p className="text-[10px] text-muted-foreground tabular-nums">
              J{id} · {currentIndex + 1} / {total}
            </p>
            <SyncStatusBadge compact />
          </div>
        </div>

        <button
          onClick={() => {
            if (voiceEnabled) {
              tts.stop();
              setVoiceEnabled(false);
            } else {
              setVoiceEnabled(true);
            }
          }}
          aria-label={voiceEnabled ? "Couper la voix" : "Activer la voix"}
          className={`h-10 w-10 rounded-full flex items-center justify-center active:scale-95 transition-all shrink-0 ${
            voiceEnabled ? "bg-primary text-primary-foreground" : "bg-muted/60 text-foreground"
          }`}
        >
          {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>
      </header>

      {/* Accès rapide : sommaire de la journée + consignes de l'exercice */}
      <div className="px-3 pb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOutlineOpen(true)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-card border border-border text-xs font-medium text-foreground active:scale-[0.98] transition-transform"
          aria-label="Voir le sommaire de la journée"
        >
          <ListChecks className="h-4 w-4 text-primary" />
          <span>Journée</span>
          <span className="text-muted-foreground tabular-nums">· {completedIds.length}/{total}</span>
        </button>
        <button
          type="button"
          onClick={() => setInstructionsOpen(true)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-primary/10 border border-primary/20 text-xs font-semibold text-primary active:scale-[0.98] transition-transform"
          aria-label="Voir les consignes de l'exercice"
        >
          <BookOpen className="h-4 w-4" />
          <span>Consignes</span>
        </button>
      </div>

      {/* Main content */}
      <main className="flex-1 px-5 pt-2 pb-4 flex flex-col items-center justify-center text-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={exercise.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-md space-y-4"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Exercice {currentIndex + 1}
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight text-foreground">
              {exercise.name}
            </h1>
            {exercise.shortInstruction && (
              <p className="text-base text-muted-foreground leading-relaxed line-clamp-2">
                {exercise.shortInstruction}
              </p>
            )}

            <div className="flex items-center justify-center gap-3 pt-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-3 py-1">
                🎯 {exercise.repetitionsTarget} rép.
              </span>
              {exercise.timerSeconds && (
                <span className="rounded-full bg-muted px-3 py-1">⏱ {exercise.timerSeconds}s</span>
              )}
            </div>

            {/* Timer */}
            {timerSeconds != null && (
              <div className="mt-2 rounded-3xl border border-border bg-card p-5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Minuteur
                </p>
                <p className="text-5xl font-bold tabular-nums my-2">
                  {formatTime(timerSeconds)}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-2xl"
                    onClick={() => setTimerRunning((r) => !r)}
                  >
                    {timerRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    {timerRunning ? "Pause" : "Lancer"}
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    className="h-12 rounded-2xl"
                    onClick={() => {
                      setTimerSeconds(exercise.timerSeconds ?? 0);
                      setTimerRunning(false);
                    }}
                    aria-label="Réinitialiser"
                  >
                    <RotateCcw className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Action bar */}
      <footer className="px-3 pb-[max(env(safe-area-inset-bottom),1rem)] pt-2 border-t border-border bg-background/80 backdrop-blur">
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(RESULT_META) as Result[]).map((r) => {
            const meta = RESULT_META[r];
            const Icon = meta.icon;
            return (
              <button
                key={r}
                onClick={() => handleResult(r)}
                className={`h-16 rounded-2xl flex flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-all active:scale-95 ${meta.classes}`}
              >
                <Icon className="h-5 w-5" />
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
      </footer>

      {/* Flash overlay */}
      <AnimatePresence>
        {flashMeta && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.96 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-none fixed inset-0 z-[70] flex items-center justify-center ${flashMeta.classes}`}
            aria-hidden
          >
            <flashMeta.icon className="h-20 w-20" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FullscreenShell({
  children,
  onExit,
}: {
  children: React.ReactNode;
  onExit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] bg-background text-foreground flex flex-col">
      <header className="px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-3 flex items-center justify-between">
        <button
          onClick={onExit}
          aria-label="Quitter"
          className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center active:scale-95"
        >
          <X className="h-5 w-5" />
        </button>
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          Mode terrain
        </span>
        <div className="w-10" />
      </header>
      <main className="flex-1 flex items-center justify-center px-6">{children}</main>
    </div>
  );
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(1, "0")}:${s.toString().padStart(2, "0")}`;
}

function trimToTwoLines(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 140) return cleaned;
  return cleaned.slice(0, 137).trimEnd() + "…";
}
