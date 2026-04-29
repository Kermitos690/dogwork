import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, Mail, Shield, Globe, Send } from "lucide-react";
import { toast } from "sonner";

interface DnsReport {
  domain: string;
  spf: { found: boolean; raw: string[]; includes: string[]; warnings: string[] };
  dkim: { found: boolean; selectors: { selector: string; found: boolean; raw?: string }[] };
  dmarc: { found: boolean; raw: string; policy?: string; warnings: string[] };
  mx: { found: boolean; records: string[] };
  ns: { records: string[] };
}

interface SendResult {
  attempted: boolean;
  channel?: string;
  sender?: string;
  status?: string;
  logStatus?: string;
  logError?: string;
  error?: string;
  latencyMs?: number;
  idempotencyKey?: string;
  smtpCode?: string;
  hints?: string[];
}

interface DiagnosticResponse {
  success: boolean;
  totalLatencyMs: number;
  triggeredAt: string;
  triggeredBy: string;
  recipient: string;
  send: { lovable: SendResult; ionos: SendResult };
  dns: { root: DnsReport; sender: DnsReport };
}

const StatusBadge = ({ ok, warn, label }: { ok?: boolean; warn?: boolean; label: string }) => {
  if (ok && !warn) return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white"><CheckCircle2 className="h-3 w-3 mr-1" />{label}</Badge>;
  if (warn) return <Badge className="bg-amber-500 hover:bg-amber-500 text-white"><AlertTriangle className="h-3 w-3 mr-1" />{label}</Badge>;
  return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />{label}</Badge>;
};

const DnsCard = ({ report, title }: { report: DnsReport; title: string }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2"><Globe className="h-4 w-4" />{title}</span>
          <code className="text-xs font-mono text-muted-foreground">{report.domain}</code>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* SPF */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">SPF</span>
            <StatusBadge ok={report.spf.found} warn={report.spf.warnings.length > 0} label={report.spf.found ? "Présent" : "Absent"} />
          </div>
          {report.spf.raw.map((r, i) => (
            <code key={i} className="block text-xs bg-muted p-2 rounded mb-1 break-all">{r}</code>
          ))}
          {report.spf.includes.length > 0 && (
            <div className="text-xs text-muted-foreground">Includes : {report.spf.includes.join(", ")}</div>
          )}
          {report.spf.warnings.map((w, i) => (
            <div key={i} className="text-xs text-amber-600 dark:text-amber-400 mt-1">⚠ {w}</div>
          ))}
        </div>

        <Separator />

        {/* DKIM */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">DKIM</span>
            <StatusBadge ok={report.dkim.found} label={report.dkim.found ? "Détecté" : "Non détecté"} />
          </div>
          <div className="space-y-1">
            {report.dkim.selectors.map((s) => (
              <div key={s.selector} className="flex items-center justify-between text-xs">
                <code className="font-mono">{s.selector}._domainkey</code>
                {s.found ? (
                  <span className="text-emerald-600 dark:text-emerald-400">✓ trouvé</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* DMARC */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">DMARC</span>
            <StatusBadge
              ok={report.dmarc.found}
              warn={report.dmarc.warnings.length > 0}
              label={report.dmarc.found ? `p=${report.dmarc.policy || "?"}` : "Absent"}
            />
          </div>
          {report.dmarc.raw && (
            <code className="block text-xs bg-muted p-2 rounded break-all">{report.dmarc.raw}</code>
          )}
          {report.dmarc.warnings.map((w, i) => (
            <div key={i} className="text-xs text-amber-600 dark:text-amber-400 mt-1">⚠ {w}</div>
          ))}
        </div>

        <Separator />

        {/* MX */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">MX</span>
            <StatusBadge ok={report.mx.found} label={report.mx.found ? `${report.mx.records.length} record(s)` : "Aucun"} />
          </div>
          {report.mx.records.map((r, i) => (
            <code key={i} className="block text-xs bg-muted p-2 rounded mb-1 break-all">{r}</code>
          ))}
        </div>

        {/* NS */}
        {report.ns.records.length > 0 && (
          <>
            <Separator />
            <div>
              <span className="font-medium block mb-2">NS</span>
              {report.ns.records.map((r, i) => (
                <code key={i} className="block text-xs bg-muted p-2 rounded mb-1 break-all">{r}</code>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

const SendResultCard = ({ result, title, color }: { result: SendResult; title: string; color: string }) => {
  if (!result.attempted) {
    return (
      <Card className="opacity-60">
        <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Non testé</p></CardContent>
      </Card>
    );
  }

  const isOk =
    result.status === "sent" ||
    (result.status === "queued" && (!result.logStatus || ["pending", "sent"].includes(result.logStatus)));
  const isNotConfigured = result.status === "not_configured";
  const isPending = result.status === "pending_implementation" || isNotConfigured;

  return (
    <Card className={`border-l-4 ${color}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2"><Send className="h-4 w-4" />{title}</span>
          {isPending ? (
            <Badge variant="secondary">En attente</Badge>
          ) : isOk ? (
            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">OK</Badge>
          ) : (
            <Badge variant="destructive">Échec</Badge>
          )}
        </CardTitle>
        {result.sender && <CardDescription className="text-xs font-mono">{result.sender}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {result.latencyMs !== undefined && (
          <div className="flex justify-between"><span className="text-muted-foreground">Latence</span><span>{result.latencyMs} ms</span></div>
        )}
        {result.status && (
          <div className="flex justify-between"><span className="text-muted-foreground">Statut envoi</span><code className="text-xs">{result.status}</code></div>
        )}
        {result.logStatus && (
          <div className="flex justify-between"><span className="text-muted-foreground">Statut log</span><code className="text-xs">{result.logStatus}</code></div>
        )}
        {result.idempotencyKey && (
          <div className="flex justify-between"><span className="text-muted-foreground">ID</span><code className="text-xs">{result.idempotencyKey.slice(0, 24)}…</code></div>
        )}
        {(result.error || result.logError) && (
          <Alert variant={isNotConfigured ? "default" : "destructive"} className="mt-2">
            <AlertDescription className="text-xs space-y-1">
              <div>{result.error || result.logError}</div>
              {result.smtpCode && <div className="font-mono">SMTP code: {result.smtpCode}</div>}
              {result.hints && result.hints.length > 0 && (
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  {result.hints.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default function AdminEmailDiagnostics() {
  const [recipient, setRecipient] = useState("");
  const [sendLovable, setSendLovable] = useState(true);
  const [sendIonos, setSendIonos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResponse | null>(null);

  const runTest = async () => {
    if (!recipient || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient)) {
      toast.error("Email destinataire invalide");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("email-deliverability-test", {
        body: { recipientEmail: recipient, sendLovable, sendIonos },
      });
      if (error) throw error;
      setResult(data as DiagnosticResponse);
      toast.success("Diagnostic terminé");
    } catch (e: any) {
      toast.error(e.message || "Erreur lors du test");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-5xl mx-auto pt-16 pb-12 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Mail className="h-7 w-7 text-amber-500" />
          Diagnostic email
        </h1>
        <p className="text-muted-foreground mt-2">
          Test de délivrabilité multi-canaux avec vérification SPF / DKIM / DMARC.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Lancer un test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="recipient">Email destinataire</Label>
            <Input
              id="recipient"
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="vous@exemple.com"
              disabled={loading}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label className="font-medium">Voie Lovable</Label>
                <p className="text-xs text-muted-foreground">notify.dogwork-at-home.com (actuellement actif)</p>
              </div>
              <Switch checked={sendLovable} onCheckedChange={setSendLovable} disabled={loading} />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label className="font-medium">Voie IONOS SMTP</Label>
                <p className="text-xs text-muted-foreground">contact@dogwork-at-home.com (en attente de configuration)</p>
              </div>
              <Switch checked={sendIonos} onCheckedChange={setSendIonos} disabled={loading} />
            </div>
          </div>

          <Button onClick={runTest} disabled={loading || !recipient} className="w-full">
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Test en cours…</> : <><Send className="h-4 w-4 mr-2" /> Lancer le test</>}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-6">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertTitle>Diagnostic complété en {result.totalLatencyMs} ms</AlertTitle>
            <AlertDescription>
              Email envoyé à <strong>{result.recipient}</strong> — Vérifiez votre boîte de réception (et les spams).
            </AlertDescription>
          </Alert>

          <div>
            <h2 className="text-xl font-semibold mb-3">Résultats d'envoi</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <SendResultCard result={result.send.lovable} title="Lovable" color="border-l-blue-500" />
              <SendResultCard result={result.send.ionos} title="IONOS SMTP" color="border-l-purple-500" />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-3">Authentification DNS</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <DnsCard report={result.dns.root} title="Domaine racine" />
              <DnsCard report={result.dns.sender} title="Sous-domaine expéditeur" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
