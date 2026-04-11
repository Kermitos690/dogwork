import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Coins, Sparkles, Zap } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { CreditBalanceCard, CreditPacksSection, CreditHistory } from "@/components/AICredits";
import { FeaturePricingGrid, MonthlyUsageStats } from "@/components/CreditUsageDashboard";
import { useAIBalance } from "@/hooks/useAICredits";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function Shop() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { data: wallet } = useAIBalance();

  // Handle Stripe redirect results
  useEffect(() => {
    const creditsStatus = searchParams.get("credits");
    const packSlug = searchParams.get("pack");

    if (creditsStatus === "success") {
      // Poll for updated balance after Stripe webhook processes
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        await queryClient.invalidateQueries({ queryKey: ["ai-balance"] });
        await queryClient.invalidateQueries({ queryKey: ["ai-ledger"] });
        if (attempts >= 5) clearInterval(poll);
      }, 2000);

      toast.success("Paiement réussi !", {
        description: `Vos crédits IA (pack ${packSlug || ""}) sont en cours de chargement...`,
      });

      // Clean URL
      setSearchParams({}, { replace: true });
    } else if (creditsStatus === "cancel") {
      toast.info("Achat annulé");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, queryClient]);

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6 pb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>

        {/* Hero */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Boutique IA</h1>
              <p className="text-sm text-muted-foreground">Rechargez vos crédits pour utiliser l'intelligence artificielle</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="gap-1 text-sm font-semibold">
              <Coins className="h-4 w-4" />
              {wallet?.balance ?? 0} crédits disponibles
            </Badge>
          </div>
        </div>

        {/* Current Balance */}
        <CreditBalanceCard />

        {/* Usage stats */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Utilisation ce mois</h2>
          </div>
          <MonthlyUsageStats />
        </div>

        {/* Buy Packs */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <CreditPacksSection />
        </div>

        {/* Feature pricing */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <FeaturePricingGrid />
        </div>

        {/* History */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <CreditHistory />
        </div>
      </div>
    </AppLayout>
  );
}
