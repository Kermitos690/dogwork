import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Download, Share, Plus, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstalled, markPwaInstalled } from "@/hooks/usePwaInstalled";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "dogwork.install-banner.dismissed-at";
const DISMISS_TTL_DAYS = 14;

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as any).standalone === true
  );
}

function detect(): "ios" | "android" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  // Exclude in-app browsers (FB, Instagram, Twitter, Chrome iOS = CriOS, Firefox iOS = FxiOS)
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|FBAN|FBAV|Instagram|Line|EdgiOS/i.test(ua);
  return isIos && isSafari;
}

function recentlyDismissed(): boolean {
  try {
    const v = localStorage.getItem(DISMISS_KEY);
    if (!v) return false;
    const ts = Number(v);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_TTL_DAYS * 86400 * 1000;
  } catch {
    return false;
  }
}

/**
 * Global install prompt — appears automatically on mobile (Android + iOS Safari).
 * - Android: captures `beforeinstallprompt` and triggers native install dialog
 * - iOS: shows custom banner with "Partager → Sur l'écran d'accueil" instructions
 * - Hidden in standalone mode, on /install page, and for 14 days after dismissal
 */
export function InstallPromptBanner() {
  const location = useLocation();
  const installed = usePwaInstalled();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const platform = typeof window !== "undefined" ? detect() : "desktop";

  useEffect(() => {
    if (installed) { setVisible(false); return; }
    if (recentlyDismissed()) return;
    if (location.pathname.startsWith("/install")) return;

    // Android / Chromium
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    const onInstalled = () => {
      setVisible(false);
      try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    };
    window.addEventListener("appinstalled", onInstalled);

    // iOS Safari — pas de beforeinstallprompt → afficher banner manuel après court délai
    if (isIosSafari()) {
      const t = setTimeout(() => setVisible(true), 1500);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
        window.removeEventListener("appinstalled", onInstalled);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [location.pathname]);

  function dismiss() {
    setVisible(false);
    setShowIosHint(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
  }

  async function install() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setVisible(false);
      } else {
        dismiss();
      }
      setDeferred(null);
      return;
    }
    if (platform === "ios") setShowIosHint(true);
  }

  if (!visible) return null;
  // Desktop sans prompt → ne pas afficher (l'utilisateur n'en a pas besoin)
  if (platform === "desktop" && !deferred) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[100] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-label="Installer l'application DogWork"
    >
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card/95 backdrop-blur shadow-xl">
        {!showIosHint ? (
          <div className="flex items-center gap-3 p-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">Installer DogWork</p>
              <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                Accès rapide, plein écran et notifications.
              </p>
            </div>
            <Button size="sm" onClick={install} className="shrink-0">
              <Download className="h-4 w-4 mr-1.5" />
              Installer
            </Button>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Plus tard"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold">Ajouter à l'écran d'accueil</p>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Fermer"
                className="p-1 rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Share className="h-4 w-4 text-primary" />
                Touchez l'icône <span className="font-medium text-foreground">Partager</span> dans Safari.
              </li>
              <li className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                Sélectionnez <span className="font-medium text-foreground">« Sur l'écran d'accueil »</span>.
              </li>
            </ol>
            <Link
              to="/install"
              className="block text-xs text-primary underline-offset-2 hover:underline"
              onClick={() => setVisible(false)}
            >
              Guide complet
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default InstallPromptBanner;
