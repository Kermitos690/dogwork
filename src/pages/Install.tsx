import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Smartphone, Apple, Share, Plus, MoreVertical, Download, CheckCircle2,
  ArrowLeft, Wifi, Zap, Bell, AlertTriangle, Copy, ExternalLink, Tablet,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SEO } from "@/components/SEO";
import { toast } from "sonner";

type Platform = "ios" | "ipad" | "android" | "desktop";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && "ontouchend" in document)) return "ipad";
  if (/iPhone|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function detectInAppBrowser(): string | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (/FBAN|FBAV/i.test(ua)) return "Facebook";
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/Line/i.test(ua)) return "Line";
  if (/TikTok|musical_ly/i.test(ua)) return "TikTok";
  if (/Snapchat/i.test(ua)) return "Snapchat";
  if (/LinkedInApp/i.test(ua)) return "LinkedIn";
  if (/Twitter/i.test(ua)) return "Twitter";
  return null;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function isIosBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua);
}

function isSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
}

interface Step {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  hint?: string;
}

const IOS_STEPS: Step[] = [
  {
    icon: Share,
    title: "Touchez l'icône Partager",
    desc: "Le carré avec une flèche vers le haut, en bas de Safari (au centre de la barre).",
    hint: "Si la barre est masquée, touchez le bas de l'écran pour la faire apparaître.",
  },
  {
    icon: Plus,
    title: "Sélectionnez « Sur l'écran d'accueil »",
    desc: "Faites défiler la liste et touchez « Sur l'écran d'accueil » (Add to Home Screen).",
  },
  {
    icon: CheckCircle2,
    title: "Validez avec « Ajouter »",
    desc: "Touchez « Ajouter » en haut à droite. L'icône DogWork apparaît immédiatement.",
  },
];

const IPAD_STEPS: Step[] = [
  {
    icon: Share,
    title: "Touchez l'icône Partager",
    desc: "En haut à droite de Safari sur iPad, le carré avec la flèche vers le haut.",
  },
  {
    icon: Plus,
    title: "Sélectionnez « Sur l'écran d'accueil »",
    desc: "Faites défiler le menu de partage si nécessaire.",
  },
  {
    icon: CheckCircle2,
    title: "Validez avec « Ajouter »",
    desc: "DogWork est ajouté à votre écran d'accueil comme une vraie app.",
  },
];

const ANDROID_STEPS: Step[] = [
  {
    icon: MoreVertical,
    title: "Touchez le menu (⋮)",
    desc: "Les trois points en haut à droite de la barre d'adresse Chrome.",
    hint: "Sur Samsung Internet, touchez ☰ en bas à droite à la place.",
  },
  {
    icon: Download,
    title: "Choisissez « Installer l'application »",
    desc: "L'option peut s'appeler « Ajouter à l'écran d'accueil » ou « Installer DogWork » selon la version.",
  },
  {
    icon: CheckCircle2,
    title: "Confirmez l'installation",
    desc: "Touchez « Installer ». L'icône rejoint vos applications comme depuis le Play Store.",
  },
];

const BENEFITS = [
  { icon: Zap, label: "Lancement instantané", desc: "S'ouvre comme une vraie app, sans barre d'adresse." },
  { icon: Wifi, label: "Mode hors-ligne", desc: "Les pages déjà visitées restent accessibles." },
  { icon: Bell, label: "Notifications", desc: "Recevez les rappels et messages directement." },
];

export default function Install() {
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [inAppBrowser, setInAppBrowser] = useState<string | null>(null);
  const [installed, setInstalled] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosNotSafari, setIosNotSafari] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setInAppBrowser(detectInAppBrowser());
    setInstalled(isStandalone());
    setIosNotSafari(isIosBrowser() && !isSafari());

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      toast.success("DogWork est installée 🎉");
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const defaultTab = useMemo<"ios" | "ipad" | "android">(() => {
    if (platform === "ios") return "ios";
    if (platform === "ipad") return "ipad";
    if (platform === "android") return "android";
    return "ios";
  }, [platform]);

  async function installNow() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      toast.success("Installation lancée");
    }
    setDeferred(null);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      toast.success("Lien copié — collez-le dans Safari ou Chrome");
    } catch {
      toast.error("Copie impossible");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Installer DogWork — guide iPhone, iPad, Android"
        description="Installez DogWork sur l'écran d'accueil de votre iPhone, iPad ou Android en quelques secondes. Guide pas à pas illustré."
        path="/install"
      />
      <header className="border-b border-border/40 bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/landing" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
          <Badge variant="secondary" className="text-xs">Installation gratuite</Badge>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 md:py-14">
        {installed ? (
          <Alert className="mb-8 border-emerald-500/40 bg-emerald-500/5">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <AlertTitle>DogWork est déjà installée</AlertTitle>
            <AlertDescription>
              Vous utilisez DogWork en mode application. Vous pouvez fermer cette page.
            </AlertDescription>
          </Alert>
        ) : null}

        {inAppBrowser ? (
          <Alert variant="destructive" className="mb-8">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>Ouvrez DogWork dans Safari ou Chrome</AlertTitle>
            <AlertDescription className="space-y-3 mt-2">
              <p>
                Vous lisez cette page dans le navigateur intégré de <strong>{inAppBrowser}</strong>.
                L'installation n'y est pas disponible.
              </p>
              <ol className="text-sm list-decimal list-inside space-y-1 opacity-90">
                <li>Touchez les trois points ou le menu de {inAppBrowser}</li>
                <li>Choisissez « Ouvrir dans le navigateur » / « Open in Safari / Chrome »</li>
                <li>Reprenez le guide ci-dessous</li>
              </ol>
              <Button size="sm" variant="secondary" onClick={copyLink} className="mt-2">
                <Copy className="h-4 w-4 mr-2" /> Copier le lien
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {iosNotSafari && !inAppBrowser ? (
          <Alert variant="destructive" className="mb-8">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>Sur iPhone/iPad, utilisez Safari</AlertTitle>
            <AlertDescription>
              L'installation à l'écran d'accueil ne fonctionne qu'avec Safari sur iOS.
              Chrome iOS et les autres navigateurs n'y ont pas accès (limitation Apple).
            </AlertDescription>
          </Alert>
        ) : null}

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10"
        >
          <Badge variant="outline" className="mb-4">Application web installable</Badge>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
            Installer DogWork en 30 secondes
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Pas besoin d'App Store ni de Play Store. Choisissez votre appareil
            et suivez les étapes — l'icône apparaît sur votre écran d'accueil comme une vraie app.
          </p>

          {deferred && !installed ? (
            <div className="mt-6">
              <Button size="lg" onClick={installNow} className="gap-2">
                <Download className="h-5 w-5" />
                Installer DogWork maintenant
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Installation en un clic détectée sur votre navigateur.
              </p>
            </div>
          ) : null}
        </motion.section>

        <section className="grid sm:grid-cols-3 gap-3 mb-10">
          {BENEFITS.map((b) => (
            <Card key={b.label} className="border-border/50">
              <CardContent className="pt-5 pb-5">
                <b.icon className="w-5 h-5 text-primary mb-2" />
                <h3 className="font-semibold text-sm mb-1">{b.label}</h3>
                <p className="text-xs text-muted-foreground">{b.desc}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto mb-8">
            <TabsTrigger value="ios" className="gap-1.5">
              <Apple className="w-4 h-4" /> iPhone
            </TabsTrigger>
            <TabsTrigger value="ipad" className="gap-1.5">
              <Tablet className="w-4 h-4" /> iPad
            </TabsTrigger>
            <TabsTrigger value="android" className="gap-1.5">
              <Smartphone className="w-4 h-4" /> Android
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ios">
            <PlatformGuide
              title="iPhone (iOS)"
              subtitle="Ouvrez cette page dans Safari, puis suivez les 3 étapes."
              steps={IOS_STEPS}
            />
          </TabsContent>

          <TabsContent value="ipad">
            <PlatformGuide
              title="iPad (iPadOS)"
              subtitle="Ouvrez cette page dans Safari. L'icône Partager est en haut à droite sur iPad."
              steps={IPAD_STEPS}
            />
          </TabsContent>

          <TabsContent value="android">
            <PlatformGuide
              title="Android (Samsung, Google Pixel, Xiaomi, OnePlus…)"
              subtitle="Chrome est recommandé. Sur Pixel, la procédure est identique."
              steps={ANDROID_STEPS}
              extra={
                deferred ? (
                  <Button size="sm" onClick={installNow} className="w-full sm:w-auto mt-3 gap-2">
                    <Download className="h-4 w-4" />
                    Ou installer en un clic
                  </Button>
                ) : null
              }
            />
          </TabsContent>
        </Tabs>

        <section className="mt-14 grid sm:grid-cols-2 gap-4">
          <Card className="border-border/50">
            <CardContent className="pt-6 space-y-3">
              <h3 className="font-semibold">L'option n'apparaît pas ?</h3>
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>Vérifiez que vous êtes dans <strong>Safari</strong> (iPhone/iPad) ou <strong>Chrome</strong> (Android)</li>
                <li>Quittez tout navigateur intégré (Instagram, Facebook, TikTok…)</li>
                <li>Rechargez la page une fois</li>
                <li>Si déjà installée, l'option disparaît automatiquement</li>
              </ul>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6 space-y-3">
              <h3 className="font-semibold">Continuer sur un autre appareil</h3>
              <p className="text-sm text-muted-foreground">
                Copiez le lien et ouvrez-le directement dans le bon navigateur de votre téléphone.
              </p>
              <Button size="sm" variant="outline" onClick={copyLink} className="gap-2">
                <Copy className="h-4 w-4" /> Copier le lien d'installation
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="mt-14 text-center">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild>
              <Link to="/auth">Créer mon compte</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/landing">Découvrir DogWork <ExternalLink className="h-3.5 w-3.5 ml-1.5" /></Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}

function PlatformGuide({
  title, subtitle, steps, extra,
}: {
  title: string;
  subtitle: string;
  steps: Step[];
  extra?: React.ReactNode;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="pt-6 md:pt-8">
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-1">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-4 p-4 rounded-lg border border-border/40 bg-card/40">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm md:text-base">{s.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                {s.hint ? (
                  <p className="mt-1.5 text-xs text-muted-foreground/80 italic">💡 {s.hint}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
        {extra}
      </CardContent>
    </Card>
  );
}
