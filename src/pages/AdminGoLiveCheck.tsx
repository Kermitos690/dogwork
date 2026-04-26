import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, XCircle, Loader2, RefreshCw, Database, CreditCard,
  Layers, ShieldAlert, ListChecks, ArrowLeft,
} from "lucide-react";

interface Snapshot {
  generated_at: string;
  environment: string;
  project_ref: string | null;
  stripe_mode: "live" | "test" | "unknown";
  counts: {
    auth_users: number;
    profiles: number;
    exercises: number;
    subscription_plans_active: number;
    ai_credit_packs_active: number;
    modules: number;
    coach_stripe_data: number;
    coach_onboarding_complete: number;
    billing_events: number;
    courses_active: number;
  };
  last_billing_events: Array<{
    id: string; stripe_event_id: string; event_type: string;
    processing_status: string; processing_error: string | null; created_at: string;
  }>;
  active_courses: Array<{ id: string; title: string; is_active: boolean; is_public: boolean }>;
  placeholder_courses_active: Array<{ id: string; title: string }>;
  checks: Record<string, boolean>;
  ready: boolean;
}

const CheckRow = ({ ok, label }: { ok: boolean; label: string }) => (
  <div className="flex items-center gap-2 text-sm">
    {ok ? (
      <CheckCircle2 className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-destructive" />
    )}
    <span className={ok ? "text-foreground" : "text-foreground font-medium"}>{label}</span>
  </div>
);

const Stat = ({ label, value, target }: { label: string; value: number; target?: number }) => {
  const ok = target === undefined ? true : value >= target;
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card/40">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-mono font-semibold ${target !== undefined ? (ok ? "text-green-600" : "text-destructive") : "text-foreground"}`}>
        {value}{target !== undefined ? ` / ${target}` : ""}
      </span>
    </div>
  );
};

export default function AdminGoLiveCheck() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const run = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-go-live-check", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {},
      });
      if (error) throw error;
      setSnap(data as Snapshot);
    } catch (e: any) {
      toast({ title: "Échec du check", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const seedModules = async () => {
    if (!session?.access_token) return;
    setActionLoading("seed");
    try {
      const { data, error } = await supabase.functions.invoke("seed-modules", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {},
      });
      if (error) throw error;
      toast({ title: "Modules synchronisés", description: `Total : ${(data as any)?.total ?? "?"}` });
      await run();
    } catch (e: any) {
      toast({ title: "Échec seed modules", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const depublishPlaceholder = async () => {
    if (!session?.access_token) return;
    setActionLoading("depub");
    try {
      const { data, error } = await supabase.functions.invoke("admin-depublish-placeholder-courses", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { dry_run: false },
      });
      if (error) throw error;
      const count = (data as any)?.depublished?.length ?? 0;
      toast({ title: "Cours dépubliés", description: `${count} cours désactivés.` });
      await run();
    } catch (e: any) {
      toast({ title: "Échec dépublication", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Go-Live Check</h1>
            <p className="text-xs text-muted-foreground">
              Audit production de l'environnement courant (Test en preview, Live après publish).
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 flex flex-wrap gap-2 items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Database className="h-4 w-4" />
              {snap ? (
                <>
                  <span className="font-mono">{snap.project_ref}</span>
                  <Badge variant="outline">{snap.environment}</Badge>
                  <Badge variant={snap.stripe_mode === "live" ? "default" : "secondary"}>
                    Stripe {snap.stripe_mode}
                  </Badge>
                </>
              ) : (
                <span>Cliquez pour lancer l'audit.</span>
              )}
            </div>
            <Button onClick={run} disabled={loading} size="sm" className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Lancer l'audit
            </Button>
          </CardContent>
        </Card>

        {snap && (
          <>
            <Card className={snap.ready ? "border-green-500/40 bg-green-500/5" : "border-amber-500/40 bg-amber-500/5"}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ListChecks className="h-4 w-4" />
                  Statut go-live
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                <CheckRow ok={snap.checks.modules_ok} label={`Modules ≥ 15 (${snap.counts.modules})`} />
                <CheckRow ok={snap.checks.no_placeholder_courses} label="Aucun cours placeholder actif" />
                <CheckRow ok={snap.checks.stripe_live_key} label="Clé Stripe en mode LIVE" />
                <CheckRow ok={snap.checks.stripe_webhook_secret} label="STRIPE_WEBHOOK_SECRET configuré" />
                <CheckRow ok={snap.checks.stripe_connect_webhook_secret} label="STRIPE_CONNECT_WEBHOOK_SECRET configuré" />
                <CheckRow ok={snap.checks.has_any_coach_onboarded} label="Au moins un éducateur onboardé Stripe Connect" />
                <CheckRow ok={snap.checks.has_any_billing_event} label="Au moins un événement billing reçu" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Indicateurs
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                <Stat label="Utilisateurs auth" value={snap.counts.auth_users} />
                <Stat label="Profils" value={snap.counts.profiles} />
                <Stat label="Exercices" value={snap.counts.exercises} target={480} />
                <Stat label="Plans actifs" value={snap.counts.subscription_plans_active} target={1} />
                <Stat label="Packs crédits actifs" value={snap.counts.ai_credit_packs_active} target={1} />
                <Stat label="Modules" value={snap.counts.modules} target={15} />
                <Stat label="coach_stripe_data" value={snap.counts.coach_stripe_data} />
                <Stat label="Coachs onboardés" value={snap.counts.coach_onboarding_complete} />
                <Stat label="billing_events" value={snap.counts.billing_events} />
                <Stat label="Cours actifs" value={snap.counts.courses_active} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Actions correctives
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={seedModules}
                  disabled={actionLoading === "seed"}
                >
                  {actionLoading === "seed" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
                  Provisionner / re-synchroniser les 15 modules
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={depublishPlaceholder}
                  disabled={actionLoading === "depub" || snap.placeholder_courses_active.length === 0}
                >
                  {actionLoading === "depub" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                  Dépublier les cours placeholder ({snap.placeholder_courses_active.length})
                </Button>
              </CardContent>
            </Card>

            {snap.placeholder_courses_active.length > 0 && (
              <Card className="border-destructive/40 bg-destructive/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Cours placeholder détectés</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {snap.placeholder_courses_active.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-xs">
                      <span className="font-mono">{c.title}</span>
                      <span className="text-muted-foreground font-mono">{c.id.slice(0, 8)}…</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Derniers billing_events
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {snap.last_billing_events.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucun événement enregistré.</p>
                ) : (
                  snap.last_billing_events.map((e) => (
                    <div key={e.id} className="text-xs flex items-center justify-between gap-2 py-1 border-b border-border/30 last:border-0">
                      <span className="font-mono">{e.event_type}</span>
                      <Badge
                        variant={e.processing_status === "success" ? "default" : "destructive"}
                        className="text-[10px]"
                      >
                        {e.processing_status}
                      </Badge>
                      <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString("fr-CH")}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Configuration Stripe Dashboard (manuelle)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <p className="text-foreground font-medium">Webhook plateforme (mode LIVE)</p>
                <code className="block bg-muted/50 p-2 rounded text-[11px] break-all">
                  https://dcwbqsfeouvghcnvhrpj.supabase.co/functions/v1/stripe-webhook
                </code>
                <p className="text-foreground font-medium pt-2">Webhook Connect (mode LIVE, Connected accounts)</p>
                <code className="block bg-muted/50 p-2 rounded text-[11px] break-all">
                  https://dcwbqsfeouvghcnvhrpj.supabase.co/functions/v1/stripe-course-webhook
                </code>
                <p className="pt-2">
                  ⚠️ Le 2<sup>e</sup> endpoint doit avoir l'option <strong>"Listen to events on Connected accounts"</strong> activée
                  et son secret <code className="font-mono">whsec_…</code> doit être stocké en tant que
                  <code className="font-mono"> STRIPE_CONNECT_WEBHOOK_SECRET</code>.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
