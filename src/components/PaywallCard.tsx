/**
 * Reusable paywall / upsell card.
 *
 * Renders the right CTA based on the monetization trigger:
 * - zero/low balance → "Buy credits"
 * - repeated use / plan limit → "Upgrade plan"
 *
 * Intentionally lightweight: it only renders, it does not decide.
 * Use `useMonetization()` to compute the trigger upstream.
 */
import { useNavigate } from "react-router-dom";
import { Sparkles, Zap, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import type { UpsellTrigger } from "@/lib/monetization";

interface PaywallCardProps {
  trigger: UpsellTrigger;
  balance: number;
  required?: number;
  suggestedPath: "buy_pack" | "upgrade_plan";
  compact?: boolean;
}

const COPY: Record<
  UpsellTrigger,
  { title: string; description: (b: number, r?: number) => string; icon: typeof Sparkles }
> = {
  zero_balance: {
    title: "Crédits IA épuisés",
    description: () => "Rechargez votre solde pour continuer à utiliser l'IA.",
    icon: AlertCircle,
  },
  low_balance: {
    title: "Solde IA bas",
    description: (b) => `Il vous reste ${b} crédit${b > 1 ? "s" : ""}. Anticipez votre prochaine action.`,
    icon: Zap,
  },
  repeated_use: {
    title: "Vous utilisez l'IA régulièrement",
    description: () => "Un plan supérieur inclut plus de crédits mensuels et de meilleurs tarifs.",
    icon: Sparkles,
  },
  plan_limit: {
    title: "Limite de votre plan atteinte",
    description: () => "Passez à un plan supérieur pour débloquer cette fonctionnalité.",
    icon: Sparkles,
  },
  premium_feature: {
    title: "Fonctionnalité premium",
    description: () => "Cette action nécessite un plan supérieur.",
    icon: Sparkles,
  },
};

export function PaywallCard({
  trigger,
  balance,
  required,
  suggestedPath,
  compact = false,
}: PaywallCardProps) {
  const navigate = useNavigate();
  const copy = COPY[trigger];
  const Icon = copy.icon;
  const goBuy = () => navigate("/shop");
  const goUpgrade = () => navigate("/subscription");

  const primaryAction =
    suggestedPath === "buy_pack"
      ? { label: "Acheter des crédits", onClick: goBuy }
      : { label: "Voir les plans", onClick: goUpgrade };

  const secondaryAction =
    suggestedPath === "buy_pack"
      ? { label: "Voir les plans", onClick: goUpgrade }
      : { label: "Acheter des crédits", onClick: goBuy };

  if (compact) {
    return (
      <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{copy.title}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {copy.description(balance, required)}
          </p>
        </div>
        <Button size="sm" variant="default" onClick={primaryAction.onClick} className="shrink-0">
          {primaryAction.label}
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-foreground">{copy.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{copy.description(balance, required)}</p>
          {required !== undefined && (
            <p className="text-xs text-muted-foreground mt-2">
              Requis : <span className="font-semibold text-foreground">{required} cr.</span> · Solde :{" "}
              <span className="font-semibold text-foreground">{balance} cr.</span>
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button onClick={primaryAction.onClick} className="flex-1">
          {primaryAction.label}
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
        <Button variant="outline" onClick={secondaryAction.onClick} className="flex-1">
          {secondaryAction.label}
        </Button>
      </div>
    </motion.div>
  );
}
