import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Database, PlayCircle, FlaskConical, Loader2, AlertTriangle } from "lucide-react";

interface RunResult {
  success: boolean;
  dryRun: boolean;
  httpStatus: number;
  result: unknown;
  error?: {
    code: string;
    message: string;
    action: string;
  } | null;
}

export default function AdminSqlLiveRunner() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [sql, setSql] = useState("");
  const [loading, setLoading] = useState<null | "dry" | "exec">(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (dryRun: boolean) => {
    if (!session?.access_token) return;
    if (!sql.trim()) {
      toast({ title: "SQL vide", variant: "destructive" });
      return;
    }
    if (!dryRun) {
      const ok = window.confirm(
        "Exécuter ce SQL directement sur la base LIVE (production) ? Cette action est irréversible.",
      );
      if (!ok) return;
    }

    setLoading(dryRun ? "dry" : "exec");
    setResult(null);
    setError(null);
    try {
      const { data, error: err } = await supabase.functions.invoke("admin-apply-live-sql", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { sql, dryRun },
      });
      if (err) throw err;
      setResult(data as RunResult);
      toast({
        title: (data as RunResult)?.success
          ? dryRun ? "Dry-run réussi" : "SQL exécuté sur LIVE"
          : "Échec",
        variant: (data as RunResult)?.success ? "default" : "destructive",
      });
    } catch (e) {
      const msg = (e as Error).message ?? "Erreur inconnue";
      setError(msg);
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="container max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour admin
            </Button>
          </Link>
          <Badge variant="outline" className="border-amber-500/40 text-amber-600">
            <Database className="h-3 w-3 mr-1" />
            Cible : LIVE (production)
          </Badge>
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">SQL Live Runner</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Exécute du SQL directement sur la base de production via la Management API.
            Toutes les opérations sont auditées dans <code>billing_events</code>.
          </p>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm space-y-1">
            <div>• <strong>Dry-run</strong> exécute le SQL dans une transaction puis <code>ROLLBACK</code>. Aucune écriture conservée.</div>
            <div>• <strong>Exécuter</strong> applique le SQL définitivement sur LIVE.</div>
            <div>• Schémas réservés bloqués : <code>auth, storage, realtime, supabase_functions, vault</code>.</div>
            <div>• Limite : 10 exécutions par heure par admin.</div>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">SQL à exécuter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              placeholder={`-- Exemple\nALTER PUBLICATION supabase_realtime ADD TABLE public.messages;`}
              className="font-mono text-xs min-h-[320px]"
              spellCheck={false}
            />
            <div className="flex flex-wrap gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => run(true)}
                disabled={loading !== null || !sql.trim()}
              >
                {loading === "dry"
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <FlaskConical className="h-4 w-4 mr-2" />}
                Dry-run
              </Button>
              <Button
                onClick={() => run(false)}
                disabled={loading !== null || !sql.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {loading === "exec"
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <PlayCircle className="h-4 w-4 mr-2" />}
                Exécuter sur LIVE
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm break-all">{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Résultat</CardTitle>
              <div className="flex gap-2">
                <Badge variant={result.dryRun ? "secondary" : "default"}>
                  {result.dryRun ? "Dry-run" : "Exécution LIVE"}
                </Badge>
                <Badge variant={result.success ? "default" : "destructive"}>
                  HTTP {result.httpStatus} — {result.success ? "OK" : "Erreur"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {result.error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm space-y-1">
                    <div className="font-medium">{result.error.message}</div>
                    <div>{result.error.action}</div>
                  </AlertDescription>
                </Alert>
              )}
              <pre className="bg-muted/40 border border-border/40 rounded-lg p-4 text-xs font-mono overflow-auto max-h-[480px]">
                {JSON.stringify(result.result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
