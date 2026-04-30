import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Smartphone,
  Apple,
  Share,
  Plus,
  MoreVertical,
  Download,
  CheckCircle2,
  ArrowLeft,
  Wifi,
  Zap,
  Bell,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

interface Step {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}

const IOS_STEPS: Step[] = [
  {
    icon: Apple,
    title: "Ouvrez DogWork dans Safari",
    desc: "L'installation à l'écran d'accueil n'est possible qu'avec le navigateur Safari d'Apple. Si vous lisez cette page dans une autre app, ouvrez-la d'abord dans Safari.",
  },
  {
    icon: Share,
    title: "Touchez l'icône Partager",
    desc: "C'est le carré avec une flèche vers le haut, en bas de l'écran (au centre, dans la barre d'outils Safari).",
  },
  {
    icon: Plus,
    title: "Choisissez « Sur l'écran d'accueil »",
    desc: "Faites défiler le menu vers le bas si nécessaire, puis touchez « Sur l'écran d'accueil » (Add to Home Screen).",
  },
  {
    icon: CheckCircle2,
    title: "Validez avec « Ajouter »",
    desc: "Le nom DogWork s'affiche, touchez « Ajouter » en haut à droite. L'icône apparaît immédiatement sur votre écran d'accueil.",
  },
];

const ANDROID_STEPS: Step[] = [
  {
    icon: Smartphone,
    title: "Ouvrez DogWork dans Chrome",
    desc: "Sur Android (y compris Pixel, Samsung, Xiaomi…), Chrome est le navigateur recommandé pour installer une app web.",
  },
  {
    icon: MoreVertical,
    title: "Touchez le menu (⋮)",
    desc: "Les trois petits points en haut à droite de la barre d'adresse Chrome ouvrent le menu principal.",
  },
  {
    icon: Download,
    title: "Choisissez « Installer l'application »",
    desc: "Selon votre version de Chrome, l'option peut s'appeler « Installer l'application », « Ajouter à l'écran d'accueil » ou « Installer DogWork ».",
  },
  {
    icon: CheckCircle2,
    title: "Confirmez l'installation",
    desc: "Touchez « Installer ». L'icône DogWork rejoint vos applications, exactement comme une app du Play Store.",
  },
];

const PIXEL_NOTE =
  "Sur Google Pixel, la procédure est strictement identique à celle d'Android : ouvrez DogWork dans Chrome, puis utilisez le menu ⋮ → Installer l'application. Aucune étape supplémentaire n'est requise.";

const BENEFITS: { icon: React.ComponentType<{ className?: string }>; label: string; desc: string }[] = [
  {
    icon: Zap,
    label: "Lancement instantané",
    desc: "DogWork s'ouvre comme une vraie app, sans barre d'adresse ni délai de navigation.",
  },
  {
    icon: Wifi,
    label: "Mieux hors-ligne",
    desc: "Les pages déjà visitées restent accessibles même avec une connexion faible sur le terrain.",
  },
  {
    icon: Bell,
    label: "Plein écran",
    desc: "Plus d'espace utile pour suivre vos chiens, vos sessions et vos plans d'éducation.",
  },
];

export default function Install() {
  const [platform, setPlatform] = useState<Platform>("desktop");

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  const defaultTab = useMemo<Platform>(
    () => (platform === "desktop" ? "ios" : platform),
    [platform],
  );

  // SEO
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Installer DogWork sur iPhone, Android ou Pixel";
    const meta = document.querySelector('meta[name="description"]');
    const prevDesc = meta?.getAttribute("content") ?? "";
    meta?.setAttribute(
      "content",
      "Installez DogWork sur l'écran d'accueil de votre iPhone, smartphone Android ou Google Pixel en quelques secondes. Guide pas à pas.",
    );
    return () => {
      document.title = prevTitle;
      meta?.setAttribute("content", prevDesc);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40 bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            to="/landing"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
          <Badge variant="secondary" className="text-xs">Installation gratuite</Badge>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 md:py-16">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <Badge variant="outline" className="mb-4">
            Application web installable
          </Badge>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
            Installer DogWork sur votre téléphone
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            DogWork s'ajoute à votre écran d'accueil comme une vraie application,
            sans passer par l'App Store ni le Play Store. Choisissez votre appareil
            ci-dessous pour suivre le guide adapté.
          </p>
        </motion.section>

        <section className="grid sm:grid-cols-3 gap-4 mb-12">
          {BENEFITS.map((b) => (
            <Card key={b.label} className="border-border/50">
              <CardContent className="pt-6">
                <b.icon className="w-6 h-6 text-primary mb-3" />
                <h3 className="font-semibold mb-1">{b.label}</h3>
                <p className="text-sm text-muted-foreground">{b.desc}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto mb-8">
            <TabsTrigger value="ios" className="gap-1.5">
              <Apple className="w-4 h-4" /> iPhone
            </TabsTrigger>
            <TabsTrigger value="android" className="gap-1.5">
              <Smartphone className="w-4 h-4" /> Android
            </TabsTrigger>
            <TabsTrigger value="desktop" className="gap-1.5">
              Pixel
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ios">
            <PlatformGuide
              title="iPhone & iPad (iOS / iPadOS)"
              subtitle="Safari uniquement — l'installation sur iOS passe obligatoirement par Safari."
              steps={IOS_STEPS}
            />
          </TabsContent>

          <TabsContent value="android">
            <PlatformGuide
              title="Android (Samsung, Xiaomi, OnePlus…)"
              subtitle="Chrome est le navigateur recommandé pour une installation fiable en quelques secondes."
              steps={ANDROID_STEPS}
            />
          </TabsContent>

          <TabsContent value="desktop">
            <PlatformGuide
              title="Google Pixel"
              subtitle={PIXEL_NOTE}
              steps={ANDROID_STEPS}
            />
          </TabsContent>
        </Tabs>

        <section className="mt-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight mb-3">
            Une question ?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-6">
            Si l'option d'installation n'apparaît pas, vérifiez que vous êtes
            bien dans Safari (iPhone) ou Chrome (Android), puis rechargez la page.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild>
              <Link to="/auth">Créer mon compte</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/landing">Découvrir DogWork</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}

function PlatformGuide({
  title,
  subtitle,
  steps,
}: {
  title: string;
  subtitle: string;
  steps: Step[];
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="pt-6 md:pt-8">
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-1">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <ol className="space-y-4">
          {steps.map((s, i) => (
            <li
              key={s.title}
              className="flex gap-4 p-4 rounded-lg border border-border/40 bg-card/40"
            >
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold">{s.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {s.desc}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
