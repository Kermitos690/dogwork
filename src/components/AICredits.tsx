import { useState } from "react";
import { useAIBalance, useAILedger, useAICreditPacks, usePurchaseCreditPack, type AILedgerEntry } from "@/hooks/useAICredits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Coins, Plus, History, ArrowDown, ArrowUp, Gift, RotateCcw, Settings2 } from "lucide-react";
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
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Coins className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Crédits IA</p>
          <p className="text-2xl font-bold">{wallet?.balance ?? 0}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function CreditBalanceBadge() {
  const { data: wallet } = useAIBalance();
  
  return (
    <Badge variant="outline" className="gap-1 font-medium">
      <Coins className="h-3 w-3" />
      {wallet?.balance ?? 0}
    </Badge>
  );
}

export function CreditPacksSection() {
  const { data: packs, isLoading } = useAICreditPacks();
  const purchase = usePurchaseCreditPack();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Plus className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Acheter des crédits</h3>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {packs?.map(pack => (
          <Card key={pack.id} className="hover:border-primary/40 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{pack.label}</CardTitle>
              <p className="text-sm text-muted-foreground">{pack.description}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{pack.credits}</span>
                <span className="text-sm text-muted-foreground">crédits</span>
              </div>
              <Button
                onClick={() => purchase.mutate(pack.slug)}
                disabled={purchase.isPending}
                className="w-full"
                size="sm"
              >
                {purchase.isPending ? "..." : `${Number(pack.price_chf).toFixed(2)} CHF`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function CreditHistory() {
  const { data: entries, isLoading } = useAILedger(30);
  const [showAll, setShowAll] = useState(false);

  if (isLoading) return <Skeleton className="h-40" />;

  const displayed = showAll ? entries : entries?.slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Historique</h3>
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
            L'IA utilise des ressources coûteuses. Les crédits permettent de garantir un service rapide et de qualité pour tous.
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

export function CreditCostBadge({ featureCode, cost }: { featureCode?: string; cost?: number }) {
  const displayCost = cost ?? 1;
  return (
    <Badge variant="secondary" className="gap-1 text-xs">
      <Coins className="h-3 w-3" />
      {displayCost} crédit{displayCost > 1 ? "s" : ""}
    </Badge>
  );
}
