import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CoachLayout } from "@/components/CoachLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, CreditCard, Check, Sparkles, MessageSquare,
  Brain, BookOpen, ArrowLeft, Loader2, ExternalLink,
} from "lucide-react";
import { motion } from "framer-motion";

const EDUCATOR_PRODUCT_ID = "prod_U8CqW7afdjr6Nx";

const features = [
  { icon: Brain, label: "Plans d'entraînement IA sur mesure", desc: "Génération personnalisée pour chaque chien" },
  { icon: MessageSquare, label: "Chatbot IA Expert", desc: "Assistant IA spécialisé en éducation canine" },
  { icon: BookOpen, label: "Cours en présentiel", desc: "Créez et vendez vos cours (30% commission)" },
  { icon: Shield, label: "Espace professionnel complet", desc: "Suivi clients, notes, alertes, statistiques" },
];

export default function CoachSubscription() {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("canceled") === "true") {
      toast({ title: "Paiement annulé", description: "Vous pouvez réessayer quand vous voulez." });
    }
  }, [searchParams, toast]);

  useEffect(() => {
    if (!session?.access_token) return;
    checkEducatorSubscription();
  }, [session?.access_token]);

  const checkEducatorSubscription = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: { Authorization: `Bearer ${session!.access_token}` },
      });
      if (error) throw error;
      if (data?.subscribed && data?.product_id === EDUCATOR_PRODUCT_ID) {
        setSubscribed(true);
        setSubscriptionEnd(data.subscription_end);
      }
    } catch (e) {
      console.error("Error checking educator sub:", e);
    } finally {
      setChecking(false);
    }
  };

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-educator-checkout");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
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
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <CoachLayout>
      <div className="space-y-5 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/coach")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Cotisation Éducateur</h1>
            <p className="text-xs text-muted-foreground">Gérez votre abonnement professionnel</p>
          </div>
        </div>

        {/* Status Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className={`border-2 ${subscribed ? "border-primary/40 bg-primary/5" : "border-border"}`}>
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
                      <p className="font-bold text-foreground">Cotisation active</p>
                      <p className="text-xs text-muted-foreground">
                        {subscriptionEnd
                          ? `Renouvellement le ${new Date(subscriptionEnd).toLocaleDateString("fr-CH")}`
                          : "Abonnement annuel"}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-primary/20 text-primary border-0">100 CHF / an</Badge>
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
                      <span className="text-3xl font-bold text-foreground">100</span>
                      <span className="text-sm text-muted-foreground">CHF / an</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">+ 30% de commission sur chaque cours vendu</p>
                  </div>
                  <Button
                    className="w-full gap-2"
                    size="lg"
                    onClick={handleCheckout}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4" />
                    )}
                    Souscrire maintenant
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Features */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="text-sm font-semibold text-foreground mb-3">Inclus dans votre cotisation</h2>
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

        {/* Commission info */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-foreground mb-1">💰 Modèle de revenus</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Vous conservez <strong className="text-foreground">70%</strong> du prix de chaque cours vendu via DogWork.
                La plateforme prélève une commission de <strong className="text-foreground">30%</strong> pour couvrir les frais
                de paiement, l'hébergement et le support technique.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Refresh */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground"
          onClick={checkEducatorSubscription}
        >
          Actualiser le statut
        </Button>
      </div>
    </CoachLayout>
  );
}
