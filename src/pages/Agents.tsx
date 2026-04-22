import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveDog } from "@/hooks/useDogs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Sparkles, Loader2, Coins, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface AgentDef {
  code: string;
  functionName: string;
  needsDog: boolean;
  icon: typeof Bot;
}

const AGENTS: AgentDef[] = [
  { code: "agent_behavior_analysis", functionName: "agent-behavior-analysis", needsDog: false, icon: Sparkles },
  { code: "agent_progress_report",   functionName: "agent-progress-report",   needsDog: false, icon: Sparkles },
  { code: "agent_plan_adjustment",   functionName: "agent-plan-adjustment",   needsDog: false, icon: Bot },
  { code: "agent_dog_insights",      functionName: "agent-dog-insights",      needsDog: true,  icon: Bot },
];

export default function Agents() {
  const { user } = useAuth();
  const { data: currentDog } = useActiveDog();
  const qc = useQueryClient();
  const [running, setRunning] = useState<string | null>(null);

  const { data: catalog, isLoading: catalogLoading } = useQuery({
    queryKey: ["ai-feature-catalog", "agents"],
    queryFn: async () => {
      const codes = AGENTS.map((a) => a.code);
      const { data, error } = await supabase
        .from("ai_feature_catalog")
        .select("code, label, description, credits_cost, model")
        .in("code", codes);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: prefs, isLoading: prefsLoading } = useQuery({
    queryKey: ["ai-agent-preferences", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_agent_preferences")
        .select("agent_code, enabled, last_run_at")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const togglePref = useMutation({
    mutationFn: async ({ code, enabled }: { code: string; enabled: boolean }) => {
      if (!user) throw new Error("non connecté");
      const { error } = await supabase
        .from("ai_agent_preferences")
        .upsert({ user_id: user.id, agent_code: code, enabled }, { onConflict: "user_id,agent_code" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-agent-preferences", user?.id] }),
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  useEffect(() => {
    document.title = "Agents IA — DogWork";
  }, []);

  const runAgent = async (def: AgentDef) => {
    if (def.needsDog && !currentDog) {
      toast.error("Sélectionnez un chien d'abord.");
      return;
    }
    setRunning(def.code);
    try {
      const { data, error } = await supabase.functions.invoke(def.functionName, {
        body: { dog_id: currentDog?.id ?? null },
      });
      if (error) {
        const msg = (error as any).context?.body
          ? JSON.parse((error as any).context.body)?.error
          : error.message;
        throw new Error(msg ?? error.message);
      }
      toast.success(`Agent terminé · ${data.credits_spent} crédits débités. Document sauvegardé.`);
      qc.invalidateQueries({ queryKey: ["ai-agent-preferences", user?.id] });
      qc.invalidateQueries({ queryKey: ["ai-balance"] });
      qc.invalidateQueries({ queryKey: ["ai-documents"] });
    } catch (e: any) {
      toast.error(e.message ?? "Échec de l'agent");
    } finally {
      setRunning(null);
    }
  };

  const isLoading = catalogLoading || prefsLoading;

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-semibold tracking-tight">Agents IA autonomes</h1>
        </div>
        <p className="text-muted-foreground">
          Activez chaque agent à la demande. Les crédits sont débités uniquement lors d'un lancement manuel.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="grid gap-4">
          {AGENTS.map((def) => {
            const meta = catalog?.find((c) => c.code === def.code);
            const pref = prefs?.find((p) => p.agent_code === def.code);
            const enabled = pref?.enabled ?? false;
            const Icon = def.icon;
            const isRunning = running === def.code;

            return (
              <Card key={def.code} className="border-border/60">
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Icon className="h-4 w-4 text-primary" />
                      {meta?.label ?? def.code}
                    </CardTitle>
                    <CardDescription>{meta?.description}</CardDescription>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(v) => togglePref.mutate({ code: def.code, enabled: v })}
                    disabled={togglePref.isPending}
                  />
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="secondary" className="gap-1">
                      <Coins className="h-3 w-3" />
                      {meta?.credits_cost} crédits / lancement
                    </Badge>
                    {def.needsDog && (
                      <Badge variant="outline">Chien requis</Badge>
                    )}
                    {pref?.last_run_at && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Dernier lancement{" "}
                        {formatDistanceToNow(new Date(pref.last_run_at), { addSuffix: true, locale: fr })}
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => runAgent(def)}
                    disabled={!enabled || isRunning}
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        En cours…
                      </>
                    ) : (
                      "Lancer maintenant"
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Chaque exécution est tracée dans <a className="underline" href="/documents">Mes documents</a> et dans le journal des crédits.
      </p>
    </div>
  );
}
