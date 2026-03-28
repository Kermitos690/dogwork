import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, ExternalLink, Wallet, Users, ArrowUpRight,
  CheckCircle2, XCircle, RefreshCw, TrendingUp,
} from "lucide-react";

interface ConnectAccount {
  user_id: string;
  display_name: string | null;
  account_id: string;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  balance_available?: Array<{ amount: number; currency: string }>;
  balance_pending?: Array<{ amount: number; currency: string }>;
  error?: string;
}

interface TreasuryData {
  accounts: ConnectAccount[];
  platform_balance: {
    available: Array<{ amount: number; currency: string }>;
    pending: Array<{ amount: number; currency: string }>;
  };
}

export default function AdminTreasury() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TreasuryData | null>(null);

  const fetchData = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("connect-dashboard", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { action: "list_accounts" },
      });
      if (error) throw error;
      setData(result);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLoginLink = async (educatorUserId: string) => {
    try {
      const { data: result, error } = await supabase.functions.invoke("connect-dashboard", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: { action: "create_login_link", educator_user_id: educatorUserId },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      if (result?.url) {
        if (result.onboarding_incomplete) {
          toast({ title: "Onboarding incomplet", description: "Redirection vers la page d'onboarding Stripe…" });
        }
        const w = window.open(result.url, "_blank");
        if (!w) window.location.href = result.url;
      } else {
        toast({ title: "Erreur", description: "Aucune URL retournée", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("fr-CH", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const platformAvailable = data?.platform_balance?.available?.[0];
  const platformPending = data?.platform_balance?.pending?.[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Trésorerie
          </h2>
          <p className="text-xs text-muted-foreground">Gestion Stripe Connect — Commission 15.8%</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Actualiser
        </Button>
      </div>

      {/* Platform Balance */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Solde disponible</p>
            <p className="text-xl font-bold text-foreground">
              {platformAvailable ? formatAmount(platformAvailable.amount, platformAvailable.currency) : "0.00 CHF"}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-primary" />
              <span className="text-xs text-primary">Plateforme</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">En attente</p>
            <p className="text-xl font-bold text-foreground">
              {platformPending ? formatAmount(platformPending.amount, platformPending.currency) : "0.00 CHF"}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <Loader2 className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">En transit</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connected Accounts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Comptes éducateurs ({data?.accounts?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!data?.accounts?.length ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Aucun éducateur n'a encore configuré son compte de paiement.
            </p>
          ) : (
            data.accounts.map((account) => (
              <div
                key={account.account_id}
                className="p-3 rounded-lg border border-border/60 bg-card/50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {account.display_name || "Éducateur"}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {account.account_id}
                    </p>
                  </div>
                  {account.error ? (
                    <Badge variant="destructive" className="text-xs">Erreur</Badge>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      {account.charges_enabled ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      {account.payouts_enabled ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  )}
                </div>

                {!account.error && account.balance_available && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Disponible : </span>
                      <span className="font-medium text-foreground">
                        {account.balance_available.map((b) => formatAmount(b.amount, b.currency)).join(", ") || "0"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">En attente : </span>
                      <span className="font-medium text-foreground">
                        {account.balance_pending?.map((b) => formatAmount(b.amount, b.currency)).join(", ") || "0"}
                      </span>
                    </div>
                  </div>
                )}

                {!account.error && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full gap-1.5 text-xs"
                    onClick={() => handleLoginLink(account.user_id)}
                  >
                    <ArrowUpRight className="h-3 w-3" />
                    Voir le dashboard Stripe
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}

                {account.error && (
                  <p className="text-xs text-destructive">{account.error}</p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
