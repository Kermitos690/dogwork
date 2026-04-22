import { supabase } from "@/integrations/supabase/client";
import { enqueue } from "@/lib/offlineQueue";

/**
 * Upsert day_progress safely handling the unique (dog_id, day_id) constraint.
 * Used by Plan, Training, DayDetail to avoid duplicating the same logic.
 *
 * Phase 3 — offline-aware: when the browser is offline (or the network call
 * outright throws a connectivity error) the operation is enqueued to the
 * local replay queue so it survives reload and is re-tried on reconnect.
 * Optimistic UI keeps working because callers always invalidate locally.
 */
export async function upsertDayProgress(
  dogId: string,
  userId: string,
  dayId: number,
  updates: {
    completed_exercises?: string[];
    status?: string;
    validated?: boolean;
    notes?: string;
  }
) {
  // Fast offline path — never touch the network if we already know we're offline.
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    enqueue({
      kind: "upsertDayProgress",
      dogId,
      userId,
      dayId,
      updates,
    });
    return;
  }

  try {
    const { data: existing } = await supabase
      .from("day_progress")
      .select("id")
      .eq("dog_id", dogId)
      .eq("day_id", dayId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from("day_progress").update(updates).eq("id", existing.id);
      if (error) throw error;
      return;
    }

    const { error } = await supabase.from("day_progress").insert({
      dog_id: dogId,
      user_id: userId,
      day_id: dayId,
      ...updates,
    });

    // Race condition fallback: if another tab inserted simultaneously, update instead.
    if (error && error.code === "23505") {
      const { data: retry } = await supabase
        .from("day_progress")
        .select("id")
        .eq("dog_id", dogId)
        .eq("day_id", dayId)
        .maybeSingle();
      if (retry) {
        const { error: retryErr } = await supabase
          .from("day_progress")
          .update(updates)
          .eq("id", retry.id);
        if (retryErr) throw retryErr;
      }
    } else if (error) {
      throw error;
    }
  } catch (err: any) {
    // Network-style errors (no internet, fetch failed, timeout) → queue for replay.
    const msg = String(err?.message || err);
    const looksOffline =
      msg.includes("Failed to fetch") ||
      msg.includes("NetworkError") ||
      msg.includes("network error") ||
      msg.includes("ERR_INTERNET_DISCONNECTED");
    if (looksOffline) {
      enqueue({
        kind: "upsertDayProgress",
        dogId,
        userId,
        dayId,
        updates,
      });
      return;
    }
    throw err;
  }
}
