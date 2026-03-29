import { useNavigate } from "react-router-dom";
import { Lock, Crown, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS, type OwnerTier } from "@/lib/plans";
import { motion } from "framer-motion";

interface UpgradePromptProps {
  requiredTier?: OwnerTier;
  title?: string;
  description?: string;
  compact?: boolean;
}

export function UpgradePrompt({
  requiredTier = "pro",
  title,
  description,
  compact = false,
}: UpgradePromptProps) {
  const navigate = useNavigate();
  const plan = PLANS[requiredTier];
  const Icon = requiredTier === "expert" ? Crown : Sparkles;
  const colorClass = requiredTier === "expert" ? "text-accent" : "text-primary";
  const bgClass = requiredTier === "expert" ? "bg-accent/10 border-accent/20" : "bg-primary/10 border-primary/20";

  if (compact) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate("/subscription")}
        className={`w-full flex items-center gap-3 p-3 rounded-xl border ${bgClass} transition-all hover:shadow-md`}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bgClass}`}>
          <Lock className={`h-4 w-4 ${colorClass}`} />
        </div>
        <div className="flex-1 text-left">
          <p className="text-xs font-semibold text-foreground">
            {title || `Fonctionnalité ${plan.name}`}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Passez au plan {plan.name} pour débloquer
          </p>
        </div>
        <ArrowRight className={`h-4 w-4 ${colorClass}`} />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border ${bgClass} p-6 text-center space-y-4`}
    >
      <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${bgClass}`}>
        <Icon className={`h-7 w-7 ${colorClass}`} />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-foreground">
          {title || `Disponible avec ${plan.name}`}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {description || `Cette fonctionnalité est réservée au plan ${plan.name}. Passez à ${plan.label} pour y accéder.`}
        </p>
      </div>
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium">Ce que vous débloquez :</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          {plan.marketing.highlights.slice(0, 4).map((h, i) => (
            <li key={i} className="flex items-center gap-2 justify-center">
              <Icon className={`h-3 w-3 ${colorClass}`} />
              {h}
            </li>
          ))}
        </ul>
      </div>
      <Button
        onClick={() => navigate("/subscription")}
        className={`rounded-full px-8 ${requiredTier === "expert" ? "bg-gradient-to-r from-primary to-accent hover:opacity-90" : ""}`}
      >
        Passer au {plan.name} — {plan.label}
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </motion.div>
  );
}

/** Inline lock overlay for exercise cards */
export function ExerciseLockBadge({ tier }: { tier: OwnerTier }) {
  const Icon = tier === "expert" ? Crown : Sparkles;
  const colorClass = tier === "expert" ? "text-accent" : "text-primary";
  return (
    <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] rounded-xl flex items-center justify-center z-10">
      <div className="flex items-center gap-1.5 bg-card/90 border border-border/60 rounded-full px-3 py-1 shadow-sm">
        <Icon className={`h-3 w-3 ${colorClass}`} />
        <span className="text-[10px] font-semibold text-foreground">{tier === "expert" ? "Expert" : "Pro"}</span>
      </div>
    </div>
  );
}
