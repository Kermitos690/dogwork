import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ShelterLayout } from "@/components/ShelterLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, CheckCircle, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

const SHELTER_PRODUCT_ID = "prod_UDKcjmnJnM7pBo";
const SHELTER_PRICE_ID = "price_1TEtxAPshPrEibTgsDFHr8Nw";

export default function ShelterSubscription() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const { data: subscription, refetch } = useQuery({
    queryKey: ["shelter-subscription", user?.id],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const isSubscribed = subscription?.subscribed && subscription?.product_id === SHELTER_PRODUCT_ID;

  const handleCheckout = async () => {
    setLoading("checkout");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non connecté");
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: SHELTER_PRICE_ID },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
    setLoading(null);
  };

  const handlePortal = async () => {
    setLoading("portal");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non connecté");
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.error === "no_customer") {
        toast({ title: "Aucun abonnement", description: "Veuillez d'abord souscrire à un plan pour accéder au portail de gestion.", variant: "destructive" });
        return;
      }
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
    setLoading(null);
  };

  return (
    <ShelterLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pt-14 pb-8 space-y-4">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Abonnement Refuge
        </h1>

        <Card className={isSubscribed ? "border-primary/30" : ""}>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-foreground">DogWork Refuge</p>
                <p className="text-xs text-muted-foreground">Gestion complète de votre refuge</p>
              </div>
              {isSubscribed ? (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-0 gap-1">
                  <CheckCircle className="h-3 w-3" /> Actif
                </Badge>
              ) : (
                <Badge variant="outline">Inactif</Badge>
              )}
            </div>

            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p>✓ Gestion illimitée des animaux</p>
              <p>✓ Gestion du personnel</p>
              <p>✓ Suivi post-adoption</p>
              <p>✓ Messagerie avec l'administrateur</p>
              <p>✓ Statistiques et rapports</p>
              <p>✓ Gestion des espaces</p>
            </div>

            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">500 CHF<span className="text-sm font-normal text-muted-foreground">/an</span></p>
            </div>

            {isSubscribed ? (
              <div className="space-y-2">
                {subscription?.subscription_end && (
                  <p className="text-xs text-muted-foreground text-center">
                    Renouvellement le {new Date(subscription.subscription_end).toLocaleDateString("fr-FR")}
                  </p>
                )}
                <Button variant="outline" className="w-full gap-2" onClick={handlePortal} disabled={loading === "portal"}>
                  <ExternalLink className="h-4 w-4" />
                  {loading === "portal" ? "Chargement..." : "Gérer mon abonnement"}
                </Button>
              </div>
            ) : (
              <Button className="w-full gap-2" onClick={handleCheckout} disabled={loading === "checkout"}>
                <CreditCard className="h-4 w-4" />
                {loading === "checkout" ? "Redirection..." : "S'abonner"}
              </Button>
            )}

            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => refetch()}>
              Rafraîchir le statut
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </ShelterLayout>
  );
}
