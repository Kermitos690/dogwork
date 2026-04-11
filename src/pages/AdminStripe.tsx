import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft, CreditCard, Users, RefreshCw, DollarSign, AlertTriangle,
  ExternalLink, Loader2, Receipt, RotateCcw, XCircle, CheckCircle, FileText,
  Wallet, Link2, GraduationCap, ArrowUpRight,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

async function callAdminStripe(action: string, extra: Record<string, any> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Non connecté");
  const { data, error } = await supabase.functions.invoke("admin-stripe", {
    body: { action, ...extra },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  return data;
}

const PRODUCT_NAMES: Record<string, string> = {
  "prod_U83i1wbeLdd3EI": "Pro",
  "prod_U83inCbv8JMMgf": "Expert",
  "prod_U8CxlV7PMpHAgA": "Éducateur",
  "prod_UDKcjmnJnM7pBo": "Refuge",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400",
  canceled: "bg-red-500/20 text-red-400",
  past_due: "bg-amber-500/20 text-amber-400",
  trialing: "bg-sky-500/20 text-sky-400",
  succeeded: "bg-emerald-500/20 text-emerald-400",
  requires_payment_method: "bg-amber-500/20 text-amber-400",
  success: "bg-emerald-500/20 text-emerald-400",
  error: "bg-red-500/20 text-red-400",
  warning: "bg-amber-500/20 text-amber-400",
};

export default function AdminStripe() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<{
    type: "refund" | "cancel";
    id: string;
    label: string;
  } | null>(null);
  const [connectLoading, setConnectLoading] = useState<string | null>(null);

  async function callConnectDashboard(action: string, extra: Record<string, any> = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Non connecté");
    const { data, error } = await supabase.functions.invoke("connect-dashboard", {
      body: { action, ...extra },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error) throw error;
    return data;
  }

  const { data: customers, isLoading: loadingCustomers } = useQuery({
    queryKey: ["admin-stripe", "customers"],
    queryFn: () => callAdminStripe("list_customers"),
  });

  const { data: subscriptions, isLoading: loadingSubs } = useQuery({
    queryKey: ["admin-stripe", "subscriptions"],
    queryFn: () => callAdminStripe("list_subscriptions"),
  });

  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ["admin-stripe", "payments"],
    queryFn: () => callAdminStripe("list_payments"),
  });

  const { data: webhookLogs, isLoading: loadingLogs } = useQuery({
    queryKey: ["admin-stripe", "webhook_logs"],
    queryFn: () => callAdminStripe("webhook_logs"),
  });

  const { data: comparisons, isLoading: loadingCompare } = useQuery({
    queryKey: ["admin-stripe", "compare"],
    queryFn: () => callAdminStripe("compare_status"),
  });

  const handleResync = async (userId: string) => {
    try {
      const result = await callAdminStripe("resync_user", { user_id: userId });
      toast.success(`Resync OK: tier = ${result.tier}`);
      queryClient.invalidateQueries({ queryKey: ["admin-stripe"] });
    } catch (e: any) {
      toast.error(e.message || "Erreur resync");
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      if (confirmAction.type === "refund") {
        await callAdminStripe("refund_payment", { payment_intent_id: confirmAction.id });
        toast.success("Remboursement effectué");
      } else {
        await callAdminStripe("cancel_subscription", { subscription_id: confirmAction.id });
        toast.success("Abonnement annulé");
      }
      queryClient.invalidateQueries({ queryKey: ["admin-stripe"] });
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    }
    setActionLoading(false);
    setConfirmAction(null);
  };

  const fmt = (cents: number, currency = "chf") =>
    `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-CH", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <AppLayout>
      <div className="pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> Stripe Admin</h1>
            <p className="text-[10px] text-muted-foreground">Pilotage Stripe depuis l'application</p>
          </div>
        </div>

        <Tabs defaultValue="sync" className="w-full">
          <TabsList className="w-full grid grid-cols-5 h-10">
            <TabsTrigger value="sync" className="text-[10px]">Sync</TabsTrigger>
            <TabsTrigger value="customers" className="text-[10px]">Clients</TabsTrigger>
            <TabsTrigger value="subs" className="text-[10px]">Abos</TabsTrigger>
            <TabsTrigger value="payments" className="text-[10px]">Paiements</TabsTrigger>
            <TabsTrigger value="logs" className="text-[10px]">Logs</TabsTrigger>
          </TabsList>

          {/* SYNC TAB */}
          <TabsContent value="sync" className="space-y-3 mt-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-primary" /> Comparaison Local / Stripe
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingCompare ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Chargement...</div>
                ) : !comparisons?.length ? (
                  <p className="text-xs text-muted-foreground">Aucun client synchronisé localement.</p>
                ) : (
                  <div className="space-y-2">
                    {comparisons.map((c: any) => (
                      <div key={c.user_id} className="p-2.5 rounded-lg bg-secondary/30 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium">{c.email || c.user_id.slice(0, 8)}</p>
                          <div className="flex gap-1.5 mt-0.5">
                            <Badge className="text-[9px] border-0 bg-muted">Local: {c.local_tier}</Badge>
                            <Badge className={`text-[9px] border-0 ${c.synced ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                              Stripe: {c.stripe_tier}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          {!c.synced && (
                            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => handleResync(c.user_id)}>
                              <RefreshCw className="h-3 w-3" /> Resync
                            </Button>
                          )}
                          {c.synced && <CheckCircle className="h-4 w-4 text-emerald-400" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CUSTOMERS TAB */}
          <TabsContent value="customers" className="space-y-3 mt-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Clients Stripe ({customers?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingCustomers ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <div className="space-y-1.5 max-h-96 overflow-y-auto">
                    {customers?.map((c: any) => (
                      <div key={c.id} className="p-2 rounded-lg bg-secondary/30 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium">{c.email || c.name || c.id}</p>
                          <p className="text-[10px] text-muted-foreground">{c.id}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge className={`text-[9px] border-0 ${c.synced ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                            {c.synced ? c.local?.current_tier : "Non sync"}
                          </Badge>
                          <a href={`https://dashboard.stripe.com/customers/${c.id}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SUBSCRIPTIONS TAB */}
          <TabsContent value="subs" className="space-y-3 mt-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> Abonnements ({subscriptions?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingSubs ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {subscriptions?.map((s: any) => (
                      <div key={s.id} className="p-2.5 rounded-lg bg-secondary/30 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">{PRODUCT_NAMES[s.product_id] || s.product_id}</span>
                          <Badge className={`text-[9px] border-0 ${STATUS_COLORS[s.status] || "bg-muted"}`}>{s.status}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {s.amount ? fmt(s.amount, s.currency) : "—"} • Fin: {fmtDate(s.current_period_end)}
                          {s.cancel_at_period_end && " • Annulation prévue"}
                        </p>
                        <div className="flex gap-1.5 mt-1">
                          {s.status === "active" && (
                            <Button size="sm" variant="destructive" className="h-6 text-[10px] gap-1"
                              onClick={() => setConfirmAction({ type: "cancel", id: s.id, label: PRODUCT_NAMES[s.product_id] || s.id })}>
                              <XCircle className="h-3 w-3" /> Annuler
                            </Button>
                          )}
                          <a href={`https://dashboard.stripe.com/subscriptions/${s.id}`} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1">
                              <ExternalLink className="h-3 w-3" /> Stripe
                            </Button>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PAYMENTS TAB */}
          <TabsContent value="payments" className="space-y-3 mt-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Paiements ({payments?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingPayments ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <div className="space-y-1.5 max-h-96 overflow-y-auto">
                    {payments?.map((p: any) => (
                      <div key={p.id} className="p-2 rounded-lg bg-secondary/30 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium">{fmt(p.amount, p.currency)}</p>
                          <p className="text-[10px] text-muted-foreground">{fmtDate(p.created)}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge className={`text-[9px] border-0 ${STATUS_COLORS[p.status] || "bg-muted"}`}>{p.status}</Badge>
                          {p.status === "succeeded" && (
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1"
                              onClick={() => setConfirmAction({ type: "refund", id: p.id, label: fmt(p.amount, p.currency) })}>
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* WEBHOOK LOGS TAB */}
          <TabsContent value="logs" className="space-y-3 mt-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Webhook Logs ({webhookLogs?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingLogs ? <Loader2 className="h-4 w-4 animate-spin" /> : !webhookLogs?.length ? (
                  <div className="text-center py-6">
                    <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Aucun événement webhook reçu.</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Vérifiez la configuration du webhook dans Stripe Dashboard.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-96 overflow-y-auto">
                    {webhookLogs.map((e: any) => (
                      <div key={e.id} className="p-2 rounded-lg bg-secondary/30">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-medium">{e.event_type}</span>
                          <Badge className={`text-[9px] border-0 ${STATUS_COLORS[e.processing_status] || "bg-muted"}`}>
                            {e.processing_status}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{fmtDate(e.created_at)}</p>
                        {e.processing_error && (
                          <p className="text-[10px] text-red-400 mt-0.5">{e.processing_error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirm dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "refund" ? "Confirmer le remboursement" : "Confirmer l'annulation"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "refund"
                ? `Rembourser ${confirmAction?.label} ? Cette action est irréversible.`
                : `Annuler l'abonnement ${confirmAction?.label} ? L'accès sera immédiatement retiré.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}