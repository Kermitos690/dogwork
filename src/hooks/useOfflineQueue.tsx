import { useEffect, useState, useCallback, useRef } from "react";
import { listEntries, subscribe, dequeue, markFailed, type OfflineEntry } from "@/lib/offlineQueue";
import { supabase } from "@/integrations/supabase/client";
import { upsertDayProgress } from "@/lib/dayProgress";
import { useOnlineStatus } from "./useOnlineStatus";
import { useQueryClient } from "@tanstack/react-query";

const MAX_ATTEMPTS = 5;

/**
 * Owns the field-write replay loop. Mounted once at the App root.
 * Whenever the browser comes back online, every queued entry is replayed in
 * the order it was captured. Failures bump an attempt counter and stay queued
 * until MAX_ATTEMPTS is exceeded, at which point the entry is dropped to
 * avoid blocking the queue forever (the UI surfaces this via lastError).
 */
export function useOfflineQueueRunner() {
  const online = useOnlineStatus();
  const qc = useQueryClient();
  const [entries, setEntries] = useState<OfflineEntry[]>(() => listEntries());
  const runningRef = useRef(false);

  // Subscribe to queue mutations across tabs.
  useEffect(() => {
    const unsub = subscribe(() => setEntries(listEntries()));
    return unsub;
  }, []);

  const flush = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      // Re-read each iteration so cross-tab additions are picked up.
      let pending = listEntries();
      while (pending.length > 0 && navigator.onLine) {
        const entry = pending[0];
        try {
          if (entry.op.kind === "insert") {
            const { error } = await supabase
              .from(entry.op.table as any)
              .insert(entry.op.payload as any);
            if (error) throw error;
          } else if (entry.op.kind === "upsertDayProgress") {
            await upsertDayProgress(
              entry.op.dogId,
              entry.op.userId,
              entry.op.dayId,
              entry.op.updates as any,
            );
          }
          dequeue(entry.id);
        } catch (err: any) {
          const msg = err?.message || String(err);
          if (entry.attempts + 1 >= MAX_ATTEMPTS) {
            // Give up on this entry — log and drop to keep the queue moving.
            console.error("[OfflineQueue] dropping entry after retries:", entry, msg);
            dequeue(entry.id);
          } else {
            markFailed(entry.id, msg);
            // Stop the loop on the first failure so we don't hammer a broken
            // backend. We'll resume on the next online event.
            break;
          }
        }
        pending = listEntries();
      }
    } finally {
      runningRef.current = false;
      // Refresh consumers once we've drained — stats / progress / journals.
      qc.invalidateQueries({ queryKey: ["day_progress"] });
      qc.invalidateQueries({ queryKey: ["behavior_logs"] });
      qc.invalidateQueries({ queryKey: ["stats_progress"] });
      qc.invalidateQueries({ queryKey: ["stats_behavior"] });
      qc.invalidateQueries({ queryKey: ["stats_sessions"] });
      qc.invalidateQueries({ queryKey: ["day_zones"] });
      setEntries(listEntries());
    }
  }, [qc]);

  // Trigger replay when we transition to online.
  useEffect(() => {
    if (online) flush();
  }, [online, flush]);

  // Also trigger on mount in case there are leftover entries.
  useEffect(() => {
    if (navigator.onLine) flush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { entries, online, flush };
}
