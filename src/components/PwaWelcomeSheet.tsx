import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Bell, Dog, User, Sparkles, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePwaInstalled, markPwaInstalled } from "@/hooks/usePwaInstalled";
import { useAuth } from "@/hooks/useAuth";

/**
 * Écran de bienvenue affiché UNE seule fois, lors du tout premier lancement
 * de DogWork en mode standalone (PWA installée sur l'écran d'accueil).
 *
 * - Visible uniquement si l'app détecte le mode standalone fiabilisé via `usePwaInstalled`.
 * - Persistant via localStorage : `dogwork.pwa.welcomed = "1"`.
 * - Checklist terrain : actions concrètes pour démarrer immédiatement.
 * - Non bloquant : "Plus tard" disponible, l'utilisateur peut le rappeler depuis /install.
 */
const WELCOMED_KEY = "dogwork.pwa.welcomed";

function alreadyWelcomed(): boolean {
  try {
    return localStorage.getItem(WELCOMED_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberWelcomed() {
  try {
    localStorage.setItem(WELCOMED_KEY, "1");
  } catch {}
}

export function PwaWelcomeSheet() {
  const installed = usePwaInstalled();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!installed) return;
    if (alreadyWelcomed()) return;
    // Marque l'install dès qu'on est en standalone, sécurité supplémentaire.
    markPwaInstalled();
    // Petit délai pour laisser la nav s'installer (évite un flash sur cold boot iOS).
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, [installed, loading]);

  function close() {
    rememberWelcomed();
    setOpen(false);
  }

  if (!installed) return null;

  const checklist: Array<{
    icon: typeof Bell;
    label: string;
    desc: string;
    to: string;
    cta: string;
  }> = user
    ? [
        {
          icon: Bell,
          label: "Active les notifications",
          desc: "Reçois rappels d'exercices et alertes importantes.",
          to: "/settings/notifications",
          cta: "Activer",
        },
        {
          icon: Dog,
          label: "Ajoute ton premier chien",
          desc: "Crée son profil pour démarrer un suivi personnalisé.",
          to: "/dogs",
          cta: "Ajouter",
        },
        {
          icon: User,
          label: "Complète ton profil",
          desc: "Quelques infos pour adapter DogWork à ton usage.",
          to: "/profile",
          cta: "Compléter",
        },
        {
          icon: Sparkles,
          label: "Découvre ton plan",
          desc: "Ton programme d'éducation, jour par jour.",
          to: "/plan",
          cta: "Voir",
        },
      ]
    : [
        {
          icon: User,
          label: "Connecte-toi à ton compte",
          desc: "Retrouve ton suivi et tes chiens.",
          to: "/auth",
          cta: "Se connecter",
        },
        {
          icon: Sparkles,
          label: "Ou crée un compte gratuit",
          desc: "Commence ton programme en quelques minutes.",
          to: "/auth?mode=signup",
          cta: "Créer",
        },
      ];

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? close() : null)}>
      <DialogContent className="max-w-md p-0 overflow-hidden gap-0">
        <div className="bg-primary/10 px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <DialogHeader className="space-y-0.5 text-left">
                <DialogTitle className="text-base font-semibold">
                  Bienvenue dans DogWork
                </DialogTitle>
                <DialogDescription className="text-xs">
                  L'app est installée. Voici tes premières étapes.
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>
        </div>

        <ul className="divide-y divide-border">
          {checklist.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to} className="flex items-center gap-3 px-5 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">{item.label}</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                    {item.desc}
                  </p>
                </div>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="shrink-0 h-8"
                  onClick={close}
                >
                  <Link to={item.to}>
                    {item.cta}
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>

        <DialogFooter className="px-5 py-3 border-t border-border bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={close}
            className="w-full sm:w-auto"
          >
            Commencer plus tard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PwaWelcomeSheet;
