import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEducatorSubscription } from "@/hooks/useEducatorSubscription";
import { CoachLayout } from "@/components/CoachLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, CreditCard, Check, Sparkles, MessageSquare,
  Brain, BookOpen, ArrowLeft, Loader2, ExternalLink,
  AlertTriangle, Percent, Link2, CheckCircle2, XCircle,
} from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { icon: Brain, label: "Plans d'entraînement IA sur mesure", desc: "Génération automatique et personnalisée pour chaque chien" },
  { icon: MessageSquare, label: "Chatbot IA Expert", desc: "Assistant IA spécialisé en éducation canine, disponible 24/7" },
  { icon: BookOpen, label: "Création et vente de cours", desc: "Proposez vos cours en présentiel directement sur la plateforme" },
  { icon: Shield, label: "Espace professionnel complet", desc: "Suivi clients, notes, alertes, statistiques avancées" },
];

interface ConnectStatus {
  connected: boolean;
  onboarding_complete: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
}

export default function CoachSubscription() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const { subscribed, subscriptionEnd, loading: checking, checkSubscription } = useEducatorSubscription();

  const checkConnectStatus = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const { data, error } = await supabase.functions.invoke("connect-status", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {},
      });
      if (!error && data) setConnectStatus(data);
    } catch (e) {
      console.error("Connect status check failed:", e);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (searchParams.get("subscription") === "success") {
      toast({ title: "🎉 Bienvenue !", description: "Votre cotisation est active." });
      checkSubscription();
    }
    if (searchParams.get("canceled") === "true") {
      toast({ title: "Paiement annulé", description: "Vous pouvez réessayer quand vous voulez." });
    }
    if (searchParams.get("connect") === "complete") {
      toast({ title: "✅ Stripe Connect", description: "Votre compte de paiement est en cours de vérification." });
      checkConnectStatus();
    }
    if (searchParams.get("connect") === "refresh") {
      toast({ title: "Lien expiré", description: "Veuillez relancer l'inscription Stripe Connect." });
    }
  }, [searchParams, toast, checkSubscription, checkConnectStatus]);

  useEffect(() => {
    checkConnectStatus();
  }, [checkConnectStatus]);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-educator-checkout");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePortal = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) {
        // If no Stripe customer exists, redirect to checkout instead
        const errorBody = typeof error === "object" && "context" in error ? error : null;
        toast({ title: "Info", description: "Redirection vers la page de paiement...", });
        await handleCheckout();
        return;
      }
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectOnboard = async () => {
    setConnectLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("connect-onboard", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data?.error) {
        // Platform Connect not yet activated — show clear message
        toast({
          title: "Stripe Connect indisponible",
          description: "La plateforme n'a pas encore activé Stripe Connect. Contactez l'administrateur.",
          variant: "destructive",
        });
        return;
      }
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      const msg = e.message || "";
      if (msg.includes("connect") || msg.includes("platform")) {
        toast({
          title: "Stripe Connect indisponible",
          description: "Le module Connect n'est pas encore configuré. L'administrateur doit l'activer sur la plateforme Stripe.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Erreur", description: msg, variant: "destructive" });
      }
    } finally {
      setConnectLoading(false);
    }
  };

  return (
    <CoachLayout>
      <div className="space-y-5 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3">
          {subscribed && (
            <Button variant="ghost" size="icon" onClick={() => navigate("/coach")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-lg font-bold text-foreground">Cotisation Éducateur</h1>
            <p className="text-xs text-muted-foreground">
              {subscribed ? "Gérez votre abonnement et vos paiements" : "Activez votre espace professionnel"}
            </p>
          </div>
        </div>

        {/* Paywall notice if not subscribed */}
        {!checking && !subscribed && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-4 flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Cotisation requise</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Pour accéder à votre espace éducateur et à l'ensemble des fonctionnalités professionnelles,
                    vous devez d'abord souscrire à la cotisation annuelle.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Status / Checkout Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className={`border-2 ${subscribed ? "border-primary/40 bg-primary/5" : "border-primary/20"}`}>
            <CardContent className="p-5">
              {checking ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : subscribed ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">Cotisation active ✓</p>
                      <p className="text-xs text-muted-foreground">
                        {subscriptionEnd
                          ? `Renouvellement le ${new Date(subscriptionEnd).toLocaleDateString("fr-CH")}`
                          : "Abonnement annuel"}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-primary/20 text-primary border-0">200 CHF / an</Badge>
                  <Button
                    variant="outline"
                    className="w-full gap-2 mt-2"
                    onClick={handlePortal}
                    disabled={loading}
                  >
                    <CreditCard className="h-4 w-4" />
                    Gérer mon abonnement
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="h-7 w-7 text-primary" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground">DogWork Éducateur</h2>
                    <div className="flex items-baseline justify-center gap-1 mt-1">
                      <span className="text-3xl font-bold text-foreground">200</span>
                      <span className="text-sm text-muted-foreground">CHF / an</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Accès complet pour 1 an à toutes les fonctionnalités professionnelles
                    </p>
                  </div>
                  <Button
                    className="w-full gap-2"
                    size="lg"
                    onClick={handleCheckout}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    Souscrire — 200 CHF / an
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Stripe Connect Section - only shown when subscribed */}
        {subscribed && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <Card className={`border-2 ${connectStatus?.onboarding_complete ? "border-green-500/30 bg-green-500/5" : "border-blue-500/20 bg-blue-500/5"}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-foreground">Compte de paiement</h3>
                </div>

                {connectStatus?.onboarding_complete ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-foreground">Compte vérifié et actif</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        {connectStatus.charges_enabled ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-destructive" />
                        )}
                        <span className="text-muted-foreground">Paiements</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {connectStatus.payouts_enabled ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-destructive" />
                        )}
                        <span className="text-muted-foreground">Virements</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Vos revenus de cours seront automatiquement versés sur votre compte bancaire après déduction de la commission plateforme.
                    </p>
                  </div>
                ) : connectStatus?.connected ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />
                      <span className="text-sm text-foreground">Inscription en cours</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Votre compte est en cours de vérification. Cliquez ci-dessous pour compléter votre inscription.
                    </p>
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={handleConnectOnboard}
                      disabled={connectLoading}
                    >
                      {connectLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                      Compléter mon inscription
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Connectez votre compte bancaire pour recevoir automatiquement les paiements de vos cours,
                      après déduction de la <strong className="text-foreground">commission de 15.8%</strong>.
                    </p>
                    <Button
                      className="w-full gap-2"
                      onClick={handleConnectOnboard}
                      disabled={connectLoading}
                    >
                      {connectLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                      Configurer mes paiements
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Features included */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="text-sm font-semibold text-foreground mb-3">✨ Inclus dans votre cotisation</h2>
          <div className="space-y-2">
            {features.map((f, i) => (
              <Card key={i} className="bg-card/60 border-border/40">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <f.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{f.label}</p>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Commission info - updated to 15.8% */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-foreground">Commission sur les cours</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Toute transaction effectuée via la plateforme DogWork pour les cours en présentiel
                est soumise à une <strong className="text-foreground">commission de 15.8%</strong> prélevée
                automatiquement pour couvrir les frais liés à l'application (hébergement, paiement sécurisé,
                support technique, développement).
              </p>
              <div className="bg-background/60 rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-medium text-foreground">Exemple concret :</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Cours vendu à</span>
                  <span className="font-semibold text-foreground">100 CHF</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Commission plateforme (15.8%)</span>
                  <span className="font-medium text-destructive">– 15.80 CHF</span>
                </div>
                <div className="border-t border-border pt-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">Vous recevez</span>
                  <span className="font-bold text-primary">84.20 CHF</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Refresh */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground"
          onClick={() => { checkSubscription(); checkConnectStatus(); }}
        >
          Actualiser le statut
        </Button>
      </div>
    </CoachLayout>
  );
}
