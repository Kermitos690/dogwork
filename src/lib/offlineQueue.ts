/**
 * Offline write queue for field-critical Supabase operations.
 *
 * Design goals (Phase 3 — DogWork field mode):
 *  - Zero dependency: localStorage-backed, sync-only, no IndexedDB layer.
 *  - Tiny surface: callers stay in control of *what* to retry, we only ferry
 *    payloads through. We never speculatively cache reads.
 *  - Safe by construction: each entry has a unique id and a stable shape so a
 *    duplicate replay (e.g. two tabs coming online) is detectable upstream.
 *  - Conservative scope: only the 3 tables that the field UX writes to —
 *    behavior_logs, exercise_sessions, day_progress.
 *
 * Anything not enqueued (AI, admin, course bookings, …) stays online-only by
 * design — see PHASE 3 spec.
 */

export type OfflineTable = "behavior_logs" | "exercise_sessions" | "day_progress";

export type OfflineOperation =
  | { kind: "insert"; table: OfflineTable; payload: Record<string, unknown> }
  | {
      kind: "upsertDayProgress";
      dogId: string;
      userId: string;
      dayId: number;
      updates: Record<string, unknown>;
    };

export interface OfflineEntry {
  id: string;
  createdAt: number;
  attempts: number;
  lastError?: string;
  op: OfflineOperation;
}

const STORAGE_KEY = "dogwork:offline-queue:v1";

// Cross-tab broadcast — each tab listens to the same channel so the badge
// updates everywhere when a write is enqueued or replayed.
const EVENT = "dogwork:offline-queue-changed";

const isBrowser = typeof window !== "undefined" && typeof localStorage !== "undefined";

function read(): OfflineEntry[] {
  if (!isBrowser) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(entries: OfflineEntry[]) {
  if (!isBrowser) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    // Quota exceeded or storage disabled — degrade silently. The user will
    // simply not have an offline buffer; the UI keeps working online.
  }
}

function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function enqueue(op: OfflineOperation): OfflineEntry {
  const entry: OfflineEntry = {
    id: genId(),
    createdAt: Date.now(),
    attempts: 0,
    op,
  };
  const all = read();
  all.push(entry);
  write(all);
  return entry;
}

export function dequeue(id: string) {
  write(read().filter((e) => e.id !== id));
}

export function markFailed(id: string, error: string) {
  const all = read();
  const idx = all.findIndex((e) => e.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], attempts: all[idx].attempts + 1, lastError: error };
  write(all);
}

export function listEntries(): OfflineEntry[] {
  return read();
}

export function clearQueue() {
  write([]);
}

/**
 * Subscribe to queue changes. Fires on enqueue / dequeue / cross-tab updates.
 * Returns an unsubscribe function.
 */
export function subscribe(listener: () => void): () => void {
  if (!isBrowser) return () => {};
  const onLocal = () => listener();
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener(EVENT, onLocal);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onLocal);
    window.removeEventListener("storage", onStorage);
  };
}
