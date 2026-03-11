import { useNavigate } from "react-router-dom";
import { CoachLayout } from "@/components/CoachLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, Dog, FileText, AlertTriangle, TrendingUp, BarChart3,
  ChevronRight, Clock, Shield, Plus, Search, Activity,
} from "lucide-react";
import { motion } from "framer-motion";
import { useCoachClients, useCoachDogs, useCoachNotes, useProAlerts } from "@/hooks/useCoach";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

export default function CoachDashboard() {
  const navigate = useNavigate();
  const { data: clients = [] } = useCoachClients();
  const { data: dogs = [] } = useCoachDogs();
  const { data: notes = [] } = useCoachNotes();
  const { data: alerts = [] } = useProAlerts();

  const sensitiveDogs = dogs.filter((d) => d.isSensitive);
  const activePlans = dogs.filter((d) => d.activePlan).length;
  const highTensionDogs = dogs.filter((d) => d.avgTension && d.avgTension > 3);

  const stats = [
    { label: "Clients", value: clients.length, icon: Users, color: "text-blue-400" },
    { label: "Chiens suivis", value: dogs.length, icon: Dog, color: "text-emerald-400" },
    { label: "Plans actifs", value: activePlans, icon: FileText, color: "text-purple-400" },
    { label: "Alertes", value: alerts.length, icon: AlertTriangle, color: "text-amber-400" },
  ];

  return (
    <CoachLayout>
      <div className="space-y-5 pb-24">
        {/* Hero */}
        <motion.div {...fadeUp} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-card to-accent/10 border border-primary/20 p-5">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium text-primary uppercase tracking-wider">Mode Professionnel</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">Vue d'ensemble</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {clients.length} client{clients.length !== 1 ? "s" : ""} · {dogs.length} chien{dogs.length !== 1 ? "s" : ""} suivi{dogs.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
        </motion.div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s, i) => (
            <motion.div key={s.label} {...fadeUp} transition={{ delay: i * 0.05 }}>
              <Card className="bg-card/80 border-border/50 backdrop-blur">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                  </div>
                  <span className="text-2xl font-bold text-foreground">{s.value}</span>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Alerts */}
        {(alerts.length > 0 || highTensionDogs.length > 0) && (
          <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Cas sensibles
              </h2>
              <Badge variant="outline" className="text-amber-400 border-amber-400/30">
                {alerts.length + highTensionDogs.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {sensitiveDogs.slice(0, 3).map((dog) => (
                <Card key={dog.id} className="bg-card/80 border-destructive/20 cursor-pointer hover:border-destructive/40 transition-colors"
                  onClick={() => navigate(`/coach/dog/${dog.id}`)}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground">{dog.name}</span>
                        {dog.bite_history && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Morsure</Badge>}
                        {dog.muzzle_required && <Badge className="bg-amber-500/20 text-amber-400 text-[10px] px-1.5 py-0 border-0">Muselière</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground">{dog.clientName}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
              {highTensionDogs.slice(0, 2).map((dog) => (
                <Card key={`t-${dog.id}`} className="bg-card/80 border-amber-500/20 cursor-pointer"
                  onClick={() => navigate(`/coach/dog/${dog.id}`)}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm text-foreground">{dog.name}</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Activity className="h-3 w-3 text-amber-400" />
                        <span className="text-xs text-amber-400">Tension élevée ({dog.avgTension?.toFixed(1)})</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Quick Nav */}
        <motion.div {...fadeUp} transition={{ delay: 0.25 }}>
          <h2 className="text-sm font-semibold text-foreground mb-3">Accès rapide</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Clients", icon: Users, path: "/coach/clients", color: "text-blue-400" },
              { label: "Chiens suivis", icon: Dog, path: "/coach/dogs", color: "text-emerald-400" },
              { label: "Notes pro", icon: FileText, path: "/coach/notes", color: "text-purple-400" },
              { label: "Statistiques", icon: BarChart3, path: "/coach/stats", color: "text-cyan-400" },
            ].map((item) => (
              <Button
                key={item.label}
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 bg-card/50 border-border/50"
                onClick={() => navigate(item.path)}
              >
                <item.icon className={`h-5 w-5 ${item.color}`} />
                <span className="text-xs">{item.label}</span>
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Activité récente
          </h2>
          {clients.length === 0 ? (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-6 text-center">
                <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Aucun client lié pour le moment</p>
                <Button variant="outline" className="mt-3" onClick={() => navigate("/coach/clients")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un client
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {clients.slice(0, 5).map((client) => (
                <Card key={client.userId} className="bg-card/60 border-border/40 cursor-pointer hover:bg-card/80 transition-colors"
                  onClick={() => navigate(`/coach/clients/${client.userId}`)}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm text-foreground">{client.displayName}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{client.dogsCount} chien{client.dogsCount !== 1 ? "s" : ""}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(client.lastActivity), "d MMM", { locale: fr })}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent Notes */}
        {notes.length > 0 && (
          <motion.div {...fadeUp} transition={{ delay: 0.35 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Dernières notes</h2>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/coach/notes")}>
                Voir tout <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <div className="space-y-2">
              {notes.slice(0, 3).map((note) => (
                <Card key={note.id} className="bg-card/50 border-border/40">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px]">{note.note_type}</Badge>
                      {note.priority_level === "high" && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Prioritaire</Badge>}
                    </div>
                    <p className="text-sm text-foreground font-medium">{note.title || "Note"}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{note.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
