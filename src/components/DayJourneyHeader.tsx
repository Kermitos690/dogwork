import { ChevronLeft, ChevronRight, Lock, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type DayState = "todo" | "in_progress" | "done" | "locked";

interface DayJourneyHeaderProps {
  /** Current day number (1-based). */
  dayId: number;
  /** Total days in the active program (default 28). */
  totalDays?: number;
  /** Week number for display. */
  week?: number;
  /** Day status. */
  state: DayState;
  /** Completion ratio of today's exercises (0..1). */
  completion?: number;
  /** Whether the previous day exists & is reachable. */
  hasPrev?: boolean;
  /** Whether the next day is unlocked. */
  hasNext?: boolean;
  /** Plan source — preserved in nav links. */
  source?: string | null;
}

/**
 * Premium day-journey header used at the top of DayDetail / Training.
 * Shows day number, week chip, completion ring, status, and prev/next chips.
 * Mobile-first, no animations beyond CSS transitions.
 */
export function DayJourneyHeader({
  dayId,
  totalDays = 28,
  week,
  state,
  completion = 0,
  hasPrev = false,
  hasNext = false,
  source,
}: DayJourneyHeaderProps) {
  const navigate = useNavigate();
  const pct = Math.round(Math.min(1, Math.max(0, completion)) * 100);
  const link = (n: number) => (source === "plan" ? `/day/${n}?source=plan` : `/day/${n}`);

  // Visual state mapping using semantic tokens
  const ring =
    state === "done"
      ? "ring-success/40"
      : state === "in_progress"
        ? "ring-primary/40"
        : state === "locked"
          ? "ring-muted-foreground/20"
          : "ring-border";

  const numberBg =
    state === "done"
      ? "bg-success text-success-foreground"
      : state === "in_progress"
        ? "bg-primary text-primary-foreground"
        : state === "locked"
          ? "bg-muted text-muted-foreground"
          : "bg-card text-foreground border border-border";

  const StatusIcon =
    state === "done" ? CheckCircle2 : state === "in_progress" ? Loader2 : state === "locked" ? Lock : Circle;
  const statusColor =
    state === "done"
      ? "text-success"
      : state === "in_progress"
        ? "text-primary"
        : state === "locked"
          ? "text-muted-foreground"
          : "text-muted-foreground";
  const statusLabel =
    state === "done"
      ? "Validé"
      : state === "in_progress"
        ? "En cours"
        : state === "locked"
          ? "Verrouillé"
          : "À démarrer";

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Top row: day badge + meta */}
      <div className="flex items-center gap-3 p-3.5">
        {/* Day number with progress ring */}
        <div className={cn("relative h-12 w-12 rounded-2xl flex items-center justify-center font-bold text-base shadow-sm", numberBg, "ring-2", ring)}>
          {state === "locked" ? <Lock className="h-5 w-5" /> : dayId}
          {/* Subtle progress arc for in_progress days */}
          {state === "in_progress" && pct > 0 && pct < 100 && (
            <span
              className="absolute -bottom-1 -right-1 text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full leading-none"
              aria-label={`${pct}% complété`}
            >
              {pct}%
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>Jour {dayId} / {totalDays}</span>
            {week ? <span className="text-muted-foreground/50">·</span> : null}
            {week ? <span>S{week}</span> : null}
          </div>
          <div className={cn("mt-0.5 flex items-center gap-1.5 text-xs font-semibold", statusColor)}>
            <StatusIcon className={cn("h-3.5 w-3.5", state === "in_progress" && "animate-spin")} />
            <span>{statusLabel}</span>
          </div>
        </div>
      </div>

      {/* Bottom row: progression strip with prev/next chips */}
      <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-muted/30 px-2 py-1.5">
        <button
          type="button"
          disabled={!hasPrev || dayId <= 1}
          onClick={() => navigate(link(dayId - 1))}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-card transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
          aria-label="Jour précédent"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {dayId > 1 ? `J${dayId - 1}` : ""}
        </button>

        {/* Tiny progression bar across totalDays */}
        <div className="flex-1 mx-1">
          <div className="h-1 rounded-full bg-border/60 overflow-hidden">
            <div
              className="h-full bg-primary/60 transition-all"
              style={{ width: `${Math.min(100, Math.round((dayId / totalDays) * 100))}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          disabled={!hasNext || dayId >= totalDays}
          onClick={() => navigate(link(dayId + 1))}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-card transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
          aria-label="Jour suivant"
        >
          {dayId < totalDays ? `J${dayId + 1}` : ""}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
