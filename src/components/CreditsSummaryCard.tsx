import { useNavigate } from "react-router-dom";
import { Coins, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAIBalance } from "@/hooks/useAICredits";
import { MONETIZATION_DEFAULTS } from "@/lib/monetization";
import { cn } from "@/lib/utils";

interface CreditsSummaryCardProps {
  /** Path to the role-specific credits page (e.g. "/credits", "/coach/credits"). */
  creditsPath?: string;
  /** Optional monthly quota included with the user's plan. */
  monthlyIncluded?: number;
  /** Short label shown next to the quota (e.g. "Plan Pro"). */
  planLabel?: string;
  className?: string;
}

/**
 * Carte universelle "Solde crédits IA" pour dashboards.
 * Affiche solde, quota mensuel inclus si fourni, et raccourci vers la page crédits.
 */
export function CreditsSummaryCard({
  creditsPath = "/credits",
  monthlyIncluded,
  planLabel,
  className,
}: CreditsSummaryCardProps) {
  const navigate = useNavigate();
  const { data: wallet, isLoading } = useAIBalance();
  const balance = wallet?.balance ?? 0;
  const isLow = balance <= MONETIZATION_DEFAULTS.lowBalanceWarning;
  const isCritical = balance <= MONETIZATION_DEFAULTS.lowBalanceCritical;

  return (
    <Card
      className={cn(
        "border-primary/20 bg-gradient-to-br from-primary/5 via-card to-transparent cursor-pointer card-press transition-colors",
        isCritical && "border-destructive/40 from-destructive/5",
        className,
      )}
      onClick={() => navigate(creditsPath)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") navigate(creditsPath);
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
              isCritical ? "bg-destructive/15" : "bg-primary/15",
            )}
          >
            <Coins
              className={cn(
                "h-5 w-5",
                isCritical ? "text-destructive" : "text-primary",
              )}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Crédits IA
            </p>
            {isLoading ? (
              <Skeleton className="h-7 w-20 mt-1" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground tabular-nums">
                  {balance}
                </span>
                {typeof monthlyIncluded === "number" && monthlyIncluded > 0 && (
                  <span className="text-[11px] text-muted-foreground">
                    · {monthlyIncluded}/mois inclus
                  </span>
                )}
              </div>
            )}
            {planLabel && (
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {planLabel}
              </p>
            )}
            {isLow && !isLoading && (
              <p
                className={cn(
                  "text-[11px] mt-1 font-medium flex items-center gap-1",
                  isCritical ? "text-destructive" : "text-amber-500",
                )}
              >
                <Sparkles className="h-3 w-3" />
                {isCritical
                  ? "Solde très bas — pensez à recharger"
                  : "Solde bientôt épuisé"}
              </p>
            )}
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}
