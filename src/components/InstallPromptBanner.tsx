import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Download, Share, Plus, X, Smartphone, Compass, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePwaInstalled, markPwaInstalled } from "@/hooks/usePwaInstalled";
import {
  detectPlatform,
  detectIosBrowser,
  useBeforeInstallPrompt,
} from "@/lib/pwa";

const DISMISS_KEY = "dogwork.install-banner.dismissed-at";
const DISMISS_TTL_DAYS = 14;

function recentlyDismissed(): boolean {
  try {
    const v = localStorage.getItem(DISMISS_KEY);
    if (!v) return false;
    const ts = Number(v);
    return Number.isFinite(ts) && Date.now() - ts < DISMISS_TTL_DAYS * 86400 * 1000;
  } catch {
    return false;
  }
}

function rememberDismiss() {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
}

/**
 * Bannière d'installation globale.
 * - Android/Chromium : bouton "Installer DogWork" qui déclenche le prompt natif.
 * - iOS Safari : bottom-sheet avec 3 étapes + "Voir les étapes", "J'ai installé", "Plus tard".
 * - iOS non-Safari (Chrome iOS, Firefox iOS, Edge iOS, in-app) : carte "Ouvre dans Safari"
 *   avec bouton "Copier le lien" + champ sélectionnable en fallback.
 * - Cachée si déjà installée, sur /install, ou récemment dismissée.
 */
export function InstallPromptBanner() {
  const location = useLocation();
  const installed = usePwaInstalled();
  const { available, prompt } = useBeforeInstallPrompt();
  const platform = useMemo(() => detectPlatform(), []);
  const iosBrowser = useMemo(() => detectIosBrowser(), []);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false); // iOS Safari : étapes visibles
  const [showCopyFallback, setShowCopyFallback] = useState(false);
  const linkInputRef = useRef<HTMLInputElement>(null);

  // Affichage initial
  useEffect(() => {
    if (installed) { setVisible(false); return; }
    if (recentlyDismissed()) return;
    if (location.pathname.startsWith("/install")) return;

    // Android : on attend que beforeinstallprompt arrive
    if (platform === "android") {
      if (available) setVisible(true);
      return;
    }
    // iOS : on affiche après court délai (la nav doit s'être affichée)
    if (platform === "ios") {
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
    // Desktop : seulement si prompt natif dispo
    if (platform === "desktop" && available) setVisible(true);
  }, [installed, location.pathname, platform, available]);

  function dismiss() {
    setVisible(false);
    setExpanded(false);
    rememberDismiss();
  }

  async function handleInstall() {
    if (available) {
      const outcome = await prompt();
      if (outcome === "accepted") {
        markPwaInstalled();
        setVisible(false);
      } else if (outcome === "dismissed") {
        rememberDismiss();
        setVisible(false);
      }
      return;
    }
    // iOS Safari : on déplie les instructions
    if (platform === "ios" && iosBrowser === "safari") {
      setExpanded(true);
      return;
    }
  }

  async function copyLink() {
    const url = window.location.origin + "/install";
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié. Ouvre Safari, colle le lien, puis ajoute DogWork à l'écran d'accueil.");
    } catch {
      setShowCopyFallback(true);
      setTimeout(() => {
        linkInputRef.current?.focus();
        linkInputRef.current?.select();
      }, 50);
      toast.error("Copie impossible — sélectionne le lien manuellement.");
    }
  }

  if (installed) return null;
  if (!visible) return null;
  if (platform === "desktop" && !available) return null;

  const installUrl = typeof window !== "undefined" ? window.location.origin + "/install" : "";
  const iosNonSafari = platform === "ios" && iosBrowser !== "safari";

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[100] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-label="Installer l'application DogWork"
    >
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card/95 backdrop-blur shadow-2xl overflow-hidden">
        {/* ============ Bloc 1 : Android / Desktop avec prompt natif ============ */}
        {platform !== "ios" && available && (
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
            <Button size="sm" onClick={handleInstall} className="shrink-0">
              <Download className="h-4 w-4 mr-1.5" /> Installer
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
        )}

        {/* ============ Bloc 2 : iOS Safari — bottom sheet 3 étapes ============ */}
        {platform === "ios" && iosBrowser === "safari" && (
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Installe DogWork sur ton iPhone</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Apple ne permet pas l'installation automatique. Appuie sur Partager puis « Sur l'écran d'accueil ».
                </p>
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Plus tard"
                className="p-1 -m-1 rounded-md text-muted-foreground hover:text-foreground shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {expanded && (
              <ol className="space-y-2 text-sm rounded-lg bg-muted/40 p-3">
                <li className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">1</span>
                  <span>Appuie sur <Share className="inline w-4 h-4 mx-1" /> <strong>Partager</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">2</span>
                  <span>Choisis <Plus className="inline w-4 h-4 mx-1" /> <strong>Sur l'écran d'accueil</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">3</span>
                  <span>Appuie sur <strong>Ajouter</strong></span>
                </li>
              </ol>
            )}

            <div className="grid grid-cols-3 gap-2">
              {!expanded ? (
                <Button size="sm" variant="secondary" onClick={() => setExpanded(true)}>
                  Voir les étapes
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setExpanded(false)}>
                  Masquer
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => { markPwaInstalled(); setVisible(false); toast.success("Merci ! DogWork est marqué comme installé."); }}
                className="bg-emerald-600 hover:bg-emerald-600/90 text-white"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" /> J'ai installé
              </Button>
              <Button size="sm" variant="outline" onClick={dismiss}>
                Plus tard
              </Button>
            </div>
            <Link
              to="/install"
              className="block text-center text-xs text-primary underline-offset-2 hover:underline"
              onClick={() => setVisible(false)}
            >
              Guide complet
            </Link>
          </div>
        )}

        {/* ============ Bloc 3 : iOS non-Safari ============ */}
        {iosNonSafari && (
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Compass className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Ouvre DogWork dans Safari pour l'installer</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sur iPhone, l'installation sur l'écran d'accueil passe par Safari.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Plus tard"
                className="p-1 -m-1 rounded-md text-muted-foreground hover:text-foreground shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!showCopyFallback ? (
              <Button size="sm" className="w-full" onClick={copyLink}>
                <Copy className="h-4 w-4 mr-2" /> Copier le lien
              </Button>
            ) : (
              <div className="space-y-2">
                <input
                  ref={linkInputRef}
                  readOnly
                  value={installUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="w-full text-xs px-2 py-2 rounded-md border border-border bg-background font-mono"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    linkInputRef.current?.focus();
                    linkInputRef.current?.select();
                  }}
                >
                  Sélectionner le lien
                </Button>
              </div>
            )}
            <Link
              to="/install"
              className="block text-center text-xs text-primary underline-offset-2 hover:underline"
              onClick={() => setVisible(false)}
            >
              Voir le guide complet
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default InstallPromptBanner;
