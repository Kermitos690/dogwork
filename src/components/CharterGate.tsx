import { Link } from "react-router-dom";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useCharterAcceptance } from "@/hooks/useCharterAcceptance";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

/**
 * Blocker UI displayed when a coach has not accepted the marketplace charter yet.
 * Wraps any children that publish/edit courses or accept payments.
 */
export function CharterGate({ children }: { children: React.ReactNode }) {
  const { hasAccepted, isLoading, accept } = useCharterAcceptance();
  const [checked, setChecked] = useState(false);
  const { toast } = useToast();

  if (isLoading) return null;
  if (hasAccepted) return <>{children}</>;

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-6 w-6 text-amber-500 mt-0.5 shrink-0" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Acceptation de la Charte Coach requise
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Avant de publier ou modifier un cours sur la marketplace, vous devez accepter les
            règles d'utilisation monétaire de DogWork. Cette acceptation est unique et conserve
            une trace horodatée.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card/50 p-4 space-y-2 text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <span>100 % des paiements transitent par DogWork (aucun TWINT, IBAN, espèces...).</span>
        </div>
        <div className="flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <span>Commission plateforme : 15,8 % par transaction marketplace.</span>
        </div>
        <div className="flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <span>Détection automatique des moyens de paiement externes (blocage immédiat).</span>
        </div>
        <Link
          to="/legal/charte-coach"
          target="_blank"
          className="inline-block text-primary underline hover:no-underline pt-1"
        >
          Lire la charte complète →
        </Link>
      </div>

      <label className="flex items-start gap-2 cursor-pointer text-sm text-foreground">
        <Checkbox checked={checked} onCheckedChange={(v) => setChecked(!!v)} className="mt-0.5" />
        <span>
          J'ai lu, compris et j'accepte la Charte Coach &amp; Éducateur DogWork (version 2026-04-26).
        </span>
      </label>

      <Button
        disabled={!checked || accept.isPending}
        onClick={() =>
          accept.mutate(undefined, {
            onSuccess: () => toast({ title: "Charte acceptée", description: "Vous pouvez désormais publier vos cours." }),
            onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
          })
        }
        className="w-full sm:w-auto"
      >
        {accept.isPending ? "Enregistrement..." : "Accepter la charte"}
      </Button>
    </div>
  );
}
