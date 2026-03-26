import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Crown, Sparkles, Zap, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription, TIERS, type TierKey } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const tierFeatures: Record<TierKey, string[]> = {
  starter: [
    "Programme standard 28 jours",
    "Suivi de progression",
    "Journal quotidien",
    "Bibliothèque d'exercices",
    "Statistiques de base",
  ],
  pro: [
    "Tout Starter, plus :",
    "Plans personnalisés par IA",
    "Adaptation au profil du chien",
    "Évaluation comportementale",
    "Objectifs personnalisés",
  ],
  expert: [
    "Tout Pro, plus :",
    "Chatbot IA d'assistance",
    "Conseils en temps réel",
    "Analyse avancée",
    "Support prioritaire",
  ],
};

const tierIcons: Record<TierKey, React.ReactNode> = {
  starter: <Zap className="h-6 w-6" />,
  pro: <Sparkles className="h-6 w-6" />,
  expert: <Crown className="h-6 w-6" />,
};

const tierColors: Record<TierKey, string> = {
  starter: "border-border",
  pro: "border-primary ring-2 ring-primary/20",
  expert: "border-accent ring-2 ring-accent/20",
};

export default function Subscription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const { tier: currentTier, subscribed, subscriptionEnd, loading: subLoading, checkSubscription } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState<TierKey | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // Handle success/cancel from Stripe
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast({ title: "Abonnement activé ! 🎉", description: "Bienvenue dans votre nouveau plan." });
      checkSubscription();
    } else if (searchParams.get("canceled") === "true") {
      toast({ title: "Paiement annulé", description: "Aucun changement n'a été effectué.", variant: "destructive" });
    }
  }, [searchParams, checkSubscription]);

  const handleCheckout = async (tierKey: TierKey) => {
    const tier = TIERS[tierKey];
    if (!tier.price_id || !session?.access_token) return;

    setCheckoutLoading(tierKey);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: tier.price_id },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.assign(data.url);
      }
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message || "Impossible de lancer le paiement.", variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    if (!session?.access_token) return;
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.error === "no_customer") {
        toast({ title: "Aucun abonnement", description: "Veuillez d'abord souscrire à un plan pour accéder au portail de gestion.", variant: "destructive" });
        return;
      }
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message || "Impossible d'ouvrir le portail.", variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6 pt-4 pb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Choisissez votre plan</h1>
          <p className="text-sm text-muted-foreground">
            Débloquez des fonctionnalités avancées pour l'éducation de votre chien
          </p>
        </div>

        <div className="space-y-4">
          {(Object.keys(TIERS) as TierKey[]).map((tierKey) => {
            const tier = TIERS[tierKey];
            const isCurrentTier = currentTier === tierKey;
            const isLoading = checkoutLoading === tierKey;

            return (
              <div
                key={tierKey}
                className={`relative rounded-xl border bg-card p-5 space-y-4 transition-all ${tierColors[tierKey]} ${isCurrentTier ? "shadow-lg" : ""}`}
              >
                {isCurrentTier && subscribed && (
                  <div className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                    Votre plan
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${tierKey === "expert" ? "bg-accent/20 text-accent" : tierKey === "pro" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {tierIcons[tierKey]}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{tier.name}</h3>
                      <p className="text-sm font-semibold text-muted-foreground">{tier.label}</p>
                    </div>
                  </div>
                </div>

                <ul className="space-y-2">
                  {tierFeatures[tierKey].map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className={`h-4 w-4 mt-0.5 shrink-0 ${tierKey === "expert" ? "text-accent" : tierKey === "pro" ? "text-primary" : "text-success"}`} />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {tierKey === "starter" ? (
                  isCurrentTier && !subscribed ? (
                    <div className="text-center text-sm text-muted-foreground py-1">Plan actuel</div>
                  ) : null
                ) : isCurrentTier && subscribed ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handlePortal}
                    disabled={portalLoading}
                  >
                    {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                    Gérer l'abonnement
                  </Button>
                ) : (
                  <Button
                    className={`w-full ${tierKey === "expert" ? "bg-accent hover:bg-accent/90 text-accent-foreground" : ""}`}
                    onClick={() => handleCheckout(tierKey)}
                    disabled={isLoading || subLoading}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {subscribed && currentTier !== "starter" ? "Changer de plan" : "S'abonner"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {subscribed && subscriptionEnd && (
          <div className="text-center text-xs text-muted-foreground">
            Prochain renouvellement : {new Date(subscriptionEnd).toLocaleDateString("fr-CH")}
          </div>
        )}

        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={checkSubscription} className="text-xs text-muted-foreground">
            Actualiser le statut
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
