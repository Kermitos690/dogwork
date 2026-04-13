import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useAIBalance,
  useAILedger,
  useAICreditPacks,
  usePurchaseCreditPack,
  useCreditOrders,
  type AILedgerEntry,
  type AICreditPack,
  type CreditOrder,
} from "@/hooks/useAICredits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Coins, Plus, History, ArrowDown, ArrowUp, Gift, RotateCcw,
  Settings2, ShoppingBag, Sparkles, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const operationIcons: Record<string, React.ReactNode> = {
  consumption: <ArrowDown className="h-4 w-4 text-destructive" />,
  purchase: <ArrowUp className="h-4 w-4 text-green-500" />,
  bonus: <Gift className="h-4 w-4 text-primary" />,
  refund: <RotateCcw className="h-4 w-4 text-yellow-500" />,
  admin_adjustment: <Settings2 className="h-4 w-4 text-muted-foreground" />,
  monthly_grant: <ArrowUp className="h-4 w-4 text-blue-500" />,
};

const operationLabels: Record<string, string> = {
  consumption: "Utilisation IA",
  purchase: "Achat de crédits",
  bonus: "Bonus",
  refund: "Remboursement",
  admin_adjustment: "Ajustement admin",
  monthly_grant: "Crédit mensuel",
};

/* ───── Balance Card ───────────────────────────────────────── */
export function CreditBalanceCard() {
  const { data: wallet, isLoading } = useAIBalance();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-8 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Coins className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Solde crédits IA</p>
            <p className="text-3xl font-bold">{wallet?.balance ?? 0}</p>
          </div>
        </div>
        {wallet && (wallet.lifetime_purchased > 0 || wallet.lifetime_consumed > 0) && (
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border/40 pt-3">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Acquis</p>
              <p className="text-sm font-semibold text-green-600">+{wallet.lifetime_purchased}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Utilisés</p>
              <p className="text-sm font-semibold text-destructive">−{wallet.lifetime_consumed}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Remboursés</p>
              <p className="text-sm font-semibold text-yellow-600">+{wallet.lifetime_refunded}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ───── Balance Badge (compact) ────────────────────────────── */
export function CreditBalanceBadge() {
  const { data: wallet } = useAIBalance();

  return (
    <Badge variant="outline" className="gap-1 font-medium">
      <Coins className="h-3 w-3" />
      {wallet?.balance ?? 0}
    </Badge>
  );
}

/* ───── Packs Section ──────────────────────────────────────── */
export function CreditPacksSection() {
  const { data: packs, isLoading, isError } = useAICreditPacks();
  const purchase = usePurchaseCreditPack();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8">
        <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Impossible de charger les packs de crédits.</p>
      </div>
    );
  }

  if (!packs?.length) {
    return (
      <div className="text-center py-8">
        <ShoppingBag className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Aucun pack disponible pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Plus className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Recharger vos crédits</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Chaque crédit alimente les fonctionnalités IA de DogWork : chatbot, analyses, plans d'éducation et plus.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {packs.map((pack: AICreditPack, idx: number) => {
          const isPopular = idx === 2;
          const pricePerCredit = (Number(pack.price_chf) / pack.credits).toFixed(2);

          return (
            <Card
              key={pack.id}
              className={`relative transition-all hover:shadow-md ${
                isPopular
                  ? "border-primary/40 ring-1 ring-primary/20"
                  : "hover:border-primary/30"
              }`}
            >
              {isPopular && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Meilleur rapport
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-2 pt-5">
                <CardTitle className="text-base">{pack.label}</CardTitle>
                <p className="text-sm text-muted-foreground">{pack.description}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{pack.credits}</span>
                  <span className="text-sm text-muted-foreground">crédits</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {pricePerCredit} CHF / crédit
                </p>
                <Button
                  onClick={() => purchase.mutate(pack.slug)}
                  disabled={purchase.isPending}
                  className="w-full"
                  variant={isPopular ? "default" : "outline"}
                >
                  {purchase.isPending ? "Redirection..." : `${Number(pack.price_chf).toFixed(2)} CHF`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ───── Credit Orders History ──────────────────────────────── */
export function CreditOrdersHistory() {
  const { data: orders, isLoading } = useCreditOrders();

  if (isLoading) return <Skeleton className="h-40" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShoppingBag className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Achats de crédits</h3>
      </div>
      {!orders?.length ? (
        <p className="text-sm text-muted-foreground text-center py-6">Aucun achat de crédits pour le moment</p>
      ) : (
        <div className="space-y-2">
          {orders.map((order: CreditOrder) => (
            <div key={order.id} className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
              <div className="h-8 w-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
                {order.status === "credited" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : order.status === "pending" ? (
                  <Clock className="h-4 w-4 text-yellow-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{order.description || "Achat de crédits"}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(order.created_at), "d MMM yyyy HH:mm", { locale: fr })}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-green-600">+{order.credits}</p>
                <p className="text-xs text-muted-foreground">{Number(order.amount_chf).toFixed(2)} CHF</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───── Full Activity History (Ledger) ─────────────────────── */
export function CreditHistory() {
  const { data: entries, isLoading } = useAILedger(30);
  const [showAll, setShowAll] = useState(false);

  if (isLoading) return <Skeleton className="h-40" />;

  const displayed = showAll ? entries : entries?.slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Historique complet</h3>
      </div>
      {!displayed?.length ? (
        <p className="text-sm text-muted-foreground text-center py-6">Aucune activité IA pour le moment</p>
      ) : (
        <div className="space-y-2">
          {displayed.map((entry: AILedgerEntry) => (
            <div key={entry.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
              {operationIcons[entry.operation_type] || <Coins className="h-4 w-4" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {entry.description || operationLabels[entry.operation_type] || entry.operation_type}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(entry.created_at), "d MMM yyyy HH:mm", { locale: fr })}
                </p>
              </div>
              <span className={`text-sm font-semibold ${entry.credits_delta > 0 ? "text-green-600" : "text-destructive"}`}>
                {entry.credits_delta > 0 ? "+" : ""}{entry.credits_delta}
              </span>
            </div>
          ))}
          {entries && entries.length > 10 && !showAll && (
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowAll(true)}>
              Voir tout
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/* ───── Insufficient Credits Dialog ────────────────────────── */
export function InsufficientCreditsDialog({
  required,
  balance,
  onBuyCredits,
  onClose,
}: {
  required: number;
  balance: number;
  onBuyCredits: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="max-w-md mx-4">
        <CardContent className="p-6 space-y-4 text-center">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <Coins className="h-6 w-6 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold">Crédits insuffisants</h3>
          <p className="text-sm text-muted-foreground">
            Cette action nécessite <strong>{required} crédits</strong>.
            Vous avez actuellement <strong>{balance} crédits</strong>.
          </p>
          <p className="text-xs text-muted-foreground">
            Rechargez vos crédits pour continuer à utiliser les outils IA de DogWork.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Fermer
            </Button>
            <Button className="flex-1" onClick={onBuyCredits}>
              <Plus className="h-4 w-4 mr-1" />
              Acheter des crédits
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ───── Credit Cost Badge ──────────────────────────────────── */
export function CreditCostBadge({ featureCode, cost }: { featureCode?: string; cost?: number }) {
  const displayCost = cost ?? 1;
  return (
    <Badge variant="secondary" className="gap-1 text-xs">
      <Coins className="h-3 w-3" />
      {displayCost} crédit{displayCost > 1 ? "s" : ""}
    </Badge>
  );
}
