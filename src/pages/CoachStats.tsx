import { useNavigate } from "react-router-dom";
import { CoachLayout } from "@/components/CoachLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BarChart3, Dog, Users, Activity, Shield, TrendingUp, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useCoachClients, useCoachDogs, useProAlerts } from "@/hooks/useCoach";

export default function CoachStats() {
  const navigate = useNavigate();
  const { data: clients = [] } = useCoachClients();
  const { data: dogs = [] } = useCoachDogs();
  const { data: alerts = [] } = useProAlerts();

  const sensitiveDogs = dogs.filter((d) => d.isSensitive);
  const dogsWithPlans = dogs.filter((d) => d.activePlan);
  const highTension = dogs.filter((d) => d.avgTension && d.avgTension > 3);
  const stableDogs = dogs.filter((d) => d.avgTension !== null && d.avgTension <= 2);
  const biteHistory = dogs.filter((d) => d.bite_history);
  const muzzleRequired = dogs.filter((d) => d.muzzle_required);

  const pctSensitive = dogs.length ? Math.round((sensitiveDogs.length / dogs.length) * 100) : 0;
  const pctWithPlan = dogs.length ? Math.round((dogsWithPlans.length / dogs.length) * 100) : 0;
  const avgTensionAll = dogs.filter((d) => d.avgTension !== null).length
    ? dogs.reduce((s, d) => s + (d.avgTension ?? 0), 0) / dogs.filter((d) => d.avgTension !== null).length
    : null;

  const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

  return (
    <CoachLayout>
      <div className="space-y-5 pb-24">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/coach")}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-lg font-bold text-foreground">Statistiques professionnelles</h1>
        </div>

        {/* Overview */}
        <motion.div {...fadeUp}>
          <h2 className="text-sm font-semibold text-foreground mb-3">Vue d'ensemble</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Clients actifs", value: clients.length, icon: Users, color: "text-blue-400" },
              { label: "Chiens suivis", value: dogs.length, icon: Dog, color: "text-emerald-400" },
              { label: "Plans actifs", value: dogsWithPlans.length, icon: TrendingUp, color: "text-purple-400" },
              { label: "Alertes ouvertes", value: alerts.length, icon: AlertTriangle, color: "text-amber-400" },
            ].map((s) => (
              <Card key={s.label} className="bg-card/70 border-border/40">
                <CardContent className="p-4">
                  <s.icon className={`h-4 w-4 ${s.color} mb-1`} />
                  <span className="text-2xl font-bold text-foreground block">{s.value}</span>
                  <span className="text-[10px] text-muted-foreground">{s.label}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Répartition */}
        <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
          <h2 className="text-sm font-semibold text-foreground mb-3">Répartition des profils</h2>
          <Card className="bg-card/60 border-border/40">
            <CardContent className="p-4 space-y-3">
              {[
                { label: "Profils sensibles", count: sensitiveDogs.length, pct: pctSensitive, color: "bg-destructive" },
                { label: "Avec plan actif", count: dogsWithPlans.length, pct: pctWithPlan, color: "bg-primary" },
                { label: "Historique morsure", count: biteHistory.length, pct: dogs.length ? Math.round((biteHistory.length / dogs.length) * 100) : 0, color: "bg-red-500" },
                { label: "Muselière obligatoire", count: muzzleRequired.length, pct: dogs.length ? Math.round((muzzleRequired.length / dogs.length) * 100) : 0, color: "bg-amber-500" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className="text-xs text-foreground font-medium">{item.count} ({item.pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-border/30">
                    <div className={`h-full rounded-full ${item.color} transition-all`} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Tension moyenne */}
        <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
          <h2 className="text-sm font-semibold text-foreground mb-3">Indicateurs clés</h2>
          <div className="grid grid-cols-3 gap-2">
            <Card className="bg-card/60 border-border/40">
              <CardContent className="p-3 text-center">
                <span className="text-lg font-bold text-foreground">{avgTensionAll?.toFixed(1) ?? "—"}</span>
                <p className="text-[10px] text-muted-foreground">Tension moy.</p>
              </CardContent>
            </Card>
            <Card className="bg-card/60 border-border/40">
              <CardContent className="p-3 text-center">
                <span className="text-lg font-bold text-emerald-400">{stableDogs.length}</span>
                <p className="text-[10px] text-muted-foreground">Stables</p>
              </CardContent>
            </Card>
            <Card className="bg-card/60 border-border/40">
              <CardContent className="p-3 text-center">
                <span className="text-lg font-bold text-amber-400">{highTension.length}</span>
                <p className="text-[10px] text-muted-foreground">Tension ↑</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Insights */}
        <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
          <h2 className="text-sm font-semibold text-foreground mb-3">Analyses automatiques</h2>
          <div className="space-y-2">
            {dogs.length === 0 && (
              <Card className="bg-card/50 border-border/40">
                <CardContent className="p-4 text-center text-sm text-muted-foreground">
                  Liez des clients pour voir les analyses.
                </CardContent>
              </Card>
            )}
            {sensitiveDogs.length > 0 && (
              <Card className="bg-destructive/5 border-destructive/20">
                <CardContent className="p-3">
                  <p className="text-xs text-foreground">
                    <Shield className="h-3 w-3 inline text-destructive mr-1" />
                    {sensitiveDogs.length} profil{sensitiveDogs.length > 1 ? "s" : ""} sensible{sensitiveDogs.length > 1 ? "s" : ""} nécessitant un suivi renforcé.
                  </p>
                </CardContent>
              </Card>
            )}
            {highTension.length > 0 && (
              <Card className="bg-amber-500/5 border-amber-500/20">
                <CardContent className="p-3">
                  <p className="text-xs text-foreground">
                    <Activity className="h-3 w-3 inline text-amber-400 mr-1" />
                    {highTension.length} chien{highTension.length > 1 ? "s" : ""} avec tension élevée. Envisagez un allègement du plan.
                  </p>
                </CardContent>
              </Card>
            )}
            {stableDogs.length > 0 && (
              <Card className="bg-emerald-500/5 border-emerald-500/20">
                <CardContent className="p-3">
                  <p className="text-xs text-foreground">
                    <TrendingUp className="h-3 w-3 inline text-emerald-400 mr-1" />
                    {stableDogs.length} chien{stableDogs.length > 1 ? "s" : ""} stable{stableDogs.length > 1 ? "s" : ""}. Bonne dynamique de progression.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
