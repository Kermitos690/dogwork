import type { AppSettings, DayProgress, BehaviorLog, ExerciseSession } from "@/types";

const KEYS = {
  settings: "canine-settings",
  progress: "canine-progress",
  behavior: "canine-behavior",
  sessions: "canine-sessions",
} as const;

function get<T>(key: string, fallback: T): T {
  try {
    const d = localStorage.getItem(key);
    return d ? JSON.parse(d) : fallback;
  } catch {
    return fallback;
  }
}

function set(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

const defaultSettings: AppSettings = {
  dogName: "Ma chienne",
  startDate: new Date().toISOString().split("T")[0],
  currentDay: 1,
  theme: "light",
  safetyAcknowledged: false,
};

export function getSettings(): AppSettings {
  return get(KEYS.settings, defaultSettings);
}
export function saveSettings(s: AppSettings): void {
  set(KEYS.settings, s);
}

export function getAllProgress(): Record<number, DayProgress> {
  return get(KEYS.progress, {});
}
export function getDayProgress(dayId: number): DayProgress | null {
  const all = getAllProgress();
  return all[dayId] || null;
}
export function saveDayProgress(p: DayProgress): void {
  const all = getAllProgress();
  all[p.dayId] = { ...p, lastUpdated: new Date().toISOString() };
  set(KEYS.progress, all);
}

export function getAllBehavior(): Record<number, BehaviorLog> {
  return get(KEYS.behavior, {});
}
export function getBehaviorLog(dayId: number): BehaviorLog | null {
  const all = getAllBehavior();
  return all[dayId] || null;
}
export function saveBehaviorLog(log: BehaviorLog): void {
  const all = getAllBehavior();
  all[log.dayId] = log;
  set(KEYS.behavior, all);
}

export function getSessions(): ExerciseSession[] {
  return get(KEYS.sessions, []);
}
export function saveSession(s: ExerciseSession): void {
  const sessions = getSessions();
  sessions.push(s);
  set(KEYS.sessions, sessions);
}

export function resetAll(): void {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}

export function exportJSON(): string {
  return JSON.stringify({
    settings: getSettings(),
    progress: getAllProgress(),
    behavior: getAllBehavior(),
    sessions: getSessions(),
    exportedAt: new Date().toISOString(),
  }, null, 2);
}

export function exportText(): string {
  const s = getSettings();
  const progress = getAllProgress();
  const behavior = getAllBehavior();
  const completed = Object.values(progress).filter((p) => p.validated).length;
  let txt = `=== DÉFI CANIN 28 JOURS ===\nChien: ${s.dogName}\nDébut: ${s.startDate}\nJours validés: ${completed}/28\n\n`;
  for (let i = 1; i <= 28; i++) {
    const p = progress[i];
    const b = behavior[i];
    txt += `--- Jour ${i} ---\n`;
    txt += `Statut: ${p ? (p.validated ? "Validé" : p.status) : "À faire"}\n`;
    if (p?.notes) txt += `Notes: ${p.notes}\n`;
    if (b) {
      txt += `Tension: ${b.tensionLevel}/5 | Réactivité: ${b.dogReactionLevel}/5\n`;
      txt += `Distance confort: ${b.comfortDistanceMeters}m\n`;
      if (b.comments) txt += `Commentaires: ${b.comments}\n`;
    }
    txt += "\n";
  }
  return txt;
}
