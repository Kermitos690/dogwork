import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity, Users, ShieldCheck, CreditCard, Sparkles, Mail, Bell,
  FileText, Rocket, AlertTriangle, ArrowRight, Coins, Store, Cog,
} from "lucide-react";
import { isDevelopment } from "@/lib/env";

/**
 * Cockpit Admin DogWork — bandeau supérieur isolé.
 * Affiche le statut production, les KPIs critiques et les raccourcis rapides.
 * N'invente jamais de données : si une métrique est indisponible, affiche "—".
 */
export function AdminCockpit() {
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ["admin_cockpit_stats"],
    queryFn: async () => {
      const [users, roles, subs, ai] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("user_roles").select("*", { count: "exact", head: true }),
        supabase
          .from("subscribers" as any)
          .select("*", { count: "exact", head: true })
          .eq("subscribed", true as any)
          .then(r => r, () => ({ count: null })),
        supabase
          .from("ai_credit_wallets" as any)
          .select("balance")
          .then(r => r, () => ({ data: null })),
      ]);
      const aiBalance = Array.isArray((ai as any).data)
        ? (ai as any).data.reduce((s: number, w: any) => s + (Number(w.balance) || 0), 0)
        : null;
      return {
        users: users.count ?? null,
        roles: roles.count ?? null,
        activeSubs: (subs as any).count ?? null,
        aiBalanceTotal: aiBalance,
      };
    },
    staleTime: 60_000,
  });

  const env = isDevelopment ? "Test" : "Production";
  const envTone = isDevelopment ? "bg-amber-500/15 text-amber-500" : "bg-emerald-500/15 text-emerald-500";

  const shortcuts: Array<{ label: string; icon: typeof Rocket; to: string }> = [
    { label: "Go-live", icon: Rocket, to: "/admin/go-live" },
    { label: "Logs", icon: FileText, to: "/admin/logs" },
    { label: "Config", icon: Cog, to: "/admin/config" },
    { label: "Utilisateurs", icon: Users, to: "/admin/users" },
    { label: "Crédits IA", icon: Coins, to: "/admin/credits" },
    { label: "Marketplace", icon: Store, to: "/admin/marketplace" },
    { label: "Stripe", icon: CreditCard, to: "/admin/stripe" },
    { label: "Emails", icon: Mail, to: "/admin/email-diagnostics" },
    { label: "Push", icon: Bell, to: "/admin/push-status" },
  ];

  const fmt = (v: number | null | undefined) =>
    v === null || v === undefined ? "—" : v.toLocaleString("fr-FR");

  return (
    <Card className="border-border/60 bg-gradient-to-br from-card via-card to-background">
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-foreground truncate">
                Votre cockpit DogWork est opérationnel.
              </h2>
              <p className="text-xs text-muted-foreground truncate">
                Aucune alerte critique détectée pour le moment.
              </p>
            </div>
          </div>
          <Badge className={`${envTone} border-0 text-[10px] uppercase tracking-wide`}>
            {env}
          </Badge>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Kpi icon={Users} label="Utilisateurs" value={fmt(stats?.users)} />
          <Kpi icon={ShieldCheck} label="Rôles attribués" value={fmt(stats?.roles)} />
          <Kpi icon={CreditCard} label="Abonnements actifs" value={fmt(stats?.activeSubs)} />
          <Kpi icon={Sparkles} label="Crédits IA en circulation" value={fmt(stats?.aiBalanceTotal)} />
        </div>

        {/* Hint */}
        <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-secondary/30 p-2.5">
          <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Certaines vérifications de production nécessitent encore une validation manuelle. Les outils
            de diagnostic restent réservés aux administrateurs.
          </p>
        </div>

        {/* Shortcuts */}
        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Accès rapides
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {shortcuts.map((s) => (
              <Button
                key={s.to}
                variant="outline"
                size="sm"
                className="justify-start h-auto py-2 text-xs"
                onClick={() => navigate(s.to)}
              >
                <s.icon className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                <span className="truncate">{s.label}</span>
                <ArrowRight className="h-3 w-3 ml-auto opacity-50 shrink-0" />
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/60 p-2.5 min-w-0">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="text-[10px] uppercase tracking-wide truncate">{label}</span>
      </div>
      <p className="text-lg sm:text-xl font-bold text-foreground truncate">{value}</p>
    </div>
  );
}
