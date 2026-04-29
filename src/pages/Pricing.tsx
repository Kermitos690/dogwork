import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Check, Sparkles, Coins, Info } from "lucide-react";

interface SubscriptionPlan {
  code: string;
  name: string;
  max_dogs: number;
  base_exercise_limit: number;
  monthly_ai_credits: number;
}
interface PlanPrice {
  plan_code: string;
  price_chf: number;
  billing_period: string;
  is_public: boolean;
}
interface CreditPack {
  slug: string;
  label: string;
  credits: number;
  price_chf: number;
  sort_order: number;
}
interface AIFeature {
  code: string;
  label: string;
  credits_cost: number;
}

const PLAN_ORDER = ["starter", "pro", "expert", "educator", "shelter"];
const PLAN_TAGLINES: Record<string, string> = {
  starter: "Découvrez DogWork gratuitement",
  pro: "L'essentiel pour éduquer sérieusement",
  expert: "Toute la puissance DogWork",
  educator: "Pour les éducateurs canins professionnels",
  shelter: "Sur mesure pour les refuges & associations",
};
const PLAN_BADGE: Record<string, string | undefined> = {
  pro: "Le plus populaire",
  expert: "Accès complet",
};

function formatLimit(n: number, unit: string): string {
  if (n >= 999999) return `${unit} illimités`;
  return `${n} ${unit}`;
}

function formatPrice(price: number, period: string): string {
  if (price === 0) return "Gratuit";
  const suffix = period === "yearly" ? "/an" : period === "custom" ? "" : "/mois";
  return `${price.toFixed(2)} CHF${suffix ? " " + suffix : ""}`;
}

export default function Pricing() {
  const { data: plans = [] } = useQuery<SubscriptionPlan[]>({
    queryKey: ["pricing", "subscription_plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans" as any)
        .select("code,name,max_dogs,base_exercise_limit,monthly_ai_credits")
        .eq("is_active", true);
      if (error) throw error;
      return (data as any) ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const { data: prices = [] } = useQuery<PlanPrice[]>({
    queryKey: ["pricing", "subscription_plan_prices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plan_prices" as any)
        .select("plan_code,price_chf,billing_period,is_public")
        .eq("is_public", true);
      if (error) throw error;
      return (data as any) ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const { data: packs = [] } = useQuery<CreditPack[]>({
    queryKey: ["pricing", "ai_credit_packs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_credit_packs" as any)
        .select("slug,label,credits,price_chf,sort_order")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data as any) ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const { data: features = [] } = useQuery<AIFeature[]>({
    queryKey: ["pricing", "ai_feature_catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_feature_catalog" as any)
        .select("code,label,credits_cost")
        .eq("is_active", true)
        .order("credits_cost");
      if (error) throw error;
      return (data as any) ?? [];
    },
    staleTime: 5 * 60_000,
  });

  // Sort & merge plans with their public price
  const plansWithPrice = PLAN_ORDER
    .map((code) => {
      const plan = plans.find((p) => p.code === code);
      if (!plan) return null;
      const price = prices.find((pr) => pr.plan_code === code);
      return { ...plan, price };
    })
    .filter(Boolean) as Array<SubscriptionPlan & { price?: PlanPrice }>;

  // Deduplicate AI features by label (chat & chat_general both = 1 cr)
  const featuresDeduped = features.filter((f, i, arr) => {
    return arr.findIndex((x) => x.label === f.label) === i;
  });

  return (
    <div className="container max-w-6xl py-8 px-4 space-y-12">
      <header className="text-center space-y-3">
        <Badge variant="secondary" className="mb-2">
          <Sparkles className="w-3 h-3 mr-1" />
          Source de vérité : base de données Live
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Tarifs & Crédits DogWork
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Toutes les valeurs ci-dessous sont lues directement depuis la base de production.
          Elles correspondent exactement à ce qui est annoncé sur la landing et facturé via Stripe.
        </p>
      </header>

      {/* Plans */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Plans d'abonnement</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {plansWithPrice.slice(0, 3).map((p) => (
            <Card key={p.code} className={PLAN_BADGE[p.code] ? "border-primary/40" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="capitalize">{p.name}</CardTitle>
                  {PLAN_BADGE[p.code] && (
                    <Badge className="text-xs">{PLAN_BADGE[p.code]}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{PLAN_TAGLINES[p.code]}</p>
                <div className="text-3xl font-bold pt-2">
                  {formatPrice(Number(p.price?.price_chf ?? 0), p.price?.billing_period ?? "monthly")}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  {formatLimit(p.max_dogs, p.max_dogs === 1 ? "chien" : "chiens")}
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  {formatLimit(p.base_exercise_limit, "exercices")}
                </div>
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-primary" />
                  {p.monthly_ai_credits} crédit{p.monthly_ai_credits > 1 ? "s" : ""} IA / mois
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* B2B Plans (Educator/Shelter) */}
      {plansWithPrice.slice(3).length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Offres professionnelles</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {plansWithPrice.slice(3).map((p) => (
              <Card key={p.code}>
                <CardHeader>
                  <CardTitle className="capitalize">{p.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{PLAN_TAGLINES[p.code]}</p>
                  <div className="text-3xl font-bold pt-2">
                    {p.price?.billing_period === "custom"
                      ? "Sur devis"
                      : formatPrice(Number(p.price?.price_chf ?? 0), p.price?.billing_period ?? "yearly")}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-primary" />
                    {p.monthly_ai_credits} crédits IA / mois inclus
                  </div>
                  <div className="text-muted-foreground text-xs flex items-center gap-1 pt-2">
                    <Info className="w-3 h-3" /> Commission marketplace : 15,8 %
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Credit Packs */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Packs de crédits IA</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Recharges ponctuelles, sans engagement. Achetez quand vous en avez besoin.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {packs.map((pack) => (
            <Card key={pack.slug}>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold">{pack.credits} crédits</div>
                <div className="text-sm text-muted-foreground mt-1">{pack.label}</div>
                <div className="text-2xl font-semibold text-primary mt-3">
                  {Number(pack.price_chf).toFixed(2)} CHF
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {(Number(pack.price_chf) / pack.credits).toFixed(3)} CHF / crédit
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* AI Feature Costs */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Coût des fonctionnalités IA</h2>
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium">Fonctionnalité</th>
                  <th className="px-4 py-3 font-medium text-right">Coût</th>
                </tr>
              </thead>
              <tbody>
                {featuresDeduped.map((f) => (
                  <tr key={f.code} className="border-b last:border-0">
                    <td className="px-4 py-3">{f.label}</td>
                    <td className="px-4 py-3 text-right font-semibold text-primary">
                      {f.credits_cost} crédit{f.credits_cost > 1 ? "s" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      <div className="text-center pt-4">
        <Link to="/landing">
          <Button variant="outline">Retour à la landing</Button>
        </Link>
      </div>
    </div>
  );
}
