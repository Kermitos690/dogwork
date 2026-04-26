import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { parseEdgeFunctionError } from "@/lib/edgeFunctionError";

type CheckResult = {
  group: string;
  label: string;
  required: boolean;
  ok: boolean;
  detail?: string;
};

type Report = {
  key_type: string;
  is_live: boolean;
  account_id: string | null;
  account_country: string | null;
  checks: CheckResult[];
  required_failed: number;
  optional_failed: number;
  ready_for_production: boolean;
};

const KEY_TYPE_LABEL: Record<string, string> = {
  restricted_live: "Clé restreinte LIVE (rk_live_…)",
  secret_live: "Clé secrète LIVE (sk_live_…)",
  restricted_test: "Clé restreinte TEST (rk_test_…)",
  secret_test: "Clé secrète TEST (sk_test_…)",
  unknown: "Type de clé inconnu",
};

export default function AdminStripeVerify() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);

  const runVerification = async () => {
    setLoading(true);
    setReport(null);
    try {
      const { data, error } = await supabase.functions.invoke("verify-stripe-key");
      if (error) {
        const parsed = await parseEdgeFunctionError(error);
        throw new Error(parsed.message);
      }
      if ((data as any)?.error) {
        throw new Error((data as any).error);
      }
      setReport(data as Report);
      toast.success("Vérification terminée");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur de vérification");
    } finally {
      setLoading(false);
    }
  };

  const groupedChecks = report
    ? report.checks.reduce<Record<string, CheckResult[]>>((acc, c) => {
        (acc[c.group] = acc[c.group] || []).push(c);
        return acc;
      }, {})
    : {};

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-3xl px-4 pt-10 space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Vérification Stripe</h1>
            <p className="text-sm text-muted-foreground">
              Contrôle automatique des permissions de la clé API en production.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Diagnostic de la clé STRIPE_SECRET_KEY
            </CardTitle>
            <CardDescription>
              Lance des appels de lecture sur chaque ressource pour vérifier que les permissions
              nécessaires (Connect, paiements, abonnements, webhooks) sont bien actives.
              Aucune écriture n'est effectuée sur Stripe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={runVerification} disabled={loading} className="w-full sm:w-auto">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Vérification en cours…
                </>
              ) : (
                "Lancer la vérification"
              )}
            </Button>
          </CardContent>
        </Card>

        {report && (
          <>
            <Alert
              variant={report.ready_for_production ? "default" : "destructive"}
              className={report.ready_for_production ? "border-emerald-500/50" : ""}
            >
              {report.ready_for_production ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
              <AlertTitle>
                {report.ready_for_production
                  ? "Clé prête pour la production"
                  : "La clé n'est pas prête pour la production"}
              </AlertTitle>
              <AlertDescription className="space-y-1 mt-1">
                <div>
                  <span className="font-medium">Type :</span> {KEY_TYPE_LABEL[report.key_type] ?? report.key_type}
                </div>
                <div>
                  <span className="font-medium">Compte Stripe :</span>{" "}
                  {report.account_id ?? "non détecté"}
                  {report.account_country ? ` (${report.account_country})` : ""}
                </div>
                <div>
                  <span className="font-medium">Permissions requises manquantes :</span>{" "}
                  {report.required_failed}
                </div>
                <div>
                  <span className="font-medium">Permissions optionnelles manquantes :</span>{" "}
                  {report.optional_failed}
                </div>
                {!report.is_live && (
                  <div className="text-amber-600 font-medium pt-1">
                    ⚠️ Cette clé est en mode TEST. Pour la production, utiliser une clé live (rk_live_… ou sk_live_…).
                  </div>
                )}
              </AlertDescription>
            </Alert>

            {Object.entries(groupedChecks).map(([group, items]) => (
              <Card key={group}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{group}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.map((c) => (
                    <div
                      key={`${group}-${c.label}`}
                      className="flex items-start justify-between gap-3 rounded-md border bg-card/50 px-3 py-2"
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        {c.ok ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                        ) : c.required ? (
                          <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{c.label}</div>
                          {c.detail && (
                            <div className="text-xs text-muted-foreground mt-0.5 break-words">
                              {c.detail}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant={c.required ? "default" : "secondary"} className="shrink-0">
                        {c.required ? "Requis" : "Optionnel"}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}

            {!report.ready_for_production && report.required_failed > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Action requise</AlertTitle>
                <AlertDescription>
                  Régénérez la clé restreinte dans Stripe avec les permissions marquées « Requis » ci-dessus,
                  puis mettez à jour le secret <code className="font-mono">STRIPE_SECRET_KEY</code> et
                  relancez la vérification.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </div>
    </div>
  );
}
