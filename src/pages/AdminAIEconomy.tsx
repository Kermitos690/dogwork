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
  Search, ShoppingCart, Calendar, Plus, Minus, Gift,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// =============== SUMMARY TAB (with SQL views) ===============

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

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["admin-credit-kpis"],
    queryFn: async () => {
      const { data, error } = await supabase.from("v_credit_kpis" as any).select("*").single();
      if (error) throw error;
      return data as any;
    },
    staleTime: 60_000,
  });

  if (isLoading || kpisLoading) return <div className="grid gap-4 md:grid-cols-3">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-28" />)}</div>;

  const cards = [
    { label: "Appels IA totaux", value: summary?.total_calls ?? 0, icon: Activity, color: "text-primary" },
    { label: "Crédits consommés", value: summary?.total_credits_consumed ?? 0, icon: Coins, color: "text-orange-500" },
    { label: "Coût fournisseur (USD)", value: `$${Number(summary?.total_provider_cost_usd ?? 0).toFixed(4)}`, icon: TrendingDown, color: "text-destructive" },
    { label: "CA crédits (CHF)", value: `${Number(kpis?.revenue_chf ?? 0).toFixed(2)} CHF`, icon: DollarSign, color: "text-green-600" },
    { label: "Panier moyen", value: `${Number(kpis?.avg_basket_chf ?? 0).toFixed(2)} CHF`, icon: ShoppingCart, color: "text-blue-500" },
    { label: "Acheteurs uniques", value: kpis?.unique_buyers ?? 0, icon: Users, color: "text-purple-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((c, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
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

      {summary?.top_features?.length > 0 && (
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

// =============== ORDERS TAB (v_credit_orders_admin) ===============

function OrdersTab() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-credit-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("v_credit_orders_admin" as any).select("*").limit(100);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  if (isLoading) return <Skeleton className="h-60" />;

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold flex items-center gap-2">
        <ShoppingCart className="h-4 w-4 text-primary" />
        Commandes crédits ({orders?.length || 0})
      </h3>
      {!orders?.length ? (
        <p className="text-sm text-muted-foreground text-center py-6">Aucune commande de crédits</p>
      ) : (
        <div className="space-y-2">
          {orders.map((o: any) => (
            <Card key={o.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{o.user_name || "Utilisateur"}</p>
                    <p className="text-xs text-muted-foreground">{o.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(o.created_at), "d MMM yyyy HH:mm", { locale: fr })}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm font-bold">+{o.credits} crédits</p>
                    {o.amount_chf && <p className="text-xs text-muted-foreground">{Number(o.amount_chf).toFixed(2)} CHF</p>}
                    <Badge variant={o.status === "success" ? "default" : "secondary"} className="text-[10px]">
                      {o.status}
                    </Badge>
                  </div>
                </div>
                {o.stripe_payment_id && (
                  <p className="text-[10px] text-muted-foreground mt-2 font-mono truncate">Stripe: {o.stripe_payment_id}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// =============== DAILY TAB (v_credit_orders_daily) ===============

function DailyTab() {
  const { data: daily, isLoading } = useQuery({
    queryKey: ["admin-credit-daily"],
    queryFn: async () => {
      const { data, error } = await supabase.from("v_credit_orders_daily" as any).select("*").limit(30);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  if (isLoading) return <Skeleton className="h-60" />;

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold flex items-center gap-2">
        <Calendar className="h-4 w-4 text-primary" />
        Évolution journalière
      </h3>
      {!daily?.length ? (
        <p className="text-sm text-muted-foreground text-center py-6">Aucune donnée journalière</p>
      ) : (
        <div className="space-y-2">
          {daily.map((d: any) => (
            <Card key={d.day}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{format(new Date(d.day), "d MMM yyyy", { locale: fr })}</p>
                  <p className="text-xs text-muted-foreground">{d.orders} commande(s) · {d.credited} créditée(s)</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{d.credits_sold} crédits</p>
                  <p className="text-xs text-green-600">{Number(d.daily_revenue).toFixed(2)} CHF</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
      const { data, error } = await supabase.from("ai_feature_catalog").select("*").order("credits_cost");
      if (error) throw error;
      return data as any[];
    },
  });

  const updateFeature = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase.from("ai_feature_catalog").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-ai-features"] }); toast.success("Mis à jour"); },
    onError: () => toast.error("Erreur"),
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
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Crédits</Label>
                  <Input type="number" className="w-16 h-8 text-sm" defaultValue={f.credits_cost}
                    onBlur={(e) => { const v = parseInt(e.target.value); if (v !== f.credits_cost && v > 0) updateFeature.mutate({ id: f.id, updates: { credits_cost: v } }); }} />
                </div>
                <Switch checked={f.is_active} onCheckedChange={(checked) => updateFeature.mutate({ id: f.id, updates: { is_active: checked } })} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// =============== USERS TAB ===============

// Detect environment based on URL host
const IS_PUBLISHED = typeof window !== "undefined" && !window.location.hostname.includes("id-preview--");
const ENV_LABEL = IS_PUBLISHED ? "Live (publié)" : "Preview / Test";

function UsersTab() {
  const [search, setSearch] = useState("");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<{ id: string; name: string; balance: number } | null>(null);
  const [creditAmount, setCreditAmount] = useState<string>("10");
  const [reason, setReason] = useState<string>("Crédits offerts");
  const queryClient = useQueryClient();

  // Query the CURRENT environment's database (same DB as chat/balance/debit)
  // → In Preview = Test DB, in Published = Live DB. One coherent universe.
  const { data: liveUsers, isLoading, refetch } = useQuery({
    queryKey: ["admin-users-current-env", search],
    queryFn: async () => {
      const { data: usersData, error: usersErr } = await supabase.rpc("admin_list_users");
      if (usersErr) throw usersErr;
      const filtered = (usersData ?? []).filter((u: any) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (u.email ?? "").toLowerCase().includes(q) || (u.display_name ?? "").toLowerCase().includes(q);
      }).slice(0, 50);

      const ids = filtered.map((u: any) => u.user_id);
      const { data: wallets } = await supabase
        .from("ai_credit_wallets")
        .select("user_id, balance, lifetime_consumed, lifetime_purchased")
        .in("user_id", ids);
      const wmap = new Map((wallets ?? []).map((w: any) => [w.user_id, w]));
      return filtered.map((u: any) => ({
        user_id: u.user_id,
        email: u.email,
        display_name: u.display_name,
        wallet: wmap.get(u.user_id) ?? null,
      })) as Array<{
        user_id: string;
        email: string;
        display_name: string;
        wallet: { balance: number; lifetime_consumed: number; lifetime_purchased: number } | null;
      }>;
    },
    staleTime: 30_000,
  });

  const adjustCredits = useMutation({
    mutationFn: async ({ userId, credits, description }: { userId: string; credits: number; description: string }) => {
      const { data, error } = await supabase.rpc("credit_ai_wallet", {
        _user_id: userId,
        _credits: credits,
        _operation_type: "admin_adjustment",
        _description: description,
        _metadata: { source: "admin-ui", env: ENV_LABEL },
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (newBalance) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-current-env"] });
      queryClient.invalidateQueries({ queryKey: ["ai-balance"] });
      toast.success(`Crédits ajustés (${ENV_LABEL}) ✅ Nouveau solde : ${newBalance}`);
      setAdjustOpen(false);
      setCreditAmount("10");
      setReason("Crédits offerts");
      refetch();
    },
    onError: (err: any) => toast.error(`Échec : ${err?.message || "Erreur inconnue"}`),
  });

  const openAdjust = (u: { user_id: string; display_name: string; wallet: any }) => {
    setTargetUser({ id: u.user_id, name: u.display_name, balance: u.wallet?.balance ?? 0 });
    setAdjustOpen(true);
  };

  const submitAdjust = () => {
    if (!targetUser) return;
    const n = parseInt(creditAmount, 10);
    if (!Number.isFinite(n) || n === 0) {
      toast.error("Montant invalide");
      return;
    }
    adjustCredits.mutate({ userId: targetUser.id, credits: n, description: reason || "Ajustement admin" });
  };

  if (isLoading) return <Skeleton className="h-60" />;

  return (
    <div className="space-y-4">
      <div className={`rounded-lg border p-3 text-xs ${IS_PUBLISHED ? "border-green-500/40 bg-green-500/10" : "border-yellow-500/40 bg-yellow-500/10"}`}>
        <strong className="text-foreground">Environnement actif : {ENV_LABEL}</strong>
        <div className="mt-1 text-muted-foreground">
          {IS_PUBLISHED
            ? "Vous êtes sur l'application publiée. Les ajustements modifient les vrais soldes des utilisateurs (base Live)."
            : "Vous êtes en Preview. Les ajustements ne touchent que la base de Test. Pour modifier la production, ouvrez l'application publiée puis l'admin."}
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          Règle : la liste, les soldes et les ajustements pointent toujours sur la base de l'environnement courant. Aucune donnée n'est copiée entre Test et Live.
        </div>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher (nom ou email)..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="space-y-2">
        {!liveUsers?.length ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aucun utilisateur trouvé en production.</p>
        ) : liveUsers.map(u => (
          <Card key={u.user_id}>
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{u.display_name}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                  <span>Solde : <strong className="text-foreground">{u.wallet?.balance ?? 0}</strong></span>
                  <span>Consommé : {u.wallet?.lifetime_consumed ?? 0}</span>
                  <span>Acheté : {u.wallet?.lifetime_purchased ?? 0}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-1 shrink-0" onClick={() => openAdjust(u)}>
                <Gift className="h-4 w-4" /> Ajuster
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajuster les crédits IA ({ENV_LABEL})</DialogTitle>
            <DialogDescription>
              {targetUser ? <>Utilisateur&nbsp;: <strong>{targetUser.name}</strong> — solde actuel <strong>{targetUser.balance}</strong></> : null}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Crédits (positif = ajouter, négatif = retirer)</Label>
              <div className="flex gap-2 mt-1">
                <Button type="button" variant="outline" size="icon" onClick={() => setCreditAmount(String((parseInt(creditAmount || "0", 10) || 0) - 10))}>
                  <Minus className="h-4 w-4" />
                </Button>
                <Input type="number" inputMode="numeric" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} className="text-center" />
                <Button type="button" variant="outline" size="icon" onClick={() => setCreditAmount(String((parseInt(creditAmount || "0", 10) || 0) + 10))}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-1 mt-2 flex-wrap">
                {[10, 25, 50, 100, 250].map(n => (
                  <Button key={n} type="button" variant="secondary" size="sm" className="h-7 px-2 text-xs" onClick={() => setCreditAmount(String(n))}>
                    +{n}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">Raison</Label>
              <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} className="mt-1 text-sm" />
            </div>

            {targetUser && Number.isFinite(parseInt(creditAmount, 10)) && (
              <div className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                Nouveau solde estimé&nbsp;: <strong className="text-foreground">{targetUser.balance + (parseInt(creditAmount, 10) || 0)}</strong>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAdjustOpen(false)}>Annuler</Button>
            <Button onClick={submitAdjust} disabled={adjustCredits.isPending}>
              {adjustCredits.isPending ? "Application…" : `Appliquer (${ENV_LABEL})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============== PRICING TAB ===============

function PricingTab() {
  const queryClient = useQueryClient();
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["admin-ai-pricing"],
    queryFn: async () => { const { data, error } = await supabase.from("ai_pricing_config").select("*").order("key"); if (error) throw error; return data as any[]; },
  });
  const { data: quotas, isLoading: quotasLoading } = useQuery({
    queryKey: ["admin-ai-quotas"],
    queryFn: async () => { const { data, error } = await supabase.from("ai_plan_quotas").select("*").order("monthly_credits", { ascending: false }); if (error) throw error; return data as any[]; },
  });
  const updateConfig = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: number }) => { const { error } = await supabase.from("ai_pricing_config").update({ value }).eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-ai-pricing"] }); toast.success("Mis à jour"); },
  });
  const updateQuota = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => { const { error } = await supabase.from("ai_plan_quotas").update(updates).eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-ai-quotas"] }); toast.success("Mis à jour"); },
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
                <Input type="number" step="any" defaultValue={Number(c.value)} className="h-8"
                  onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v !== Number(c.value)) updateConfig.mutate({ id: c.id, value: v }); }} />
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
                  <Input type="number" className="w-20 h-8 text-sm" defaultValue={q.monthly_credits}
                    onBlur={(e) => { const v = parseInt(e.target.value); if (v !== q.monthly_credits) updateQuota.mutate({ id: q.id, updates: { monthly_credits: v } }); }} />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs whitespace-nowrap">Remise %</Label>
                  <Input type="number" className="w-16 h-8 text-sm" defaultValue={Number(q.discount_percent)}
                    onBlur={(e) => { const v = parseFloat(e.target.value); if (v !== Number(q.discount_percent)) updateQuota.mutate({ id: q.id, updates: { discount_percent: v } }); }} />
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
        <TabsList className="w-full flex-wrap h-auto gap-1">
          <TabsTrigger value="summary" className="flex-1">Synthèse</TabsTrigger>
          <TabsTrigger value="orders" className="flex-1">Commandes</TabsTrigger>
          <TabsTrigger value="daily" className="flex-1">Journalier</TabsTrigger>
          <TabsTrigger value="features" className="flex-1">Actions</TabsTrigger>
          <TabsTrigger value="users" className="flex-1">Utilisateurs</TabsTrigger>
          <TabsTrigger value="pricing" className="flex-1">Pricing</TabsTrigger>
        </TabsList>
        <TabsContent value="summary"><SummaryTab /></TabsContent>
        <TabsContent value="orders"><OrdersTab /></TabsContent>
        <TabsContent value="daily"><DailyTab /></TabsContent>
        <TabsContent value="features"><FeaturesTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="pricing"><PricingTab /></TabsContent>
      </Tabs>
    </div>
  );
}
