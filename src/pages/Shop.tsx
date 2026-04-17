import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Coins, CreditCard, ExternalLink, Loader2, Package, ShoppingBag, Sparkles, Zap, ShieldCheck, Wallet, Activity } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { CreditBalanceCard, CreditPacksSection, CreditHistory, CreditOrdersHistory } from "@/components/AICredits";
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

  useEffect(() => {
    const creditsStatus = searchParams.get("credits");
    const packSlug = searchParams.get("pack");

    if (creditsStatus === "success") {
      toast.success("Paiement réussi !", {
        description: "Vérification du paiement et crédit du portefeuille...",
      });

      // Réconciliation côté client (fallback si webhook Stripe non livré)
      (async () => {
        try {
          if (session?.access_token && packSlug) {
            const { data, error } = await supabase.functions.invoke(
              "reconcile-credits-checkout",
              {
                body: { pack_slug: packSlug },
                headers: { Authorization: `Bearer ${session.access_token}` },
              },
            );
            if (error) throw error;
            if (data?.credited > 0) {
              toast.success(`+${data.credited} crédits ajoutés à votre portefeuille !`);
            }
          }
        } catch (e) {
          console.error("Reconciliation failed", e);
        } finally {
          // Polling des données utilisateur
          let attempts = 0;
          const poll = setInterval(async () => {
            attempts++;
            await queryClient.invalidateQueries({ queryKey: ["ai-balance"] });
            await queryClient.invalidateQueries({ queryKey: ["ai-ledger"] });
            await queryClient.invalidateQueries({ queryKey: ["credit-orders"] });
            if (attempts >= 5) clearInterval(poll);
          }, 2000);
        }
      })();

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

        {/* Comment ça marche */}
        <div className="rounded-2xl border border-primary/20 bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Comment fonctionnent les crédits IA&nbsp;?</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Step
              icon={<Wallet className="h-5 w-5" />}
              title="1. Achetez un pack"
              description="Choisissez le pack adapté à votre usage. Pas d'abonnement, pas d'expiration."
            />
            <Step
              icon={<ShieldCheck className="h-5 w-5" />}
              title="2. Confirmez avant déduction"
              description="Avant chaque action IA, une fenêtre indique le coût exact, votre solde et le solde après."
            />
            <Step
              icon={<Activity className="h-5 w-5" />}
              title="3. Suivez votre conso"
              description="Toutes vos déductions sont tracées dans l'historique ci-dessous, à la transaction près."
            />
          </div>
        </div>

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

        {/* Feature pricing — pédagogique */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <FeaturePricingGrid />
        </div>

        {/* Credit Orders */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <CreditOrdersHistory />
        </div>

        {/* Full Ledger History */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <CreditHistory />
        </div>
      </div>
    </AppLayout>
  );
}

function Step({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 space-y-2">
      <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
        {icon}
      </div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground leading-snug">{description}</p>
    </div>
  );
}
