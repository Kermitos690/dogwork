import { getSettings } from "./storage";

const NOTIF_KEY = "canine-notifications";

export interface NotificationSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

const defaults: NotificationSettings = { enabled: false, hour: 9, minute: 0 };

export function getNotificationSettings(): NotificationSettings {
  try {
    const d = localStorage.getItem(NOTIF_KEY);
    return d ? { ...defaults, ...JSON.parse(d) } : defaults;
  } catch { return defaults; }
}

export function saveNotificationSettings(s: NotificationSettings): void {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(s));
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  return Notification.requestPermission();
}

export function getPermissionStatus(): NotificationPermission | "unsupported" {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export function sendTestNotification(): void {
  const settings = getSettings();
  new Notification("🐕 Défi Canin — Test", {
    body: `Notification active pour ${settings.dogName} !`,
    icon: "/favicon.ico",
  });
}

let intervalId: number | null = null;

export function scheduleDaily(): void {
  if (intervalId) clearInterval(intervalId);
  const ns = getNotificationSettings();
  if (!ns.enabled || getPermissionStatus() !== "granted") return;

  // Check every 60 seconds
  intervalId = window.setInterval(() => {
    const now = new Date();
    if (now.getHours() === ns.hour && now.getMinutes() === ns.minute) {
      const s = getSettings();
      new Notification(`🐕 Défi Canin — Jour ${s.currentDay}`, {
        body: `C'est l'heure de l'entraînement ! ${s.dogName} vous attend.`,
        icon: "/favicon.ico",
      });
    }
  }, 60_000);
}

export function stopSchedule(): void {
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
}
