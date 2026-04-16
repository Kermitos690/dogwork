import { Coins, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface CreditConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  cost: number;
  balance: number;
  featureLabel: string;
  benefit?: string;
  loading?: boolean;
}

/**
 * Dialogue de confirmation universel avant toute déduction de crédits IA.
 * Affiche : coût, solde actuel, solde après, bénéfice attendu.
 */
export function CreditConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  cost,
  balance,
  featureLabel,
  benefit,
  loading = false,
}: CreditConfirmDialogProps) {
  const navigate = useNavigate();
  const after = balance - cost;
  const insufficient = after < 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <AlertDialogTitle className="text-base">{featureLabel}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left pt-2">
            {benefit && (
              <span className="block text-sm text-foreground mb-3">{benefit}</span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-xl border border-border bg-secondary/40 p-3 space-y-2">
          <Row label="Coût de l'action" value={`−${cost}`} highlight="destructive" />
          <Row label="Solde actuel" value={`${balance}`} />
          <div className="border-t border-border/60 pt-2">
            <Row
              label="Solde après"
              value={`${after}`}
              highlight={insufficient ? "destructive" : "primary"}
              bold
            />
          </div>
        </div>

        {insufficient && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-medium text-destructive">Crédits insuffisants</p>
              <p className="text-muted-foreground mt-0.5">
                Il vous manque {Math.abs(after)} crédit{Math.abs(after) > 1 ? "s" : ""}. Rechargez dans le Shop.
              </p>
            </div>
          </div>
        )}

        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          {insufficient ? (
            <>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  navigate("/shop");
                }}
                className="w-full"
              >
                <Coins className="mr-2 h-4 w-4" />
                Recharger maintenant
              </Button>
              <AlertDialogCancel className="mt-0">Annuler</AlertDialogCancel>
            </>
          ) : (
            <>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  onConfirm();
                }}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    En cours…
                  </>
                ) : (
                  <>
                    Confirmer · −{cost} crédit{cost > 1 ? "s" : ""}
                  </>
                )}
              </AlertDialogAction>
              <AlertDialogCancel className="mt-0">Annuler</AlertDialogCancel>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Row({
  label,
  value,
  highlight,
  bold,
}: {
  label: string;
  value: string;
  highlight?: "primary" | "destructive";
  bold?: boolean;
}) {
  const colorClass =
    highlight === "destructive"
      ? "text-destructive"
      : highlight === "primary"
      ? "text-primary"
      : "text-foreground";
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`${colorClass} ${bold ? "font-bold text-base" : "font-semibold"} flex items-center gap-1`}>
        <Coins className="h-3.5 w-3.5" />
        {value}
      </span>
    </div>
  );
}
