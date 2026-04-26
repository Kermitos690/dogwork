import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, ShieldAlert, AlertTriangle, FileText } from "lucide-react";
import { CoachVerifiedBadge } from "@/components/CoachVerifiedBadge";
import { useCoachVerified } from "@/hooks/useCoachVerified";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ScanRow {
  id: string;
  course_id: string | null;
  context: string;
  status: "clean" | "warning" | "blocked";
  matches: Array<{ pattern?: string; term?: string; reason?: string }> | null;
  scanned_text_excerpt: string | null;
  created_at: string;
}

const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  clean: { label: "Conforme", variant: "secondary", icon: ShieldCheck },
  warning: { label: "Avertissement", variant: "outline", icon: AlertTriangle },
  blocked: { label: "Bloqué", variant: "destructive", icon: ShieldAlert },
};

export default function CoachCompliance() {
  const { user } = useAuth();
  const { data: verified } = useCoachVerified(user?.id);

  const { data: scans, isLoading } = useQuery({
    queryKey: ["coach-compliance-scans", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_content_scans")
        .select("id, course_id, context, status, matches, scanned_text_excerpt, created_at")
        .eq("educator_user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as ScanRow[];
    },
  });

  const blockedCount = scans?.filter((s) => s.status === "blocked").length ?? 0;
  const warningCount = scans?.filter((s) => s.status === "warning").length ?? 0;

  return (
    <div className="container max-w-5xl mx-auto py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Conformité de mon compte coach</h1>
          <p className="text-muted-foreground mt-2">
            Suivi des analyses automatiques effectuées sur vos cours marketplace et vérification de votre statut de charte.
          </p>
        </div>
        <CoachVerifiedBadge coachUserId={user?.id} hideIfNotVerified={false} size="md" />
      </div>

      {/* Statut charte */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Charte Coach DogWork
          </CardTitle>
          <CardDescription>L'acceptation de la charte est obligatoire pour publier des cours.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4 flex-wrap">
          <div className="text-sm">
            {verified?.reason === "charter_missing" && (
              <span className="text-destructive">Charte non acceptée — publication des cours bloquée.</span>
            )}
            {verified?.reason === "compliance_blocked" && (
              <span className="text-destructive">
                Charte acceptée, mais au moins un scan marketplace est bloqué dans les 90 derniers jours.
              </span>
            )}
            {verified?.verified && (
              <span className="text-emerald-700 dark:text-emerald-400">
                Charte acceptée — compte conforme. Vos cours bénéficient du badge "Vérifié charte".
              </span>
            )}
          </div>
          <Button asChild variant="outline">
            <Link to="/legal/charte-coach">Consulter la charte</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Scans totaux</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold">{scans?.length ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Avertissements</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold text-amber-600">{warningCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Bloqués (90j)</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">{blockedCount}</p></CardContent>
        </Card>
      </div>

      {blockedCount > 0 && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Action requise</AlertTitle>
          <AlertDescription>
            Vous avez {blockedCount} cours bloqué(s). Modifiez le contenu en supprimant les références à des paiements
            externes (TWINT, IBAN, PayPal, virement direct, etc.) puis republiez.
          </AlertDescription>
        </Alert>
      )}

      {/* Historique */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des analyses marketplace</CardTitle>
          <CardDescription>100 dernières analyses, plus récentes en premier.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && (
            <>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </>
          )}

          {!isLoading && (!scans || scans.length === 0) && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Aucune analyse pour le moment. Vos cours seront automatiquement analysés à la création.
            </p>
          )}

          {scans?.map((scan) => {
            const meta = STATUS_META[scan.status] ?? STATUS_META.clean;
            const Icon = meta.icon;
            return (
              <div key={scan.id} className="border rounded-lg p-4 space-y-2 bg-card">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                    <span className="text-xs text-muted-foreground">{scan.context}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(scan.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                  </span>
                </div>

                {scan.matches && scan.matches.length > 0 && (
                  <div className="text-sm">
                    <p className="font-medium text-destructive mb-1">Motifs détectés :</p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                      {scan.matches.map((m, i) => (
                        <li key={i}>
                          <span className="font-mono text-xs">{m.term || m.pattern || JSON.stringify(m)}</span>
                          {m.reason && <span className="ml-2 text-xs">— {m.reason}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {scan.scanned_text_excerpt && (
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer hover:text-foreground">Voir l'extrait analysé</summary>
                    <p className="mt-2 p-2 bg-muted rounded font-mono whitespace-pre-wrap">
                      {scan.scanned_text_excerpt}
                    </p>
                  </details>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
