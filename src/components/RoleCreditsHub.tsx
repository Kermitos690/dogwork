import { useNavigate } from "react-router-dom";
import {
  Coins,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CreditPacksSection,
  CreditOrdersHistory,
  CreditHistory,
} from "@/components/AICredits";
import { useAIBalance } from "@/hooks/useAICredits";

export interface CreditUsageItem {
  cost: string;
  label: string;
}

interface RoleCreditsHubProps {
  /** Title displayed at the top, e.g. "Crédits IA Coach". */
  title: string;
  subtitle: string;
  /** Monthly quota included with this role's plan. */
  monthlyQuota: number;
  planLabel: string;
  /** What this role uses credits for (3-5 short bullets). */
  proUsages: string[];
  /** Common cost reference for this role. */
  costGuide?: CreditUsageItem[];
  /** Where the back button leads (defaults to -1). */
  backPath?: string;
  /** Disable the buy button if Stripe isn't ready for this role yet. */
  stripeReady?: boolean;
}

const DEFAULT_COSTS: CreditUsageItem[] = [
  { cost: "1 crédit", label: "Question simple, conseil rapide, résumé court" },
  { cost: "2–3 crédits", label: "Analyse simple, adaptation d'exercice, résumé de journal" },
  { cost: "5 crédits", label: "Plan personnalisé, rapport structuré, recommandation d'adoption" },
  { cost: "10+ crédits", label: "Rapport PDF complet, audit comportemental avancé, plan multi-semaines" },
];

/**
 * Hub Crédits IA réutilisable par rôle (owner / coach / shelter).
 * Affiche solde, quota mensuel inclus, usages métier, packs, historique.
 * Aucune donnée fictive : tout vient des vues canoniques (ai_credit_wallets, v_active_credit_packs).
 */
export function RoleCreditsHub({
  title,
  subtitle,
  monthlyQuota,
  planLabel,
  proUsages,
  costGuide = DEFAULT_COSTS,
  backPath,
  stripeReady = true,
}: RoleCreditsHubProps) {
  const navigate = useNavigate();
  const { data: wallet, isLoading } = useAIBalance();
  const balance = wallet?.balance ?? 0;

  return (
    <div className="space-y-6 pb-8">
      <button
        onClick={() => (backPath ? navigate(backPath) : navigate(-1))}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      {/* Hero */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Coins className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{subtitle}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Stat
            label="Solde actuel"
            value={isLoading ? "…" : String(balance)}
            tone={balance > 5 ? "primary" : "warning"}
          />
          <Stat
            label="Inclus / mois"
            value={`${monthlyQuota}`}
            sublabel={planLabel}
          />
          <Stat
            label="Achetés (cumul)"
            value={isLoading ? "…" : String(wallet?.lifetime_purchased ?? 0)}
            sublabel="Hors crédits mensuels"
          />
        </div>
      </div>

      {/* Usages métier */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">À quoi servent vos crédits</h2>
          </div>
          <ul className="space-y-2">
            {proUsages.map((u, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span className="leading-relaxed">{u}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Coût des actions */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Coût des actions IA</h2>
          </div>
          <div className="space-y-2">
            {costGuide.map((c, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-border/60 bg-secondary/30 p-3"
              >
                <Badge variant="secondary" className="shrink-0 font-semibold">
                  {c.cost}
                </Badge>
                <span className="text-sm text-foreground leading-snug">{c.label}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Avant chaque action IA, une confirmation indique le coût exact et votre solde.
          </p>
        </CardContent>
      </Card>

      {/* Packs */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        {stripeReady ? (
          <CreditPacksSection />
        ) : (
          <div className="text-center py-6 space-y-2">
            <ShieldCheck className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <p className="text-sm font-medium text-foreground">
              Achat de crédits bientôt disponible
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              La passerelle de paiement n'est pas encore active pour votre espace.
              Vos crédits mensuels inclus restent utilisables.
            </p>
          </div>
        )}
      </div>

      {/* Historique achats */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <CreditOrdersHistory />
      </div>

      {/* Historique consommation */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <CreditHistory />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sublabel,
  tone,
}: {
  label: string;
  value: string;
  sublabel?: string;
  tone?: "primary" | "warning";
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </p>
      <p
        className={`text-2xl font-bold tabular-nums mt-0.5 ${
          tone === "warning" ? "text-amber-500" : "text-foreground"
        }`}
      >
        {value === "…" ? <Skeleton className="h-7 w-12 inline-block" /> : value}
      </p>
      {sublabel && (
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{sublabel}</p>
      )}
    </div>
  );
}
