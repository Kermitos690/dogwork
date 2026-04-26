import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, FlaskConical, ShieldAlert, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function AdminTestWebhook() {
  const { user } = useAuth();
  const [targetUserId, setTargetUserId] = useState(user?.id || "");
  const [planSlug, setPlanSlug] = useState<string>("");
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [mode, setMode] = useState<"payment" | "subscription">("subscription");
  const [result, setResult] = useState<any>(null);

  const { data: plans } = useQuery({
    queryKey: ["plans-for-sim"],
    queryFn: async () => {
      const { data } = await supabase.from("plans").select("slug, name, included_credits").order("slug");
      return data ?? [];
    },
  });

  const { data: modules } = useQuery({
    queryKey: ["modules-for-sim"],
    queryFn: async () => {
      const { data } = await supabase.from("modules").select("slug, name").order("name");
      return data ?? [];
    },
  });

  const simulate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("simulate-webhook-provision", {
        body: {
          target_user_id: targetUserId.trim() || undefined,
          plan_slug: planSlug || null,
          module_slugs: selectedModules,
          mode,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success(`Simulation OK — ${data.provisioned?.length ?? 0} module(s), ${data.credits?.granted ?? 0} crédits`);
    },
    onError: (e: Error) => {
      setResult({ error: e.message });
      toast.error(`Échec : ${e.message}`);
    },
  });

  const toggleModule = (slug: string) => {
    setSelectedModules((cur) => cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug]);
  };

  return (
    <div className="container max-w-5xl mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FlaskConical className="h-7 w-7" /> Simulation webhook Stripe
        </h1>
        <p className="text-muted-foreground mt-2">
          Outil admin pour tester l'activation modules + crédit des crédits inclus, sans passer par un vrai paiement Stripe.
          Reproduit exactement la branche <code className="text-xs bg-muted px-1 rounded">dogwork_module</code> du webhook.
        </p>
      </div>

      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Attention — environnement</AlertTitle>
        <AlertDescription>
          Cette simulation écrit dans la base de données <strong>réelle</strong> de l'environnement courant.
          À utiliser sur un compte de test ou Preview, jamais en Live sans précaution.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Paramètres de simulation</CardTitle>
          <CardDescription>Renseigne le compte cible, un plan et/ou des modules à activer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="user">User ID cible (UUID)</Label>
            <Input id="user" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)}
              placeholder="UUID utilisateur — laisse vide pour ton propre compte" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Plan (optionnel)</Label>
              <Select value={planSlug} onValueChange={setPlanSlug}>
                <SelectTrigger><SelectValue placeholder="— aucun —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">— aucun —</SelectItem>
                  {plans?.map((p) => (
                    <SelectItem key={p.slug} value={p.slug}>
                      {p.name} ({p.slug}) — {p.included_credits ?? 0} crédits inclus
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="subscription">Abonnement</SelectItem>
                  <SelectItem value="payment">Paiement unique (addon)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Modules supplémentaires (en plus du plan)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 p-3 border rounded-md max-h-60 overflow-auto">
              {modules?.map((m) => (
                <label key={m.slug} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedModules.includes(m.slug)}
                    onCheckedChange={() => toggleModule(m.slug)}
                  />
                  <span>{m.name}</span>
                  <code className="text-xs text-muted-foreground">{m.slug}</code>
                </label>
              ))}
            </div>
          </div>

          <Button
            onClick={() => simulate.mutate()}
            disabled={simulate.isPending || (!planSlug && selectedModules.length === 0)}
            className="w-full"
            size="lg"
          >
            {simulate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Lancer la simulation
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Résultat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.error ? (
              <Alert variant="destructive">
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>{result.error}</AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 border rounded-md">
                    <p className="text-xs text-muted-foreground">Modules provisionnés</p>
                    <p className="text-2xl font-bold">{result.provisioned?.length ?? 0}</p>
                  </div>
                  <div className="p-3 border rounded-md">
                    <p className="text-xs text-muted-foreground">Crédits accordés</p>
                    <p className="text-2xl font-bold">{result.credits?.granted ?? 0}</p>
                  </div>
                  <div className="p-3 border rounded-md">
                    <p className="text-xs text-muted-foreground">Solde crédits</p>
                    <p className="text-lg font-bold flex items-center gap-1">
                      {result.credits?.before ?? 0}
                      <ArrowRight className="h-4 w-4" />
                      <span className="text-emerald-600">{result.credits?.after ?? 0}</span>
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Modules résolus :</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(result.resolved_modules ?? []).map((s: string) => (
                      <Badge key={s} variant={result.provisioned?.includes(s) ? "default" : "outline"}>
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>

                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Voir le payload complet
                  </summary>
                  <pre className="mt-2 p-3 bg-muted rounded overflow-auto max-h-96">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
