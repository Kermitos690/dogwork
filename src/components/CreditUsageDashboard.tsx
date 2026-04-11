import { useMemo } from "react";
import { useAIBalance, useAILedger, useAIFeatures, type AILedgerEntry, type AIFeature } from "@/hooks/useAICredits";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Coins, TrendingDown, BarChart3, Zap, MessageSquare, Brain,
  FileText, Sparkles, PenTool, ClipboardList, BookOpen, Target, RefreshCw
} from "lucide-react";
import { format, startOfMonth, isAfter } from "date-fns";
import { fr } from "date-fns/locale";

const featureIcons: Record<string, React.ReactNode> = {
  chat: <MessageSquare className="h-4 w-4" />,
  chat_general: <MessageSquare className="h-4 w-4" />,
  behavior_analysis: <Brain className="h-4 w-4" />,
  behavior_summary: <Brain className="h-4 w-4" />,
  dog_profile_analysis: <Target className="h-4 w-4" />,
  education_plan: <BookOpen className="h-4 w-4" />,
  plan_generator: <ClipboardList className="h-4 w-4" />,
  adoption_plan: <FileText className="h-4 w-4" />,
  connection_guide: <Sparkles className="h-4 w-4" />,
  content_rewrite: <PenTool className="h-4 w-4" />,
  exercise_enrich: <Zap className="h-4 w-4" />,
  marketing_content: <PenTool className="h-4 w-4" />,
  record_enrichment: <RefreshCw className="h-4 w-4" />,
};

interface UsageStat {
  featureCode: string;
  label: string;
  count: number;
  totalCredits: number;
  unitCost: number;
}

/**
 * Grille tarifaire — montre le coût en crédits de chaque fonctionnalité IA
 */
export function FeaturePricingGrid() {
  const { data: features, isLoading } = useAIFeatures();

  if (isLoading) return <Skeleton className="h-48" />;
  if (!features?.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Tarifs par fonctionnalité</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Chaque action IA consomme un nombre fixe de crédits. Consultez cette grille pour estimer vos dépenses.
      </p>
      <div className="grid gap-2">
        {features.map((f: AIFeature) => (
          <div
            key={f.code}
            className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5"
          >
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
              {featureIcons[f.code] || <Coins className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{f.label}</p>
              {f.description && (
                <p className="text-xs text-muted-foreground truncate">{f.description}</p>
              )}
            </div>
            <Badge variant="secondary" className="gap-1 shrink-0 font-semibold">
              <Coins className="h-3 w-3" />
              {f.credits_cost}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Statistiques de consommation du mois en cours
 */
export function MonthlyUsageStats() {
  const { data: entries, isLoading: loadingLedger } = useAILedger(200);
  const { data: wallet, isLoading: loadingWallet } = useAIBalance();
  const { data: features } = useAIFeatures();

  const stats = useMemo(() => {
    if (!entries?.length) return { byFeature: [] as UsageStat[], totalConsumed: 0, totalActions: 0 };

    const monthStart = startOfMonth(new Date());
    const monthlyEntries = entries.filter(
      (e: AILedgerEntry) =>
        e.operation_type === "consumption" &&
        isAfter(new Date(e.created_at), monthStart)
    );

    const featureMap = new Map<string, { count: number; total: number }>();
    let totalConsumed = 0;
    let totalActions = 0;

    for (const entry of monthlyEntries) {
      const code = entry.feature_code || "unknown";
      const credits = Math.abs(entry.credits_delta);
      totalConsumed += credits;
      totalActions++;

      const existing = featureMap.get(code) || { count: 0, total: 0 };
      existing.count++;
      existing.total += credits;
      featureMap.set(code, existing);
    }

    const featureLookup = new Map(features?.map((f: AIFeature) => [f.code, f]) || []);

    const byFeature: UsageStat[] = Array.from(featureMap.entries())
      .map(([code, data]) => ({
        featureCode: code,
        label: featureLookup.get(code)?.label || code,
        count: data.count,
        totalCredits: data.total,
        unitCost: featureLookup.get(code)?.credits_cost || Math.round(data.total / data.count),
      }))
      .sort((a, b) => b.totalCredits - a.totalCredits);

    return { byFeature, totalConsumed, totalActions };
  }, [entries, features]);

  if (loadingLedger || loadingWallet) return <Skeleton className="h-56" />;

  const monthLabel = format(new Date(), "MMMM yyyy", { locale: fr });
  const balance = wallet?.balance ?? 0;
  const projectedRemaining = balance;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Consommation — {monthLabel}</h3>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-border/60">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Utilisés</p>
            <p className="text-xl font-bold text-destructive">{stats.totalConsumed}</p>
            <p className="text-[10px] text-muted-foreground">crédits</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Actions</p>
            <p className="text-xl font-bold">{stats.totalActions}</p>
            <p className="text-[10px] text-muted-foreground">appels IA</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Solde</p>
            <p className="text-xl font-bold text-primary">{projectedRemaining}</p>
            <p className="text-[10px] text-muted-foreground">restants</p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown by feature */}
      {stats.byFeature.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Détail par fonctionnalité</p>
          {stats.byFeature.map((s) => {
            const pct = stats.totalConsumed > 0 ? (s.totalCredits / stats.totalConsumed) * 100 : 0;
            return (
              <div key={s.featureCode} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-muted-foreground shrink-0">
                      {featureIcons[s.featureCode] || <Coins className="h-3.5 w-3.5" />}
                    </span>
                    <span className="truncate font-medium">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                    <span>{s.count}×</span>
                    <span className="font-semibold text-foreground">−{s.totalCredits}</span>
                  </div>
                </div>
                <Progress value={pct} className="h-1.5" />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6">
          <TrendingDown className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Aucune utilisation IA ce mois</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Vos crédits seront débités automatiquement lors de chaque action IA
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Estimateur simple : combien d'actions je peux encore faire ?
 */
export function CreditEstimator() {
  const { data: wallet, isLoading: loadingWallet } = useAIBalance();
  const { data: features, isLoading: loadingFeatures } = useAIFeatures();

  if (loadingWallet || loadingFeatures) return <Skeleton className="h-32" />;

  const balance = wallet?.balance ?? 0;

  if (!features?.length || balance === 0) return null;

  const popular = features
    .filter((f: AIFeature) => ["chat", "chat_general", "behavior_analysis", "plan_generator", "education_plan"].includes(f.code))
    .slice(0, 4);

  if (!popular.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Coins className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Estimation du solde</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Avec vos <strong>{balance} crédits</strong> restants, vous pouvez encore utiliser :
      </p>
      <div className="grid grid-cols-2 gap-2">
        {popular.map((f: AIFeature) => {
          const remaining = Math.floor(balance / f.credits_cost);
          return (
            <div
              key={f.code}
              className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2.5"
            >
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                {featureIcons[f.code] || <Coins className="h-3.5 w-3.5" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{f.label}</p>
                <p className="text-sm font-bold">
                  {remaining}× <span className="text-xs font-normal text-muted-foreground">({f.credits_cost} cr.)</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
