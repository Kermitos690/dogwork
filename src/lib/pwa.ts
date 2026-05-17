/**
 * Centralisation PWA DogWork.
 * - Détection plateforme / navigateur / standalone / in-app browser
 * - Hook `useBeforeInstallPrompt` qui capte l'événement Chromium
 *
 * Apple ne permet PAS de déclencher l'ajout à l'écran d'accueil
 * via JavaScript : on guide l'utilisateur à la main pour iOS.
 */
import { useEffect, useState } from "react";

export type Platform = "ios" | "android" | "desktop";
export type IosBrowser =
  | "safari"
  | "chrome"
  | "firefox"
  | "edge"
  | "inapp"
  | "other";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function getUserAgent(): string {
  if (typeof navigator === "undefined") return "";
  return navigator.userAgent || "";
}

export function detectPlatform(): Platform {
  const ua = getUserAgent();
  if (!ua) return "desktop";
  // iPadOS 13+ se présente comme Macintosh : on confirme par le tactile.
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (typeof document !== "undefined" && /Macintosh/i.test(ua) && "ontouchend" in document) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

export function detectIosBrowser(): IosBrowser {
  const ua = getUserAgent();
  if (!ua) return "other";
  if (/CriOS/i.test(ua)) return "chrome";
  if (/FxiOS/i.test(ua)) return "firefox";
  if (/EdgiOS/i.test(ua)) return "edge";
  if (/FBAN|FBAV|Instagram|Line|LinkedInApp|Snapchat|Twitter|TikTok|MicroMessenger/i.test(ua)) return "inapp";
  if (/Safari/i.test(ua)) return "safari";
  return "other";
}

export function isInAppBrowser(): boolean {
  return detectIosBrowser() === "inapp" ||
    /FBAN|FBAV|Instagram|Line|LinkedInApp|Snapchat|TikTok|MicroMessenger/i.test(getUserAgent());
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if ((window.navigator as any)?.standalone === true) return true;
    return window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  } catch {
    return false;
  }
}

export function hasServiceWorker(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return Promise.resolve(false);
  return navigator.serviceWorker.getRegistrations().then(rs => rs.length > 0).catch(() => false);
}

export async function hasManifest(): Promise<boolean> {
  if (typeof document === "undefined") return false;
  const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
  if (!link?.href) return false;
  try {
    const r = await fetch(link.href, { credentials: "omit" });
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * Capte l'événement `beforeinstallprompt` de Chromium.
 * Retourne `prompt()` qui déclenche la modale native + `cleared()` après usage.
 */
export function useBeforeInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    const onInstalled = () => setEvent(null);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function prompt(): Promise<"accepted" | "dismissed" | "unavailable"> {
    if (!event) return "unavailable";
    try {
      await event.prompt();
      const choice = await event.userChoice;
      setEvent(null);
      return choice.outcome;
    } catch {
      setEvent(null);
      return "dismissed";
    }
  }

  return { available: !!event, prompt };
}
