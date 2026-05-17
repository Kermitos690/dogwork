import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Download, CheckCircle2, ArrowLeft, Share, Plus, Apple, Smartphone, Compass, Copy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { toast } from "sonner";
import { usePwaInstalled, markPwaInstalled } from "@/hooks/usePwaInstalled";
import { detectPlatform, detectIosBrowser, useBeforeInstallPrompt } from "@/lib/pwa";

export default function Install() {
  const platform = useMemo(() => detectPlatform(), []);
  const iosBrowser = useMemo(() => detectIosBrowser(), []);
  const { installed } = usePwaInstalled();
  const { available, prompt } = useBeforeInstallPrompt();
  const [triggered, setTriggered] = useState(false);
  const [showCopyFallback, setShowCopyFallback] = useState(false);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const installUrl = typeof window !== "undefined" ? window.location.origin + "/install" : "";

  // Android : déclencher automatiquement le prompt dès qu'il est dispo
  useEffect(() => {
    if (platform === "android" && available && !triggered && !installed) {
      setTriggered(true);
      prompt().then((outcome) => {
        if (outcome === "accepted") {
          markPwaInstalled();
          toast.success("DogWork installé sur votre appareil");
        }
      });
    }
  }, [platform, available, triggered, installed, prompt]);

  async function handleInstall() {
    const outcome = await prompt();
    if (outcome === "accepted") {
      markPwaInstalled();
      toast.success("DogWork installé sur votre appareil");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(installUrl);
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

  return (
    <div className="min-h-screen bg-background pt-16">
      <SEO title="Installer DogWork" description="Ajoutez DogWork à votre écran d'accueil en un geste." path="/install" />

      <div className="max-w-md mx-auto px-4 py-8 space-y-6">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Retour
        </Link>

        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
            <Download className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Installer DogWork</h1>
          <p className="text-sm text-muted-foreground">Accès rapide, plein écran, notifications.</p>
        </div>

        {/* Déjà installée */}
        {installed && (
          <Card className="border-emerald-500/40 bg-emerald-500/5">
            <CardContent className="p-5 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
              <p className="text-sm">DogWork est déjà installé sur cet appareil. Lance-le depuis ton écran d'accueil.</p>
            </CardContent>
          </Card>
        )}

        {/* Android */}
        {!installed && platform === "android" && (
          <Card>
            <CardContent className="p-5 space-y-4 text-center">
              <Smartphone className="w-10 h-10 text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">
                {available
                  ? "Touche le bouton pour ajouter DogWork à ton écran d'accueil."
                  : "Préparation de l'installation… si rien ne s'affiche, ouvre le menu ⋮ de Chrome puis « Installer l'application »."}
              </p>
              <Button size="lg" className="w-full" onClick={handleInstall} disabled={!available}>
                <Download className="w-5 h-5 mr-2" /> Installer maintenant
              </Button>
            </CardContent>
          </Card>
        )}

        {/* iOS Safari */}
        {!installed && platform === "ios" && iosBrowser === "safari" && (
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Apple className="w-8 h-8" />
                <div>
                  <p className="text-sm font-semibold">Installe DogWork sur ton iPhone</p>
                  <p className="text-xs text-muted-foreground">
                    Apple ne permet pas l'installation automatique. Trois gestes suffisent.
                  </p>
                </div>
              </div>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">1</span>
                  <span>Appuie sur <Share className="inline w-4 h-4 mx-1" /> <strong>Partager</strong> en bas de Safari.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">2</span>
                  <span>Choisis <Plus className="inline w-4 h-4 mx-1" /> <strong>Sur l'écran d'accueil</strong>.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">3</span>
                  <span>Appuie sur <strong>Ajouter</strong>.</span>
                </li>
              </ol>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  markPwaInstalled();
                  toast.success("Merci ! DogWork est marqué comme installé.");
                }}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> J'ai installé
              </Button>
            </CardContent>
          </Card>
        )}

        {/* iOS non-Safari : Chrome iOS, Firefox iOS, Edge iOS, in-app */}
        {!installed && platform === "ios" && iosBrowser !== "safari" && (
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <Compass className="w-8 h-8 text-amber-600 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Ouvre DogWork dans Safari pour l'installer</p>
                  <p className="text-xs text-muted-foreground">
                    Sur iPhone, l'installation sur l'écran d'accueil passe par Safari — Apple bloque cette
                    fonction dans {iosBrowser === "chrome" ? "Chrome" : iosBrowser === "firefox" ? "Firefox" : iosBrowser === "edge" ? "Edge" : "ce navigateur"}.
                  </p>
                </div>
              </div>

              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-bold shrink-0">1</span>
                  Touche <strong className="text-foreground">Copier le lien</strong> ci-dessous.
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-bold shrink-0">2</span>
                  Ouvre <strong className="text-foreground">Safari</strong>, colle le lien, charge la page.
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-bold shrink-0">3</span>
                  Suis les 3 étapes affichées dans Safari.
                </li>
              </ol>

              {!showCopyFallback ? (
                <Button size="lg" className="w-full" onClick={copyLink}>
                  <Copy className="w-4 h-4 mr-2" /> Copier le lien
                </Button>
              ) : (
                <div className="space-y-2">
                  <input
                    ref={linkInputRef}
                    readOnly
                    value={installUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="w-full text-sm px-3 py-2 rounded-md border border-border bg-background font-mono"
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
            </CardContent>
          </Card>
        )}

        {/* Desktop */}
        {!installed && platform === "desktop" && (
          <Card>
            <CardContent className="p-5 space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                {available
                  ? "Clique sur Installer pour ajouter DogWork à ton bureau."
                  : "Ouvre cette page sur ton smartphone pour installer l'application, ou clique sur l'icône d'installation dans la barre d'adresse de Chrome / Edge."}
              </p>
              {available && (
                <Button size="lg" className="w-full" onClick={handleInstall}>
                  <Download className="w-5 h-5 mr-2" /> Installer
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
