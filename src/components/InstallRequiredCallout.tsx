import { Link } from "react-router-dom";
import { Smartphone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstalled } from "@/hooks/usePwaInstalled";

/**
 * Recommandation douce d'installation pour fonctionnalités sensibles
 * (push notifications, promenade GPS, raccourci rapide…).
 * - Cachée si l'app est déjà installée.
 * - Non bloquante : pure incitation visible.
 */
export function InstallRequiredCallout({
  feature,
  className = "",
}: {
  feature?: string;
  className?: string;
}) {
  const { installed } = usePwaInstalled();
  if (installed) return null;

  return (
    <div
      className={`rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-start gap-3 ${className}`}
      role="region"
      aria-label="Installation recommandée"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Smartphone className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="text-sm font-semibold leading-tight">
            Installation recommandée{feature ? ` pour ${feature}` : ""}
          </p>
          <p className="text-xs text-muted-foreground leading-snug mt-1">
            Pour utiliser DogWork comme une vraie app — notifications fiables, plein écran,
            raccourci direct — installe-la sur ton écran d'accueil.
          </p>
        </div>
        <Button size="sm" asChild variant="default" className="h-8">
          <Link to="/install">
            Installer <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default InstallRequiredCallout;
