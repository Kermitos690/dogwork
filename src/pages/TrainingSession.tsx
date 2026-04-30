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
  Sun,
  Moon,
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
  // Outdoor mode: very high contrast (white-on-black, XL fonts) for sunlight readability.
  const [outdoor, setOutdoor] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("dw_training_outdoor") === "1";
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  // Wall-clock fallback for duration tracking when no timer is configured.
  const exerciseStartedAtRef = useRef<number>(Date.now());
  // Tracks which exercise ids already produced an exercise_sessions row to
  // avoid duplicate inserts if the user double-taps a result button.
  const persistedIdsRef = useRef<Set<string>>(new Set());

  // Persist the outdoor preference between sessions.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("dw_training_outdoor", outdoor ? "1" : "0");
  }, [outdoor]);

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
        shortInstruction: summarizeInstruction(e.instructions || e.description || ""),
        repetitionsTarget: e.repetitions ?? 5,
        timerSeconds: e.timerSeconds,
        slug: e.slug,
      }));
    }
    const std = getDayById(id);
    return (std?.exercises || []).map((e: any, i: number) => ({
      id: e.slug || e.id || `std-ex-${id}-${i}`,
      name: e.name,
      shortInstruction: summarizeInstruction(e.shortInstruction || e.description || ""),
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

  // Garde : URL invalide (ex. /training/session/undefined) → ne pas planter sur "Jour NaN".
  if (!Number.isFinite(id) || id < 1) {
    return (
      <FullscreenShell onExit={() => navigate("/plan")}>
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-sm text-muted-foreground">Séance introuvable. Reprenez depuis votre plan.</p>
          <Button onClick={() => navigate("/plan")}>Retour au plan</Button>
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

  // Outdoor mode = ultra-high-contrast (pure black bg + pure white text + saturated CTAs).
  // Designed for sunlight readability on field.
  const shellClass = outdoor
    ? "fixed inset-0 z-[60] bg-black text-white flex flex-col overflow-hidden"
    : "fixed inset-0 z-[60] bg-background text-foreground flex flex-col overflow-hidden";
  const iconBtnClass = outdoor
    ? "h-12 w-12 rounded-full bg-white/15 text-white flex items-center justify-center active:scale-95 transition-transform shrink-0 border border-white/30"
    : "h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center active:scale-95 transition-transform shrink-0";
  const trackClass = outdoor ? "h-2 rounded-full bg-white/25 overflow-hidden" : "h-1.5 rounded-full bg-muted overflow-hidden";
  const trackFillClass = outdoor ? "h-full bg-white" : "h-full bg-primary";
  const subtleTextClass = outdoor ? "text-white/85" : "text-muted-foreground";

  return (
    <div className={shellClass}>
      {/* Top bar : Quitter · barre de progression · Outdoor · Voix */}
      <header className="px-3 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2 flex items-center justify-between gap-2">
        <button
          onClick={exitSession}
          aria-label="Quitter la séance"
          className={iconBtnClass}
        >
          <X className={outdoor ? "h-6 w-6" : "h-5 w-5"} />
        </button>

        <div className="flex-1 min-w-0">
          <div className={trackClass}>
            <motion.div
              className={trackFillClass}
              initial={false}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="mt-1 flex items-center justify-center gap-2">
            <p className={`text-[11px] tabular-nums ${subtleTextClass}`}>
              J{id} · {currentIndex + 1} / {total}
            </p>
            <SyncStatusBadge compact />
          </div>
        </div>

        <button
          onClick={() => setOutdoor((v) => !v)}
          aria-label={outdoor ? "Mode normal" : "Mode extérieur (haut contraste)"}
          aria-pressed={outdoor}
          className={
            outdoor
              ? "h-12 w-12 rounded-full bg-white text-black flex items-center justify-center active:scale-95 transition-all shrink-0"
              : "h-10 w-10 rounded-full bg-muted/60 text-foreground flex items-center justify-center active:scale-95 transition-all shrink-0"
          }
        >
          {outdoor ? <Sun className="h-6 w-6" /> : <Moon className="h-5 w-5" />}
        </button>

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
          className={
            outdoor
              ? `${voiceEnabled ? "bg-white text-black" : "bg-white/15 text-white border border-white/30"} h-12 w-12 rounded-full flex items-center justify-center active:scale-95 transition-all shrink-0`
              : `${voiceEnabled ? "bg-primary text-primary-foreground" : "bg-muted/60 text-foreground"} h-10 w-10 rounded-full flex items-center justify-center active:scale-95 transition-all shrink-0`
          }
        >
          {voiceEnabled
            ? <Volume2 className={outdoor ? "h-6 w-6" : "h-5 w-5"} />
            : <VolumeX className={outdoor ? "h-6 w-6" : "h-5 w-5"} />}
        </button>
      </header>

      {/* Accès rapide : sommaire de la journée + consignes de l'exercice */}
      <div className="px-3 pb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOutlineOpen(true)}
          className={
            outdoor
              ? "flex-1 inline-flex items-center justify-center gap-1.5 h-11 rounded-xl bg-white/10 border border-white/30 text-sm font-semibold text-white active:scale-[0.98] transition-transform"
              : "flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-card border border-border text-xs font-medium text-foreground active:scale-[0.98] transition-transform"
          }
          aria-label="Voir le sommaire de la journée"
        >
          <ListChecks className={outdoor ? "h-5 w-5 text-white" : "h-4 w-4 text-primary"} />
          <span>Journée</span>
          <span className={outdoor ? "text-white/80 tabular-nums" : "text-muted-foreground tabular-nums"}>· {completedIds.length}/{total}</span>
        </button>
        <button
          type="button"
          onClick={() => setInstructionsOpen(true)}
          className={
            outdoor
              ? "flex-1 inline-flex items-center justify-center gap-1.5 h-11 rounded-xl bg-white text-black text-sm font-bold active:scale-[0.98] transition-transform"
              : "flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-primary/10 border border-primary/20 text-xs font-semibold text-primary active:scale-[0.98] transition-transform"
          }
          aria-label="Voir les consignes complètes de l'exercice"
        >
          <BookOpen className={outdoor ? "h-5 w-5" : "h-4 w-4"} />
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
            <p className={`text-xs uppercase tracking-[0.2em] ${subtleTextClass}`}>
              Exercice {currentIndex + 1}
            </p>
            <h1 className={
              outdoor
                ? "text-4xl sm:text-5xl font-black leading-tight text-white"
                : "text-3xl sm:text-4xl font-bold leading-tight text-foreground"
            }>
              {exercise.name}
            </h1>
            {exercise.shortInstruction && (
              <p
                className={
                  outdoor
                    ? "text-lg sm:text-xl text-white leading-relaxed font-medium"
                    : "text-base text-muted-foreground leading-relaxed"
                }
                title={exercise.shortInstruction}
              >
                {/* Résumé sans coupure de mot ni ellipse au milieu d'une phrase. */}
                {exercise.shortInstruction}
              </p>
            )}

            <div className={`flex items-center justify-center gap-3 pt-2 text-sm ${subtleTextClass}`}>
              <span className={outdoor ? "rounded-full bg-white/15 border border-white/30 px-3 py-1 font-semibold text-white" : "rounded-full bg-muted px-3 py-1"}>
                🎯 {exercise.repetitionsTarget} rép.
              </span>
              {exercise.timerSeconds && (
                <span className={outdoor ? "rounded-full bg-white/15 border border-white/30 px-3 py-1 font-semibold text-white" : "rounded-full bg-muted px-3 py-1"}>
                  ⏱ {exercise.timerSeconds}s
                </span>
              )}
            </div>

            {/* Timer XL — chronomètre grand format, lisible bras tendu */}
            {timerSeconds != null && (
              <div className={
                outdoor
                  ? "mt-3 rounded-3xl border-2 border-white/40 bg-white/5 p-5"
                  : "mt-3 rounded-3xl border border-border bg-card p-5"
              }>
                <p className={`text-[11px] uppercase tracking-widest ${subtleTextClass}`}>
                  Minuteur
                </p>
                <p
                  className={
                    outdoor
                      ? "text-7xl sm:text-8xl font-black tabular-nums my-3 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                      : "text-6xl sm:text-7xl font-black tabular-nums my-3"
                  }
                  aria-live="polite"
                >
                  {formatTime(timerSeconds)}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    size="lg"
                    variant={outdoor ? "default" : "outline"}
                    className={
                      outdoor
                        ? "h-14 min-w-[140px] rounded-2xl text-base font-bold bg-white text-black hover:bg-white/90"
                        : "h-14 min-w-[140px] rounded-2xl text-base font-semibold"
                    }
                    onClick={() => setTimerRunning((r) => !r)}
                    aria-label={timerRunning ? "Mettre le minuteur en pause" : "Démarrer le minuteur"}
                  >
                    {timerRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                    {timerRunning ? "Pause" : "Lancer"}
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    className={
                      outdoor
                        ? "h-14 w-14 rounded-2xl text-white border border-white/30"
                        : "h-14 w-14 rounded-2xl"
                    }
                    onClick={() => {
                      setTimerSeconds(exercise.timerSeconds ?? 0);
                      setTimerRunning(false);
                    }}
                    aria-label="Réinitialiser le minuteur"
                  >
                    <RotateCcw className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Action bar — boutons larges utilisables au pouce, une main */}
      <footer className={
        outdoor
          ? "px-3 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 border-t-2 border-white/30 bg-black"
          : "px-3 pb-[max(env(safe-area-inset-bottom),1rem)] pt-2 border-t border-border bg-background/80 backdrop-blur"
      }>
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(RESULT_META) as Result[]).map((r) => {
            const meta = RESULT_META[r];
            const Icon = meta.icon;
            return (
              <button
                key={r}
                onClick={() => handleResult(r)}
                aria-label={meta.label}
                className={
                  outdoor
                    ? `h-20 rounded-2xl flex flex-col items-center justify-center gap-1 text-sm font-bold transition-all active:scale-95 border-2 border-white/20 ${meta.classes}`
                    : `h-16 rounded-2xl flex flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-all active:scale-95 ${meta.classes}`
                }
              >
                <Icon className={outdoor ? "h-7 w-7" : "h-5 w-5"} />
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

      {/* Bottom-sheet : consignes détaillées de l'exercice en cours */}
      <SessionInstructionsSheet
        open={instructionsOpen}
        onOpenChange={setInstructionsOpen}
        exerciseName={exercise.name}
        instructions={exercise.shortInstruction}
        repetitions={exercise.repetitionsTarget}
        timerSeconds={exercise.timerSeconds}
        exerciseIndex={currentIndex}
        total={total}
      />

      {/* Bottom-sheet : sommaire de la journée + saut direct vers un exercice */}
      <SessionDayOutlineSheet
        open={outlineOpen}
        onOpenChange={setOutlineOpen}
        dayId={id}
        exercises={exercises.map((e) => ({ id: e.id, name: e.name }))}
        currentIndex={currentIndex}
        completedIds={completedIds}
        onJumpTo={(i) => {
          tts.stop();
          setCurrentIndex(i);
        }}
      />
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
