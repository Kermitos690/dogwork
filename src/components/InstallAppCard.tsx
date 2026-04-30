import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Smartphone, Download, X, Apple, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Variant = "hero" | "compact" | "banner";

interface InstallAppCardProps {
  variant?: Variant;
  className?: string;
  /** localStorage key for the dismiss state. Use distinct keys per surface. */
  dismissKey?: string;
  /** If true, hides itself when running as installed PWA (display-mode: standalone). */
  hideIfInstalled?: boolean;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS
  // @ts-ignore
  if (window.navigator?.standalone === true) return true;
  return window.matchMedia?.("(display-mode: standalone)").matches ?? false;
}

/**
 * Strong "Install the app" CTA.
 * - Drives to /install (full guide for iOS / Android / Pixel).
 * - Three visual variants (hero, banner, compact) for landing & dashboards.
 * - Auto-hides when already installed; dismissable per surface.
 */
export function InstallAppCard({
  variant = "compact",
  className,
  dismissKey,
  hideIfInstalled = true,
}: InstallAppCardProps) {
  const [hidden, setHidden] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (hideIfInstalled) setInstalled(isStandalone());
    if (dismissKey) {
      try {
        if (localStorage.getItem(dismissKey) === "1") setHidden(true);
      } catch {}
    }
  }, [dismissKey, hideIfInstalled]);

  const dismiss = () => {
    setHidden(true);
    if (dismissKey) {
      try {
        localStorage.setItem(dismissKey, "1");
      } catch {}
    }
  };

  if (hidden || installed) return null;

  if (variant === "banner") {
    return (
      <div
        className={cn(
          "relative w-full bg-gradient-to-r from-primary via-primary to-primary/80 text-primary-foreground",
          className,
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Smartphone className="h-5 w-5 shrink-0" />
          <p className="flex-1 text-sm font-medium">
            <span className="hidden sm:inline">Installez DogWork sur votre téléphone </span>
            <span className="sm:hidden">Installer l'app </span>
            — gratuit, sans App Store.
          </p>
          <Button
            asChild
            size="sm"
            variant="secondary"
            className="h-8 shrink-0 font-semibold"
          >
            <Link to="/install">
              <Download className="mr-1 h-4 w-4" />
              Installer
            </Link>
          </Button>
          {dismissKey && (
            <button
              onClick={dismiss}
              aria-label="Fermer"
              className="ml-1 rounded p-1 text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <section
        className={cn(
          "relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-primary/5 p-6 sm:p-10",
          className,
        )}
      >
        {dismissKey && (
          <button
            onClick={dismiss}
            aria-label="Masquer"
            className="absolute right-3 top-3 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <div className="grid items-center gap-8 md:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Zap className="h-3.5 w-3.5" />
              Installation gratuite — 30 secondes
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Mettez DogWork sur votre téléphone
            </h2>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
              Accès en un tap depuis l'écran d'accueil, ouverture instantanée,
              utilisation à une main pendant les séances. Sans App Store, sans Play Store.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild size="lg" className="font-semibold">
                <Link to="/install">
                  <Download className="mr-2 h-4 w-4" />
                  Installer maintenant
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/install#android">Voir le guide</Link>
              </Button>
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Apple className="h-3.5 w-3.5" /> iPhone
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5" /> Android
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5" /> Google Pixel
              </span>
            </div>
          </div>
          <div className="relative hidden md:block">
            <div className="relative mx-auto aspect-[9/16] w-48 rounded-[2rem] border-8 border-foreground/80 bg-background shadow-2xl">
              <div className="absolute left-1/2 top-2 h-1.5 w-16 -translate-x-1/2 rounded-full bg-foreground/60" />
              <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                  <PawIcon />
                </div>
                <div className="text-center text-xs font-semibold">DogWork</div>
                <div className="mt-2 h-1.5 w-20 rounded-full bg-muted" />
                <div className="h-1.5 w-14 rounded-full bg-muted" />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // compact
  return (
    <div
      className={cn(
        "relative flex items-center gap-4 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5 p-4",
        className,
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Smartphone className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Installez l'app DogWork</p>
        <p className="truncate text-xs text-muted-foreground">
          Accès rapide depuis l'écran d'accueil — iPhone, Android, Pixel.
        </p>
      </div>
      <Button asChild size="sm" className="shrink-0 font-semibold">
        <Link to="/install">
          <Download className="mr-1 h-4 w-4" />
          Installer
        </Link>
      </Button>
      {dismissKey && (
        <button
          onClick={dismiss}
          aria-label="Masquer"
          className="absolute right-1 top-1 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function PawIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden>
      <circle cx="5.5" cy="9" r="1.8" />
      <circle cx="9" cy="5" r="1.8" />
      <circle cx="15" cy="5" r="1.8" />
      <circle cx="18.5" cy="9" r="1.8" />
      <path d="M12 11c-3.3 0-6 3-6 6 0 1.7 1.4 3 3 3 1 0 1.5-.5 3-.5s2 .5 3 .5c1.6 0 3-1.3 3-3 0-3-2.7-6-6-6z" />
    </svg>
  );
}
