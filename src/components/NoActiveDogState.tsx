import { Dog, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface NoActiveDogStateProps {
  /** Contextual title — e.g. "Plan d'entraînement", "Statistiques". */
  title?: string;
  /** Why this page needs a dog. */
  description?: string;
}

/**
 * Premium empty state shown when an owner-side page is opened
 * without an active dog. Replaces the bare "Ajoutez d'abord un chien" line.
 */
export function NoActiveDogState({
  title = "Aucun chien sélectionné",
  description = "Cette section s'organise autour du chien actif. Ajoutez un compagnon pour démarrer.",
}: NoActiveDogStateProps) {
  const navigate = useNavigate();
  return (
    <div className="pt-8 pb-10 flex flex-col items-center text-center gap-5 animate-fade-in">
      <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
        <Dog className="h-10 w-10 text-primary" />
      </div>
      <div className="space-y-1.5 max-w-[300px]">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-[260px]">
        <Button onClick={() => navigate("/onboarding")} className="h-12 rounded-2xl">
          <Plus className="h-4 w-4" /> Ajouter un chien
        </Button>
        <Button variant="ghost" onClick={() => navigate("/dogs")} className="h-10 rounded-xl text-xs">
          Voir mes chiens
        </Button>
      </div>
    </div>
  );
}
