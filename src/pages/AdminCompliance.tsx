import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import { AlertTriangle, ShieldCheck, ShieldAlert, RefreshCw } from "lucide-react";

interface Scan {
  id: string;
  course_id: string | null;
  educator_user_id: string;
  context: string;
  status: "clean" | "warning" | "blocked";
  matches: { label: string; severity: string }[];
  scanned_text_excerpt: string | null;
  created_at: string;
}

export default function AdminCompliance() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "blocked" | "warning">("blocked");

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("marketplace_content_scans" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setScans((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [filter]);

  const stats = {
    blocked: scans.filter((s) => s.status === "blocked").length,
    warning: scans.filter((s) => s.status === "warning").length,
    total: scans.length,
  };

  return (
    <div className="container mx-auto max-w-6xl py-8 px-4">
      <Helmet>
        <title>Conformité Marketplace — Admin DogWork</title>
        <meta name="description" content="Suivi des contrôles de conformité contenu marketplace" />
      </Helmet>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conformité marketplace</h1>
          <p className="text-muted-foreground mt-1">
            Détection automatique de mentions de paiement hors-plateforme.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-1" /> Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bloqués</p>
                <p className="text-3xl font-bold text-destructive">{stats.blocked}</p>
              </div>
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avertissements</p>
                <p className="text-3xl font-bold text-amber-600">{stats.warning}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total scans</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <ShieldCheck className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 mb-4">
        {(["blocked", "warning", "all"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f === "blocked" ? "Bloqués" : f === "warning" ? "Avertissements" : "Tous"}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : scans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucun scan correspondant.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {scans.map((s) => (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Badge
                    variant={
                      s.status === "blocked"
                        ? "destructive"
                        : s.status === "warning"
                          ? "secondary"
                          : "default"
                    }
                  >
                    {s.status}
                  </Badge>
                  <span className="text-sm font-normal text-muted-foreground">
                    {s.context} · {new Date(s.created_at).toLocaleString("fr-CH")}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {s.matches.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {s.matches.map((m, i) => (
                      <Badge key={i} variant="outline">
                        {m.label} ({m.severity})
                      </Badge>
                    ))}
                  </div>
                )}
                {s.scanned_text_excerpt && (
                  <p className="text-sm text-muted-foreground italic line-clamp-3 bg-muted/30 p-2 rounded">
                    « {s.scanned_text_excerpt} »
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Éducateur : <code>{s.educator_user_id.slice(0, 8)}…</code>
                  {s.course_id && (
                    <>
                      {" "}
                      · Cours : <code>{s.course_id.slice(0, 8)}…</code>
                    </>
                  )}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
