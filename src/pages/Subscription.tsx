import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Crown, Sparkles, Zap, Loader2, ExternalLink, BarChart3, BookOpen, Dog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription, type TierKey } from "@/hooks/useSubscription";
import { PLANS, PLAN_ORDER, type OwnerTier } from "@/lib/plans";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const tierIcons: Record<OwnerTier, React.ReactNode> = {
  starter: <Zap className="h-6 w-6" />,
  pro: <Sparkles className="h-6 w-6" />,
  expert: <Crown className="h-6 w-6" />,
};

const tierColors: Record<OwnerTier, string> = {
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

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast({ title: "Abonnement activé ! 🎉", description: "Bienvenue dans votre nouveau plan." });
      // Retry subscription check multiple times - Stripe may take a moment to finalize
      let attempts = 0;
      const maxAttempts = 5;
      const retryCheck = async () => {
        await checkSubscription();
        attempts++;
        if (attempts < maxAttempts && !subscribed) {
          setTimeout(retryCheck, 2000);
        }
      };
      retryCheck();
    } else if (searchParams.get("canceled") === "true") {
      toast({ title: "Paiement annulé", description: "Aucun changement n'a été effectué.", variant: "destructive" });
    }
  }, [searchParams]);

  const handleCheckout = async (tierKey: TierKey) => {
    const plan = PLANS[tierKey];
    if (!plan.price_id || !session?.access_token) return;

    setCheckoutLoading(tierKey);
    const newWindow = window.open("about:blank", "_blank");
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: plan.price_id },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.url) {
        if (newWindow) newWindow.location.href = data.url;
        else window.location.href = data.url;
      } else {
        newWindow?.close();
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
    const newWindow = window.open("about:blank", "_blank");
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.error === "no_customer") {
        newWindow?.close();
        toast({ title: "Aucun abonnement", description: "Veuillez d'abord souscrire à un plan.", variant: "destructive" });
        return;
      }
      if (data?.url) {
        if (newWindow) newWindow.location.href = data.url;
        else window.location.href = data.url;
      } else {
        newWindow?.close();
      }
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
            Accédez à plus d'exercices, d'outils et de fonctionnalités pour l'éducation de votre chien
          </p>
        </div>

        {/* Current plan status */}
        {subscribed && (
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Plan actuel : {PLANS[currentTier].name}</p>
                {subscriptionEnd && (
                  <p className="text-xs text-muted-foreground">
                    Prochain renouvellement : {new Date(subscriptionEnd).toLocaleDateString("fr-CH")}
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={handlePortal} disabled={portalLoading} className="gap-1.5 text-xs">
                {portalLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
                Gérer
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {PLAN_ORDER.map((tierKey) => {
            const plan = PLANS[tierKey];
            const isCurrentTier = currentTier === tierKey;
            const isLoading = checkoutLoading === tierKey;
            const isBelowCurrent = plan.order < PLANS[currentTier].order;

            return (
              <div
                key={tierKey}
                className={`relative rounded-xl border bg-card p-5 space-y-4 transition-all ${tierColors[tierKey]} ${isCurrentTier ? "shadow-lg" : ""}`}
              >
                {plan.badge && (
                  <div className={`absolute -top-3 right-4 rounded-full px-3 py-0.5 text-xs font-semibold ${
                    tierKey === "expert" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
                  }`}>
                    {isCurrentTier && subscribed ? "Votre plan" : plan.badge}
                  </div>
                )}

                {isCurrentTier && !plan.badge && subscribed && (
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
                      <h3 className="font-bold text-lg">{plan.name}</h3>
                      <p className="text-sm font-semibold text-muted-foreground">{plan.label}</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground italic">{plan.marketing.tagline}</p>

                <ul className="space-y-2">
                  {plan.marketing.highlights.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className={`h-4 w-4 mt-0.5 shrink-0 ${tierKey === "expert" ? "text-accent" : tierKey === "pro" ? "text-primary" : "text-[hsl(var(--success))]"}`} />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Key limits */}
                <div className="flex gap-2 flex-wrap">
                  <div className="flex items-center gap-1 text-[10px] bg-secondary rounded-full px-2 py-1">
                    <Dog className="h-3 w-3" />
                    {plan.features.dogs_limit === Infinity ? "∞" : plan.features.dogs_limit} chien{plan.features.dogs_limit > 1 ? "s" : ""}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] bg-secondary rounded-full px-2 py-1">
                    <BookOpen className="h-3 w-3" />
                    {plan.features.exercise_library_limit === Infinity ? "480+" : plan.features.exercise_library_limit} exercices
                  </div>
                  {plan.features.ai_chat && (
                    <div className="flex items-center gap-1 text-[10px] bg-accent/10 text-accent rounded-full px-2 py-1">
                      IA incluse
                    </div>
                  )}
                </div>

                {tierKey === "starter" ? (
                  isCurrentTier && !subscribed ? (
                    <div className="text-center text-sm text-muted-foreground py-1">Plan actuel</div>
                  ) : null
                ) : isCurrentTier && subscribed ? (
                  <Button variant="outline" className="w-full" onClick={handlePortal} disabled={portalLoading}>
                    {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                    Gérer l'abonnement
                  </Button>
                ) : isBelowCurrent ? null : (
                  <Button
                    className={`w-full ${tierKey === "expert" ? "bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white" : ""}`}
                    onClick={() => handleCheckout(tierKey)}
                    disabled={isLoading || subLoading}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {subscribed && currentTier !== "starter" ? `Passer au ${plan.name}` : `S'abonner — ${plan.label}`}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={checkSubscription} className="text-xs text-muted-foreground">
            Actualiser le statut
          </Button>
        </div>

        <div className="text-center text-xs text-muted-foreground space-y-1 pb-2">
          <p>
            En souscrivant, vous acceptez nos{" "}
            <a href="/terms" className="underline hover:text-foreground">conditions d'abonnement</a>
            {" "}et notre{" "}
            <a href="/privacy" className="underline hover:text-foreground">politique de confidentialité</a>.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
