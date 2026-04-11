import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Coins, CreditCard, ExternalLink, Loader2, Package, ShoppingBag, Sparkles, Zap } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { CreditBalanceCard, CreditPacksSection, CreditHistory } from "@/components/AICredits";
import { FeaturePricingGrid, MonthlyUsageStats } from "@/components/CreditUsageDashboard";
import { useAIBalance } from "@/hooks/useAICredits";
import { useAuth } from "@/hooks/useAuth";
import { PLANS, useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Shop() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { data: wallet } = useAIBalance();
  const { session } = useAuth();
  const { tier, subscribed, subscriptionEnd, loading: subscriptionLoading } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);

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

  const handlePortal = async () => {
    if (!session?.access_token) {
      toast.error("Vous devez être connecté pour gérer l'abonnement.");
      return;
    }

    setPortalLoading(true);
    const newWindow = window.open("about:blank", "_blank");

    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      if (data?.error === "no_customer") {
        newWindow?.close();
        toast.error("Aucun abonnement actif à gérer pour le moment.");
        return;
      }

      if (data?.url) {
        if (newWindow) newWindow.location.href = data.url;
        else window.location.href = data.url;
      } else {
        newWindow?.close();
      }
    } catch (error: any) {
      newWindow?.close();
      toast.error(error.message || "Impossible d'ouvrir la gestion d'abonnement.");
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6 pb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>

        {/* Hero */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center">
              <ShoppingBag className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Shop DogWork</h1>
              <p className="text-sm text-muted-foreground">Crédits IA, abonnement et futurs produits au même endroit.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1 text-sm font-semibold">
              <Coins className="h-4 w-4" />
              {wallet?.balance ?? 0} crédits disponibles
            </Badge>
            <Badge variant="outline" className="text-sm">
              {subscribed ? `Plan ${PLANS[tier].name}` : "Aucun abonnement actif"}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Abonnement & renouvellement</h2>
                <p className="text-sm text-muted-foreground">
                  {subscribed
                    ? `Plan ${PLANS[tier].name} actif${subscriptionEnd ? ` · prochain renouvellement le ${new Date(subscriptionEnd).toLocaleDateString("fr-CH")}` : ""}`
                    : "Choisissez un plan DogWork ou gérez votre renouvellement depuis cet espace."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigate("/subscription")} variant={subscribed ? "outline" : "default"}>
                {subscribed ? "Voir l'abonnement" : "Choisir un plan"}
              </Button>
              <Button
                variant="ghost"
                onClick={handlePortal}
                disabled={!subscribed || portalLoading || subscriptionLoading}
              >
                {portalLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                Gérer le renouvellement
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">Catalogue DogWork</h2>
                  <Badge variant="outline">Bientôt</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Cette page Shop est maintenant le hub commerce du produit : crédits IA aujourd'hui, autres produits et services demain.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-border/70 bg-secondary/30 p-4">
              <p className="text-sm font-medium text-foreground">Base prête pour les futures offres</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Packs, modules premium et services additionnels pourront être ajoutés ici sans changer la navigation principale.
              </p>
            </div>
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

        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Activité & achats</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Retrouvez ici vos achats de crédits, remboursements éventuels et déductions après utilisation des outils IA.
          </p>
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
