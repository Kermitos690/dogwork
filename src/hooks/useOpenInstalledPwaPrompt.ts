import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { usePwaInstalled } from "@/hooks/usePwaInstalled";
import { detectPlatform, isInAppBrowser, type Platform } from "@/lib/pwa";

/**
 * Détection "DogWork est installée mais l'utilisateur est dans le navigateur".
 *
 * NOTE: Les navigateurs ne fournissent pas d'API universelle permettant
 * d'ouvrir directement une PWA déjà installée. Ce hook propose la meilleure
 * UX possible : détection persistante via usePwaInstalled, tentative
 * de navigation sur Android, instructions claires sur iOS.
 */

const DISMISSED_AT_KEY = "dogwork.pwa.openPrompt.dismissedAt";
const NEVER_SHOW_KEY = "dogwork.pwa.openPrompt.neverShow";
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h

const BLOCKED_PATH_PREFIXES = [
  "/auth",
  "/login",
  "/signup",
  "/reset-password",
  "/access-denied",
  "/gate-k9x",
  "/install",
];

function isBlockedRoute(pathname: string): boolean {
  return BLOCKED_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isOnCooldown(): boolean {
  try {
    if (localStorage.getItem(NEVER_SHOW_KEY) === "1") return true;
    const raw = localStorage.getItem(DISMISSED_AT_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < COOLDOWN_MS;
  } catch {
    return false;
  }
}

export interface OpenInstalledPwaPromptState {
  open: boolean;
  platform: Platform;
  isInApp: boolean;
  close: () => void;
  later: () => void;
  neverShow: () => void;
}

export function useOpenInstalledPwaPrompt(): OpenInstalledPwaPromptState {
  const { installed, isStandalone } = usePwaInstalled();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [isInApp, setIsInApp] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setIsInApp(isInAppBrowser());
  }, []);

  useEffect(() => {
    if (isStandalone) {
      setOpen(false);
      return;
    }
    if (!installed) {
      setOpen(false);
      return;
    }
    if (isBlockedRoute(location.pathname)) {
      setOpen(false);
      return;
    }
    if (platform === "desktop") {
      setOpen(false);
      return;
    }
    if (isOnCooldown()) {
      setOpen(false);
      return;
    }

    const t = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(t);
  }, [installed, isStandalone, platform, location.pathname]);

  const close = () => setOpen(false);

  const later = () => {
    try {
      localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
    } catch {}
    setOpen(false);
  };

  const neverShow = () => {
    try {
      localStorage.setItem(NEVER_SHOW_KEY, "1");
    } catch {}
    setOpen(false);
  };

  return { open, platform, isInApp, close, later, neverShow };
}
