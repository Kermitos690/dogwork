import { useEffect, useState } from "react";

/**
 * Persistent PWA install state.
 *
 * Returns `true` as soon as we have any reliable signal that DogWork was
 * installed on this device:
 *  - `display-mode: standalone` (Android / Desktop PWAs)
 *  - `navigator.standalone === true` (iOS Safari home-screen launch)
 *  - `appinstalled` event fired during this session
 *  - persistent localStorage flag set on previous install
 *
 * Once set, the flag survives across browser tabs (non-standalone) so the
 * install CTAs stay hidden even when the user opens the site in Safari/Chrome
 * after having added the PWA to their home screen.
 */
const STORAGE_KEY = "dogwork.pwa.installed";

function readStandalone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // iOS Safari home-screen launch
    if ((window.navigator as any)?.standalone === true) return true;
    // Android / Desktop PWAs (CSS display-mode)
    if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
    // Android: Chrome lance les TWA / PWA avec referrer "android-app://…"
    if (typeof document !== "undefined" && document.referrer?.startsWith("android-app://")) return true;
    // Fenêtre Windows/desktop minimal-ui / fullscreen
    if (window.matchMedia?.("(display-mode: minimal-ui)").matches) return true;
    if (window.matchMedia?.("(display-mode: fullscreen)").matches) return true;
    if (window.matchMedia?.("(display-mode: window-controls-overlay)").matches) return true;
    return false;
  } catch {
    return false;
  }
}

function readPersisted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {}
}

export function markPwaInstalled() {
  persist();
}

export function usePwaInstalled(): boolean {
  const [installed, setInstalled] = useState<boolean>(
    () => readStandalone() || readPersisted(),
  );

  useEffect(() => {
    if (readStandalone()) {
      setInstalled(true);
      persist();
    }

    const mql = window.matchMedia?.("(display-mode: standalone)");
    const onDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setInstalled(true);
        persist();
      }
    };
    mql?.addEventListener?.("change", onDisplayModeChange);

    const onInstalled = () => {
      setInstalled(true);
      persist();
    };
    window.addEventListener("appinstalled", onInstalled);

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue === "1") setInstalled(true);
    };
    window.addEventListener("storage", onStorage);

    // Recheck quand l'app revient au premier plan (cas iOS où on bascule depuis l'écran d'accueil)
    const recheck = () => {
      if (readStandalone()) {
        setInstalled(true);
        persist();
      }
    };
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", recheck);
    window.addEventListener("pageshow", recheck);

    return () => {
      mql?.removeEventListener?.("change", onDisplayModeChange);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", recheck);
      window.removeEventListener("pageshow", recheck);
    };
  }, []);

  return installed;
}
