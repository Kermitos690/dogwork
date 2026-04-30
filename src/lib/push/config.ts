// Clé publique VAPID — publique par design, OK en clair frontend.
export const VAPID_PUBLIC_KEY =
  "BM7n5azCYAmdSkiD9ehd93CAqyIgwyG4efqR9HaB490y-hkg3Sri-v2HyW5FNUFY7K-hqQ5Osbpfi2b9Nb5OSBU";

export const PUSH_SW_PATH = "/sw-push.js";
export const PUSH_SW_SCOPE = "/";

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Détecte si on tourne dans le preview Lovable / iframe — on bloque alors les push pour éviter les conflits. */
export function isPreviewOrIframe(): boolean {
  try {
    const inIframe = window.self !== window.top;
    const host = window.location.hostname;
    const previewHost =
      host.includes("lovableproject.com") ||
      host.includes("lovable.app") && host.includes("id-preview--");
    return inIframe || previewHost;
  } catch {
    return true;
  }
}

export function isIos(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/** iOS exige que la PWA soit installée (standalone) pour autoriser les push. */
export function isStandalonePwa(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-ignore Safari
    window.navigator.standalone === true
  );
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}
