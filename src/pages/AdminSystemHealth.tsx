import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Activity, Bell, CheckCircle2, XCircle, RefreshCw, Send,
  Loader2, ServerCog, Database, Radio, Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

type HealthSnapshot = {
  push_subs_active: number;
  push_subs_total: number;
  notifications_24h: number;
  notification_logs_24h: number;
  notification_logs_failed_24h: number;
  prefs_users: number;
  cron_runs_24h: number | null;
  cron_failures_24h: number | null;
  cron_table_exists: boolean;
};

type LogRow = {
  id: string;
  user_id: string;
  category: string;
  status: string;
  endpoints_succeeded: number;
  endpoints_failed: number;
  error: string | null;
  created_at: string;
};

function MetricCard({
  icon, label, value, hint, tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success" ? "border-emerald-200 bg-emerald-50/40" :
    tone === "warning" ? "border-amber-200 bg-amber-50/40" :
    tone === "danger" ? "border-destructive/40 bg-destructive/5" :
    "";
  return (
    <Card className={toneClass}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <div className="text-2xl font-semibold tabular-nums mt-1">{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}

export default function AdminSystemHealth() {
  const [snap, setSnap] = useState<HealthSnapshot | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);

    // Compteurs principaux (parallèle)
    const [
      subsActive, subsTotal, notif24h, log24h, logFailed24h, prefs,
      cronTableCheck,
    ] = await Promise.all([
      supabase.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("push_subscriptions").select("id", { count: "exact", head: true }),
      supabase.from("notifications").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 86_400_000).toISOString()),
      supabase.from("notification_logs").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 86_400_000).toISOString()),
      supabase.from("notification_logs").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 86_400_000).toISOString()).in("status", ["failed", "partial"]),
      supabase.from("notification_preferences").select("user_id", { count: "exact", head: true }),
      // Test si cron_job_runs existe (peut échouer, on absorbe)
      supabase.from("cron_job_runs" as any).select("id", { count: "exact", head: true }).limit(1),
    ]);

    const cronExists = !cronTableCheck.error;
    let cronRuns24h: number | null = null;
    let cronFailures24h: number | null = null;
    if (cronExists) {
      const since = new Date(Date.now() - 86_400_000).toISOString();
      const [runs, fails] = await Promise.all([
        supabase.from("cron_job_runs" as any).select("id", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("cron_job_runs" as any).select("id", { count: "exact", head: true }).gte("created_at", since).eq("is_success", false),
      ]);
      cronRuns24h = runs.count ?? 0;
      cronFailures24h = fails.count ?? 0;
    }

    setSnap({
      push_subs_active: subsActive.count ?? 0,
      push_subs_total: subsTotal.count ?? 0,
      notifications_24h: notif24h.count ?? 0,
      notification_logs_24h: log24h.count ?? 0,
      notification_logs_failed_24h: logFailed24h.count ?? 0,
      prefs_users: prefs.count ?? 0,
      cron_runs_24h: cronRuns24h,
      cron_failures_24h: cronFailures24h,
      cron_table_exists: cronExists,
    });

    const { data: recentLogs } = await supabase
      .from("notification_logs")
      .select("id, user_id, category, status, endpoints_succeeded, endpoints_failed, error, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    setLogs((recentLogs as LogRow[]) ?? []);

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const sendTestToSelf = async () => {
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSending(false);
      return;
    }
    const { data, error } = await supabase.rpc("admin_send_test_notification", {
      _target_user_id: user.id,
      _title: "Test santé système",
      _body: "Si vous voyez ce toast (in-app) ET une notification système (push), tout fonctionne.",
    });
    setSending(false);
    if (error) {
      toast({ title: "Erreur test", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Notification de test envoyée",
      description: `Notification #${(data as any)?.notification_id?.slice(0, 8)} créée. Rechargement dans 3s…`,
    });
    setTimeout(load, 3000);
  };

  const statusBadge = (s: string) => {
    if (s === "sent") return <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">sent</Badge>;
    if (s === "partial") return <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/15">partial</Badge>;
    if (s === "failed") return <Badge variant="destructive">failed</Badge>;
    if (s === "skipped") return <Badge variant="secondary">skipped</Badge>;
    return <Badge variant="outline">{s}</Badge>;
  };

  const overallTone =
    !snap ? "default" :
    snap.notification_logs_failed_24h > 5 ? "danger" :
    snap.push_subs_active === 0 ? "warning" : "success";

  return (
    <div className="container max-w-5xl mx-auto pt-16 pb-24 px-4 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">État du système</h1>
            <p className="text-sm text-muted-foreground">
              Vue d'ensemble notifications, crons, push et delivery.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Rafraîchir
        </Button>
      </div>

      {loading && !snap && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {snap && (
        <>
          <Alert variant={overallTone === "danger" ? "destructive" : "default"}>
            {overallTone === "success" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            <AlertTitle>
              {overallTone === "success" && "Système opérationnel"}
              {overallTone === "warning" && "Aucun device push actif"}
              {overallTone === "danger" && "Échecs récents détectés"}
            </AlertTitle>
            <AlertDescription>
              {overallTone === "success" && "Les notifications, le push et la base de subscriptions sont en bonne santé."}
              {overallTone === "warning" && "Aucun utilisateur n'a activé Web Push. Tant qu'il n'y en a pas, le canal push ne peut pas être testé en condition réelle."}
              {overallTone === "danger" && `${snap.notification_logs_failed_24h} envois en échec sur les dernières 24h. Vérifier les logs ci-dessous.`}
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              icon={<Bell className="h-4 w-4" />}
              label="Push actifs"
              value={snap.push_subs_active}
              hint={`${snap.push_subs_total} au total`}
              tone={snap.push_subs_active > 0 ? "success" : "warning"}
            />
            <MetricCard
              icon={<Radio className="h-4 w-4" />}
              label="Notifs in-app 24h"
              value={snap.notifications_24h}
            />
            <MetricCard
              icon={<Send className="h-4 w-4" />}
              label="Envois push 24h"
              value={snap.notification_logs_24h}
              hint={snap.notification_logs_failed_24h > 0 ? `${snap.notification_logs_failed_24h} en échec` : "0 échec"}
              tone={snap.notification_logs_failed_24h > 0 ? "warning" : "default"}
            />
            <MetricCard
              icon={<Database className="h-4 w-4" />}
              label="Préférences user"
              value={snap.prefs_users}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" /> Cron jobs
              </CardTitle>
              <CardDescription>
                {snap.cron_table_exists
                  ? "Monitoring des jobs planifiés (crédits mensuels, rappels, etc.)."
                  : "La table cron_job_runs n'existe pas encore (phase5b-fix-live-v2.sql non exécuté sur cet environnement)."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {snap.cron_table_exists ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="border rounded-md p-3">
                    <div className="text-xs text-muted-foreground">Exécutions 24h</div>
                    <div className="text-2xl font-semibold tabular-nums">{snap.cron_runs_24h ?? 0}</div>
                  </div>
                  <div className={`border rounded-md p-3 ${snap.cron_failures_24h && snap.cron_failures_24h > 0 ? "border-destructive/40 bg-destructive/5" : ""}`}>
                    <div className="text-xs text-muted-foreground">Échecs 24h</div>
                    <div className="text-2xl font-semibold tabular-nums">{snap.cron_failures_24h ?? 0}</div>
                  </div>
                </div>
              ) : (
                <Alert variant="default">
                  <ServerCog className="h-4 w-4" />
                  <AlertDescription>
                    Pour activer le monitoring cron, exécuter <code className="text-xs">.lovable/phase5b-fix-live-v2.sql</code> sur la base concernée.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Derniers envois (notification_logs)</CardTitle>
              <CardDescription>10 lignes les plus récentes, tous statuts confondus.</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun envoi enregistré.</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((l) => (
                    <div key={l.id} className="flex items-start gap-3 text-xs border rounded-md p-2 bg-muted/20">
                      <div className="shrink-0">{statusBadge(l.status)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{l.category}</span>
                          <span className="text-muted-foreground">
                            {l.endpoints_succeeded}/{l.endpoints_succeeded + l.endpoints_failed} endpoints
                          </span>
                          <span className="text-muted-foreground ml-auto">
                            {new Date(l.created_at).toLocaleString("fr-FR")}
                          </span>
                        </div>
                        {l.error && (
                          <div className="mt-1 text-destructive break-all opacity-80">{l.error}</div>
                        )}
                        <div className="text-muted-foreground/70 mt-1">user {l.user_id.slice(0, 8)}…</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={sendTestToSelf} disabled={sending} className="w-full justify-start">
                {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Envoyer une notification de test à moi-même (in-app + push)
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/admin/push-status">
                  <Bell className="h-4 w-4 mr-2" />
                  Diagnostic Web Push détaillé →
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/admin/pwa-diagnostics">
                  <ServerCog className="h-4 w-4 mr-2" />
                  Diagnostic PWA →
                </Link>
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
