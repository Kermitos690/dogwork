import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveDog } from "@/hooks/useDogs";

export type DayState = "todo" | "in_progress" | "done" | "locked";

export interface DayLockSnapshot {
  /** Aggregated state: what to render at the top of DayDetail / Training. */
  state: DayState;
  /** Whether the day is reachable at all. */
  locked: boolean;
  /** Number of completed exercises for the day. */
  completedCount: number;
  /** True when the previous day was validated (or there is no previous day). */
  previousValidated: boolean;
  /** True when the current day is validated. */
  validated: boolean;
  /** Raw status text persisted on day_progress. */
  rawStatus: string;
}

/**
 * Centralized day-lock + state resolver.
 *
 * Used by DayDetail, Training, TrainingSession and the Plan grid to ensure
 * a single source of truth for "is day N reachable, and what is its UI state?".
 *
 * Lock rule: day N is locked if and only if N > 1 AND day N-1 has not been
 * validated. Day 1 is always reachable.
 *
 * State rule:
 *   validated → "done"
 *   completed_exercises.length > 0 → "in_progress"
 *   row exists but no exercise done → "todo"
 *   row missing → "todo"
 *
 * The hook short-circuits when the active dog is not loaded yet so callers
 * don't have to repeat the guard.
 */
export function useDayLockState(dayId: number): DayLockSnapshot {
  const activeDog = useActiveDog();

  const { data: current } = useQuery({
    queryKey: ["day_lock_state", activeDog?.id, dayId],
    queryFn: async () => {
      const { data } = await supabase
        .from("day_progress")
        .select("status, validated, completed_exercises")
        .eq("dog_id", activeDog!.id)
        .eq("day_id", dayId)
        .maybeSingle();
      return data;
    },
    enabled: !!activeDog && Number.isFinite(dayId),
    staleTime: 30_000,
  });

  const { data: prev } = useQuery({
    queryKey: ["day_lock_state_prev", activeDog?.id, dayId - 1],
    queryFn: async () => {
      const { data } = await supabase
        .from("day_progress")
        .select("validated")
        .eq("dog_id", activeDog!.id)
        .eq("day_id", dayId - 1)
        .maybeSingle();
      return data;
    },
    enabled: !!activeDog && Number.isFinite(dayId) && dayId > 1,
    staleTime: 30_000,
  });

  const previousValidated = dayId <= 1 ? true : !!prev?.validated;
  const locked = !previousValidated;
  const completed: string[] = (current?.completed_exercises as string[] | null) ?? [];
  const completedCount = completed.length;
  const validated = !!current?.validated;
  const rawStatus = (current?.status as string) ?? "todo";

  let state: DayState;
  if (locked) state = "locked";
  else if (validated) state = "done";
  else if (completedCount > 0 || rawStatus === "in_progress") state = "in_progress";
  else state = "todo";

  return { state, locked, completedCount, previousValidated, validated, rawStatus };
}

/**
 * Pure resolver — same lock rule as `useDayLockState` but operating on a
 * pre-fetched map of day_id → progress row. Used by the Plan grid where we
 * already bulk-load all rows in one query and don't want N hooks.
 *
 * Keeping this in the same module guarantees the rule stays in sync with
 * the per-day hook.
 */
export function resolveDayState(
  dayId: number,
  progressMap: Record<number, { status?: string | null; validated?: boolean | null; completed_exercises?: string[] | null } | undefined>,
): DayLockSnapshot {
  const current = progressMap[dayId];
  const prev = dayId > 1 ? progressMap[dayId - 1] : undefined;
  const previousValidated = dayId <= 1 ? true : !!prev?.validated;
  const locked = !previousValidated;
  const completed = (current?.completed_exercises as string[] | null) ?? [];
  const completedCount = completed.length;
  const validated = !!current?.validated;
  const rawStatus = (current?.status as string) ?? "todo";

  let state: DayState;
  if (locked) state = "locked";
  else if (validated) state = "done";
  else if (completedCount > 0 || rawStatus === "in_progress") state = "in_progress";
  else state = "todo";

  return { state, locked, completedCount, previousValidated, validated, rawStatus };
}
