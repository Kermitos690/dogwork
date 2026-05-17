import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, CheckCircle2, ArrowLeft, Share, Plus, Apple, Smartphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/i.test(ua) || (/Macintosh/i.test(ua) && "ontouchend" in document)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export default function Install() {
  const [platform] = useState<Platform>(detectPlatform);
  const [installed, setInstalled] = useState(isStandalone);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      toast.success("DogWork installé sur votre appareil");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Auto-trigger native install on Android as soon as the prompt is available
  useEffect(() => {
    if (deferred && !triggered && platform === "android") {
      setTriggered(true);
      deferred.prompt().catch(() => {});
    }
  }, [deferred, triggered, platform]);

  const handleInstall = async () => {
    if (!deferred) return;
    setTriggered(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-background pt-16">
      <SEO title="Installer DogWork" description="Ajoutez DogWork à votre écran d'accueil en un geste." />

      <div className="max-w-md mx-auto px-4 py-8 space-y-6">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Retour
        </Link>

        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
            <Download className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Installer DogWork</h1>
        </div>

        {installed && (
          <Card className="border-emerald-500/40 bg-emerald-500/5">
            <CardContent className="p-5 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
              <p className="text-sm">DogWork est déjà installé sur cet appareil. Lancez-le depuis votre écran d'accueil.</p>
            </CardContent>
          </Card>
        )}

        {!installed && platform === "android" && (
          <Card>
            <CardContent className="p-5 space-y-4 text-center">
              <Smartphone className="w-10 h-10 text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">
                {deferred
                  ? "Touchez le bouton pour ajouter DogWork à votre écran d'accueil."
                  : "Préparation de l'installation… si rien ne s'affiche, ouvrez le menu ⋮ de Chrome puis « Installer l'application »."}
              </p>
              <Button size="lg" className="w-full" onClick={handleInstall} disabled={!deferred}>
                <Download className="w-5 h-5 mr-2" /> Installer maintenant
              </Button>
            </CardContent>
          </Card>
        )}

        {!installed && platform === "ios" && (
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Apple className="w-8 h-8" />
                <p className="text-sm font-medium">iOS ne permet pas l'installation en un clic. Deux gestes suffisent :</p>
              </div>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">1</span>
                  <span>Touchez <Share className="inline w-4 h-4 mx-1" /> <strong>Partager</strong> en bas de Safari.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">2</span>
                  <span>Choisissez <Plus className="inline w-4 h-4 mx-1" /> <strong>Sur l'écran d'accueil</strong>, puis <em>Ajouter</em>.</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        )}

        {!installed && platform === "desktop" && (
          <Card>
            <CardContent className="p-5 space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                {deferred
                  ? "Cliquez sur Installer pour ajouter DogWork à votre bureau."
                  : "Ouvrez cette page sur votre smartphone pour installer l'application, ou cliquez sur l'icône d'installation dans la barre d'adresse de Chrome / Edge."}
              </p>
              {deferred && (
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
