import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Coins, TrendingUp, TrendingDown, Users, Activity,
  AlertTriangle, DollarSign, Settings2, BarChart3,
  Search,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// =============== SUMMARY TAB ===============

function SummaryTab() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["admin-ai-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_ai_economy_summary");
      if (error) throw error;
      return data as any;
    },
    staleTime: 60_000,
  });

  if (isLoading) return <div className="grid gap-4 md:grid-cols-3">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-28" />)}</div>;
  if (!summary) return <p className="text-muted-foreground">Données non disponibles</p>;

  const cards = [
    { label: "Appels IA totaux", value: summary.total_calls, icon: Activity, color: "text-primary" },
    { label: "Crédits consommés", value: summary.total_credits_consumed, icon: Coins, color: "text-orange-500" },
    { label: "Coût fournisseur (USD)", value: `$${Number(summary.total_provider_cost_usd).toFixed(4)}`, icon: TrendingDown, color: "text-destructive" },
    { label: "CA crédits (CHF)", value: `${Number(summary.total_revenue_chf).toFixed(2)} CHF`, icon: DollarSign, color: "text-green-600" },
    { label: "Solde total en circulation", value: summary.total_balance_outstanding, icon: Coins, color: "text-blue-500" },
    { label: "Échecs (solde insuffisant)", value: summary.failed_insufficient, icon: AlertTriangle, color: "text-yellow-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((c, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full bg-muted flex items-center justify-center`}>
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-xl font-bold">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {summary.top_features?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Top fonctionnalités IA</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.top_features.map((f: any) => (
                <div key={f.feature_code} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{f.feature_code}</p>
                    <p className="text-xs text-muted-foreground">{f.call_count} appels</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{f.total_credits} crédits</p>
                    <p className="text-xs text-muted-foreground">${Number(f.total_cost).toFixed(4)} coût</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// =============== FEATURES TAB ===============

function FeaturesTab() {
  const queryClient = useQueryClient();
  const { data: features, isLoading } = useQuery({
    queryKey: ["admin-ai-features"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_feature_catalog")
        .select("*")
        .order("credits_cost");
      if (error) throw error;
      return data as any[];
    },
  });

  const updateFeature = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from("ai_feature_catalog")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ai-features"] });
      toast.success("Fonctionnalité mise à jour");
    },
    onError: () => toast.error("Erreur de mise à jour"),
  });

  if (isLoading) return <Skeleton className="h-60" />;

  return (
    <div className="space-y-4">
      {features?.map(f => (
        <Card key={f.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{f.label}</p>
                  <Badge variant="outline" className="text-xs">{f.code}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{f.description}</p>
                <p className="text-xs text-muted-foreground">Modèle: {f.model}</p>
                <div className="flex gap-4 text-xs">
                  <span>Coût min: ${Number(f.cost_estimate_min_usd).toFixed(4)}</span>
                  <span>Coût moy: ${Number(f.cost_estimate_avg_usd).toFixed(4)}</span>
                  <span>Coût max: ${Number(f.cost_estimate_max_usd).toFixed(4)}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Crédits</Label>
                  <Input
                    type="number"
                    className="w-16 h-8 text-sm"
                    defaultValue={f.credits_cost}
                    onBlur={(e) => {
                      const v = parseInt(e.target.value);
                      if (v !== f.credits_cost && v > 0) {
                        updateFeature.mutate({ id: f.id, updates: { credits_cost: v } });
                      }
                    }}
                  />
                </div>
                <Switch
                  checked={f.is_active}
                  onCheckedChange={(checked) =>
                    updateFeature.mutate({ id: f.id, updates: { is_active: checked } })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// =============== USERS TAB ===============

function UsersTab() {
  const [search, setSearch] = useState("");

  const { data: wallets, isLoading } = useQuery({
    queryKey: ["admin-ai-wallets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_credit_wallets")
        .select("*")
        .order("lifetime_consumed", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any[];
    },
  });

  // Get profiles for display names
  const userIds = wallets?.map(w => w.user_id) || [];
  const { data: profiles } = useQuery({
    queryKey: ["admin-ai-profiles", userIds],
    queryFn: async () => {
      if (!userIds.length) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);
      return data || [];
    },
    enabled: userIds.length > 0,
  });

  const profileMap = new Map((profiles || []).map(p => [p.user_id, p.display_name]));

  const queryClient = useQueryClient();
  const adjustCredits = useMutation({
    mutationFn: async ({ userId, credits, description }: { userId: string; credits: number; description: string }) => {
      const opType = credits > 0 ? "admin_adjustment" : "admin_adjustment";
      const { error } = await supabase.rpc("credit_ai_wallet", {
        _user_id: userId,
        _credits: credits,
        _operation_type: opType,
        _description: description,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ai-wallets"] });
      toast.success("Crédits ajustés");
    },
  });

  if (isLoading) return <Skeleton className="h-60" />;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un utilisateur..."
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        {wallets?.filter(w => {
          if (!search) return true;
          const name = profileMap.get(w.user_id) || "";
          return name.toLowerCase().includes(search.toLowerCase());
        }).map(w => (
          <Card key={w.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{profileMap.get(w.user_id) || "Utilisateur"}</p>
                <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                  <span>Solde: <strong>{w.balance}</strong></span>
                  <span>Consommé: {w.lifetime_consumed}</span>
                  <span>Acheté: {w.lifetime_purchased}</span>
                  <span>Remboursé: {w.lifetime_refunded}</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const credits = prompt("Crédits à ajouter (négatif pour retirer):");
                  if (!credits) return;
                  const desc = prompt("Raison:") || "Ajustement admin";
                  adjustCredits.mutate({ userId: w.user_id, credits: parseInt(credits), description: desc });
                }}
              >
                Ajuster
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// =============== PRICING TAB ===============

function PricingTab() {
  const queryClient = useQueryClient();

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["admin-ai-pricing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_pricing_config")
        .select("*")
        .order("key");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: quotas, isLoading: quotasLoading } = useQuery({
    queryKey: ["admin-ai-quotas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_plan_quotas")
        .select("*")
        .order("monthly_credits", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const updateConfig = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: number }) => {
      const { error } = await supabase
        .from("ai_pricing_config")
        .update({ value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ai-pricing"] });
      toast.success("Paramètre mis à jour");
    },
  });

  const updateQuota = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from("ai_plan_quotas")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ai-quotas"] });
      toast.success("Quota mis à jour");
    },
  });

  if (configLoading || quotasLoading) return <Skeleton className="h-60" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Paramètres de pricing</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {config?.map(c => (
              <div key={c.id} className="space-y-1">
                <Label className="text-sm">{c.label || c.key}</Label>
                <p className="text-xs text-muted-foreground">{c.description}</p>
                <Input
                  type="number"
                  step="any"
                  defaultValue={Number(c.value)}
                  className="h-8"
                  onBlur={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v) && v !== Number(c.value)) {
                      updateConfig.mutate({ id: c.id, value: v });
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Quotas par plan</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {quotas?.map(q => (
              <div key={q.id} className="flex items-center gap-4 py-2 border-b border-border/50 last:border-0">
                <Badge variant="outline" className="w-24 justify-center">{q.plan_slug}</Badge>
                <div className="flex items-center gap-2">
                  <Label className="text-xs whitespace-nowrap">Crédits/mois</Label>
                  <Input
                    type="number"
                    className="w-20 h-8 text-sm"
                    defaultValue={q.monthly_credits}
                    onBlur={(e) => {
                      const v = parseInt(e.target.value);
                      if (v !== q.monthly_credits) {
                        updateQuota.mutate({ id: q.id, updates: { monthly_credits: v } });
                      }
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs whitespace-nowrap">Remise %</Label>
                  <Input
                    type="number"
                    className="w-16 h-8 text-sm"
                    defaultValue={Number(q.discount_percent)}
                    onBlur={(e) => {
                      const v = parseFloat(e.target.value);
                      if (v !== Number(q.discount_percent)) {
                        updateQuota.mutate({ id: q.id, updates: { discount_percent: v } });
                      }
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =============== MAIN COMPONENT ===============

export default function AdminAIEconomy() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Économie IA</h1>
          <p className="text-sm text-muted-foreground">Pilotage financier de l'intelligence artificielle</p>
        </div>
      </div>

      <Tabs defaultValue="summary">
        <TabsList className="w-full">
          <TabsTrigger value="summary" className="flex-1">Synthèse</TabsTrigger>
          <TabsTrigger value="features" className="flex-1">Actions IA</TabsTrigger>
          <TabsTrigger value="users" className="flex-1">Utilisateurs</TabsTrigger>
          <TabsTrigger value="pricing" className="flex-1">Pricing</TabsTrigger>
        </TabsList>
        <TabsContent value="summary"><SummaryTab /></TabsContent>
        <TabsContent value="features"><FeaturesTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="pricing"><PricingTab /></TabsContent>
      </Tabs>
    </div>
  );
}
