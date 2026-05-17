import { useCallback, useEffect, useState } from "react";

/**
 * Source unique de vérité pour l'état d'installation PWA de DogWork.
 *
 * Détection iOS / Android / Desktop + persistance localStorage + sync cross-tabs.
 * Une fois l'app lancée en mode standalone au moins une fois, l'état "installé"
 * est conservé pour les sessions futures sur ce navigateur.
 */
const STORAGE_KEY = "dogwork.pwa.installed";

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

function readStandalone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const nav = window.navigator as NavigatorWithStandalone;
    if (nav?.standalone === true) return true;
    const mm = window.matchMedia;
    if (mm?.("(display-mode: standalone)").matches) return true;
    if (mm?.("(display-mode: minimal-ui)").matches) return true;
    if (mm?.("(display-mode: fullscreen)").matches) return true;
    if (mm?.("(display-mode: window-controls-overlay)").matches) return true;
    if (typeof document !== "undefined" && document.referrer?.startsWith("android-app://")) return true;
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

export interface PwaInstalledState {
  installed: boolean;
  isStandalone: boolean;
  markInstalled: () => void;
}

export function usePwaInstalled(): PwaInstalledState {
  const [isStandalone, setIsStandalone] = useState<boolean>(() => readStandalone());
  const [installed, setInstalled] = useState<boolean>(
    () => readStandalone() || readPersisted(),
  );

  const markInstalled = useCallback(() => {
    persist();
    setInstalled(true);
  }, []);

  useEffect(() => {
    const recheck = () => {
      const standalone = readStandalone();
      setIsStandalone(standalone);
      if (standalone) {
        persist();
        setInstalled(true);
      } else if (readPersisted()) {
        setInstalled(true);
      }
    };

    recheck();

    const mql = window.matchMedia?.("(display-mode: standalone)");
    const onDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsStandalone(true);
        persist();
        setInstalled(true);
      }
    };
    mql?.addEventListener?.("change", onDisplayModeChange);

    const onInstalled = () => {
      persist();
      setInstalled(true);
    };
    window.addEventListener("appinstalled", onInstalled);

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue === "1") setInstalled(true);
    };
    window.addEventListener("storage", onStorage);

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

  return { installed, isStandalone, markInstalled };
}
