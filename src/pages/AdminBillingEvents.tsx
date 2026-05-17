import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  ArrowLeft, RefreshCw, AlertTriangle, CheckCircle2, Activity,
  ShieldAlert, BellRing, Clock,
} from "lucide-react";

type Period = "24h" | "7d" | "30d";
const PERIOD_HOURS: Record<Period, number> = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30 };
const PERIOD_LABEL: Record<Period, string> = { "24h": "24 heures", "7d": "7 jours", "30d": "30 jours" };

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-CH", { dateStyle: "short", timeStyle: "short" });
}

export default function AdminBillingEvents() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [period, setPeriod] = useState<Period>("24h");
  const [checking, setChecking] = useState(false);

  const since = useMemo(() => {
    const d = new Date();
    d.setHours(d.getHours() - PERIOD_HOURS[period]);
    return d.toISOString();
  }, [period]);

  const eventsQuery = useQuery({
    queryKey: ["billing_events", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_events")
        .select("id, stripe_event_id, event_type, processing_status, processing_error, created_at, connected_account_id, user_id")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const alertsQuery = useQuery({
    queryKey: ["billing_sync_alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_sync_alerts" as any)
        .select("*")
        .order("triggered_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const events = eventsQuery.data ?? [];
  const total = events.length;
  const errors = events.filter((e) => e.processing_status === "error").length;
  const lastEventAt = events[0]?.created_at ?? null;
  const isDesync = total === 0;

  const byType = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of events) m.set(e.event_type, (m.get(e.event_type) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [events]);

  const openAlerts = (alertsQuery.data ?? []).filter((a) => !a.resolved_at);

  async function runCheck() {
    setChecking(true);
    try {
      const { data, error } = await supabase.rpc("check_billing_events_sync" as any, {
        _period_hours: PERIOD_HOURS[period],
      });
      if (error) throw error;
      const res = data as any;
      if (res?.event_count === 0) {
        toast.warning(`Aucun événement sur ${PERIOD_LABEL[period]} — alerte créée.`);
      } else {
        toast.success(`${res?.event_count} événements sur ${PERIOD_LABEL[period]}.`);
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["billing_events"] }),
        qc.invalidateQueries({ queryKey: ["billing_sync_alerts"] }),
      ]);
    } catch (e: any) {
      toast.error(e.message ?? "Erreur lors du contrôle");
    } finally {
      setChecking(false);
    }
  }

  async function resolveAlert(id: string) {
    const { error } = await supabase
      .from("billing_sync_alerts" as any)
      .update({ resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Alerte résolue");
    qc.invalidateQueries({ queryKey: ["billing_sync_alerts"] });
  }

  return (
    <AppLayout>
      <div className="container max-w-6xl py-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Admin
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => eventsQuery.refetch()} disabled={eventsQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${eventsQuery.isFetching ? "animate-spin" : ""}`} />
              Rafraîchir
            </Button>
            <Button size="sm" onClick={runCheck} disabled={checking}>
              <ShieldAlert className="h-4 w-4 mr-2" />
              Contrôler la synchro
            </Button>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" /> Billing events Stripe
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Suivi en temps réel des webhooks Stripe et état de la synchronisation.
          </p>
        </div>

        {openAlerts.length > 0 && (
          <Alert variant="destructive">
            <BellRing className="h-4 w-4" />
            <AlertTitle>{openAlerts.length} alerte{openAlerts.length > 1 ? "s" : ""} active{openAlerts.length > 1 ? "s" : ""}</AlertTitle>
            <AlertDescription className="space-y-2 mt-2">
              {openAlerts.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3">
                  <div className="text-sm">
                    <div className="font-medium">{a.message}</div>
                    <div className="text-xs opacity-80">Déclenchée {fmtDate(a.triggered_at)}</div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => resolveAlert(a.id)}>
                    Résoudre
                  </Button>
                </div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="24h">24 heures</TabsTrigger>
            <TabsTrigger value="7d">7 jours</TabsTrigger>
            <TabsTrigger value="30d">30 jours</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Événements</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{total}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">En erreur</CardTitle></CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${errors > 0 ? "text-destructive" : ""}`}>{errors}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Dernier événement</CardTitle></CardHeader>
            <CardContent>
              <div className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" />{fmtDate(lastEventAt)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">État synchro</CardTitle></CardHeader>
            <CardContent>
              {isDesync ? (
                <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Désaligné</Badge>
              ) : (
                <Badge className="gap-1 bg-emerald-500/20 text-emerald-500"><CheckCircle2 className="h-3 w-3" />OK</Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {byType.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Répartition par type</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {byType.map(([type, n]) => (
                <Badge key={type} variant="outline" className="font-mono text-xs">{type} · {n}</Badge>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Événements récents ({PERIOD_LABEL[period]})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Stripe Event ID</TableHead>
                    <TableHead>Compte connecté</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventsQuery.isLoading && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
                  )}
                  {!eventsQuery.isLoading && events.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun événement sur cette période</TableCell></TableRow>
                  )}
                  {events.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs whitespace-nowrap">{fmtDate(e.created_at)}</TableCell>
                      <TableCell className="font-mono text-xs">{e.event_type}</TableCell>
                      <TableCell>
                        {e.processing_status === "success" ? (
                          <Badge className="bg-emerald-500/20 text-emerald-500">success</Badge>
                        ) : (
                          <Badge variant="destructive" title={e.processing_error ?? undefined}>{e.processing_status}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{e.stripe_event_id}</TableCell>
                      <TableCell className="font-mono text-xs">{e.connected_account_id ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Historique des alertes</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Déclenchée</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Sévérité</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Résolue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(alertsQuery.data ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucune alerte</TableCell></TableRow>
                  )}
                  {(alertsQuery.data ?? []).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs">{fmtDate(a.triggered_at)}</TableCell>
                      <TableCell className="text-xs">{a.period_hours}h</TableCell>
                      <TableCell>
                        <Badge variant={a.severity === "critical" ? "destructive" : "outline"}>{a.severity}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{a.message}</TableCell>
                      <TableCell className="text-xs">
                        {a.resolved_at ? (
                          <span className="text-emerald-500">{fmtDate(a.resolved_at)}</span>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => resolveAlert(a.id)}>Résoudre</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Un contrôle automatique s'exécute chaque jour à 08:00 UTC. Une alerte est créée si aucun événement n'est reçu sur les 24 dernières heures.
        </p>
      </div>
    </AppLayout>
  );
}
