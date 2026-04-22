import { supabase } from "@/integrations/supabase/client";

/**
 * Upsert day_progress safely handling the unique (dog_id, day_id) constraint.
 * Used by Plan, Training, DayDetail to avoid duplicating the same logic.
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
}
