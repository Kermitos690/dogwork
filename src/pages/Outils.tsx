import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveDog } from "@/hooks/useDogs";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAIBalance, useAICall, useAIFeatures } from "@/hooks/useAICredits";
import { useCreditConfirmation } from "@/hooks/useCreditConfirmation";
import { CreditConfirmDialog } from "@/components/CreditConfirmDialog";
import { AIResultDialog } from "@/components/AIResultDialog";
import { saveAiTextToJournal } from "@/lib/aiDestinations";
import { useSaveAIDocument, type AIDocumentType } from "@/hooks/useAIDocuments";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Sparkles, BookOpen, Brain, ClipboardCheck, Heart,
  TrendingUp, ImageIcon, Coins, BookMarked, ArrowRight,
  Bot, Loader2, Clock, NotebookPen,
} from "lucide-react";

interface AgentResult {
  title: string;
  summary?: string | null;
  content: unknown;
  creditsSpent: number;
  /** Plain text extracted from the result, used by destination actions. */
  text?: string;
  /** Dog this result is tied to (active dog at run time). */
  dogId?: string | null;
}

interface ToolDef {
  feature_code: string;
  icon: React.ElementType;
  title: string;
  description: string;
  accent: string;
  requiresDog?: boolean;
}

const TOOLS: ToolDef[] = [
  {
    feature_code: "ai_plan_generation",
    icon: BookOpen,
    title: "Plan d'entraînement",
    description: "Génère un programme personnalisé pour ton chien sur la durée de ton choix.",
    accent: "from-blue-500/20 to-indigo-500/10",
    requiresDog: true,
  },
  {
    feature_code: "ai_behavior_analysis",
    icon: Brain,
    title: "Analyse comportementale",
    description: "Lecture en profondeur du comportement et recommandations d'éducation.",
    accent: "from-purple-500/20 to-pink-500/10",
    requiresDog: true,
  },
  {
    feature_code: "ai_evaluation_scoring",
    icon: ClipboardCheck,
    title: "Évaluation IA scoring",
    description: "Bilan structuré et noté de la posture, focus, sociabilité de ton chien.",
    accent: "from-emerald-500/20 to-teal-500/10",
    requiresDog: true,
  },
  {
    feature_code: "ai_adoption_plan",
    icon: Heart,
    title: "Plan post-adoption",
    description: "Programme structuré pour les premières semaines d'un chien adopté.",
    accent: "from-rose-500/20 to-orange-500/10",
  },
  {
    feature_code: "ai_progress_report",
    icon: TrendingUp,
    title: "Rapport de progression",
    description: "Synthèse claire des progrès sur la période choisie.",
    accent: "from-amber-500/20 to-yellow-500/10",
    requiresDog: true,
  },
  {
    feature_code: "ai_image_generation",
    icon: ImageIcon,
    title: "Génération d'image",
    description: "Crée des illustrations sur mesure pour tes contenus.",
    accent: "from-cyan-500/20 to-sky-500/10",
  },
];

interface AgentDef {
  code: string;
  functionName: string;
  /** Strict: agent fails without an active dog (e.g. dog-only insights). */
  requiresDog: boolean;
}

const AGENTS: AgentDef[] = [
  { code: "agent_behavior_analysis", functionName: "agent-behavior-analysis", requiresDog: false },
  { code: "agent_progress_report",   functionName: "agent-progress-report",   requiresDog: false },
  { code: "agent_plan_adjustment",   functionName: "agent-plan-adjustment",   requiresDog: false },
  { code: "agent_dog_insights",      functionName: "agent-dog-insights",      requiresDog: true  },
];

export default function Outils() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentDog = useActiveDog();
  const qc = useQueryClient();
  const { data: wallet } = useAIBalance();
  const { data: features } = useAIFeatures();
  const aiCall = useAICall();
  const [running, setRunning] = useState<string | null>(null);
  const [savingToJournal, setSavingToJournal] = useState(false);
  const [savedToJournal, setSavedToJournal] = useState(false);
  const saveDoc = useSaveAIDocument();

  const FEATURE_TO_DOC_TYPE: Record<string, AIDocumentType> = {
    ai_plan_generation: "training_plan",
    ai_behavior_analysis: "behavior_analysis",
    ai_evaluation_scoring: "evaluation_scoring",
    ai_adoption_plan: "adoption_plan",
    ai_progress_report: "progress_report",
    ai_image_generation: "image",
  };

  useEffect(() => {
    document.title = "Outils IA — DogWork";
  }, []);

  const credit = useCreditConfirmation();
  const [result, setResult] = useState<AgentResult | null>(null);

  const getCost = (code: string) =>
    features?.find((f) => f.code === code)?.credits_cost ?? 0;

  const getMeta = (code: string) =>
    features?.find((f) => f.code === code);

  const toolPrompts = useMemo(() => {
    const dogLabel = currentDog?.name ? ` pour ${currentDog.name}` : "";
    return {
      ai_plan_generation: {
        title: `Plan d'entraînement${dogLabel}`,
        benefit: "Génère un plan concret, structuré et directement exploitable.",
        prompt: `Crée un plan d'entraînement canin premium, directement exploitable, en français. Structure la réponse avec: 1) Diagnostic rapide, 2) Objectifs prioritaires, 3) Plan sur 4 semaines, 4) Exercices concrets, 5) Points de vigilance. N'écris pas de JSON.`,
      },
      ai_behavior_analysis: {
        title: `Analyse comportementale${dogLabel}`,
        benefit: "Produit une lecture comportementale claire avec recommandations utiles.",
        prompt: `Rédige une analyse comportementale canine premium en français. Structure avec: 1) Lecture du profil, 2) Hypothèses comportementales, 3) Déclencheurs probables, 4) Recommandations immédiates, 5) Priorités des 7 prochains jours. N'écris pas de JSON.`,
      },
      ai_evaluation_scoring: {
        title: `Évaluation IA scoring${dogLabel}`,
        benefit: "Donne un bilan noté et lisible, pas un dump technique.",
        prompt: `Rédige une évaluation canine scorée en français. Structure avec: 1) Score global /100, 2) Scores détaillés (obéissance, focus, sociabilité, récupération, gestion émotionnelle), 3) Forces, 4) Fragilités, 5) Plan d'amélioration. N'écris pas de JSON.`,
      },
      ai_adoption_plan: {
        title: "Plan post-adoption",
        benefit: "Prépare un suivi post-adoption clair et progressif.",
        prompt: `Crée un plan post-adoption en français, directement lisible. Structure avec: 1) Priorités des 72 premières heures, 2) Routine de la première semaine, 3) Points de vigilance, 4) Exercices doux, 5) Indicateurs de bonne adaptation. N'écris pas de JSON.`,
      },
      ai_progress_report: {
        title: `Rapport de progression${dogLabel}`,
        benefit: "Fournit une synthèse claire des progrès et des prochains axes.",
        prompt: `Rédige un rapport de progression canin en français. Structure avec: 1) Résumé, 2) Progrès constatés, 3) Blocages actuels, 4) Recommandations concrètes, 5) Prochaine priorité. N'écris pas de JSON.`,
      },
    } as const;
  }, [currentDog?.name]);

  const { data: prefs } = useQuery({
    queryKey: ["ai-agent-preferences", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_agent_preferences")
        .select("agent_code, enabled, last_run_at, metadata")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const togglePref = useMutation({
    mutationFn: async ({ code, enabled }: { code: string; enabled: boolean }) => {
      if (!user) throw new Error("Non connecté");
      const { error } = await supabase
        .from("ai_agent_preferences")
        .upsert({ user_id: user.id, agent_code: code, enabled }, { onConflict: "user_id,agent_code" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-agent-preferences", user?.id] }),
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const executeAgent = async (def: AgentDef) => {
    setRunning(def.code);
    try {
      const { data, error } = await supabase.functions.invoke(def.functionName, {
        body: currentDog?.id ? { dog_id: currentDog.id } : {},
      });
      if (error) {
        const rawBody = (error as any).context?.body;
        let msg = error.message;
        if (typeof rawBody === "string") {
          try {
            msg = JSON.parse(rawBody)?.error ?? rawBody;
          } catch {
            msg = rawBody;
          }
        } else if (rawBody && typeof rawBody === "object") {
          msg = (rawBody as { error?: string }).error ?? error.message;
        }
        throw new Error(msg ?? error.message);
      }
      const meta = getMeta(def.code);
      const text = typeof data.text === "string" ? data.text : "";
      setResult({
        title: `${meta?.label ?? def.code}${data.dog_name ? ` · ${data.dog_name}` : ""}`,
        summary: text ? text.slice(0, 180) : null,
        content: { text, dog_profile: data.dog_profile, params: data.params_used },
        creditsSpent: data.credits_spent ?? meta?.credits_cost ?? 0,
        text,
        dogId: currentDog?.id ?? null,
      });
      toast.success("Génération terminée — sauvegardée dans vos documents.");
      qc.invalidateQueries({ queryKey: ["ai-agent-preferences", user?.id] });
      qc.invalidateQueries({ queryKey: ["ai-balance"] });
      qc.invalidateQueries({ queryKey: ["ai-documents"] });
    } catch (e: any) {
      toast.error(e.message ?? "Échec de l'agent");
    } finally {
      setRunning(null);
    }
  };

  const runAgent = (def: AgentDef) => {
    if (def.requiresDog && !currentDog) {
      toast.error("Sélectionnez un chien d'abord.");
      return;
    }
    const meta = getMeta(def.code);
    credit.requestConfirmation({
      featureCode: def.code,
      benefit: meta?.description ?? "Cette action consommera des crédits IA.",
      onConfirm: () => executeAgent(def),
    });
  };

  const executeTool = async (tool: ToolDef) => {
    const config = toolPrompts[tool.feature_code as keyof typeof toolPrompts];
    if (!config) {
      navigate("/documents");
      return;
    }

    setRunning(tool.feature_code);
    try {
      const data = await aiCall.mutateAsync({
        featureCode: tool.feature_code,
        systemPrompt: `Tu es un expert canin DogWork. Réponds en français, de façon premium, structurée, exploitable et sans JSON.`,
        messages: [{ role: "user", content: config.prompt }],
        stream: false,
      });

      const text =
        typeof data?.choices?.[0]?.message?.content === "string"
          ? data.choices[0].message.content
          : Array.isArray(data?.choices?.[0]?.message?.content)
            ? data.choices[0].message.content.map((part: any) => part?.text || part?.content || "").join("\n")
            : "";

      setResult({
        title: config.title,
        summary: text ? text.slice(0, 180) : tool.description,
        content: text || tool.description,
        creditsSpent: getCost(tool.feature_code),
        text,
        dogId: currentDog?.id ?? null,
      });
      toast.success("Résultat IA généré.");
      qc.invalidateQueries({ queryKey: ["ai-documents"] });
    } catch (e: any) {
      toast.error(e.message ?? "Échec de la génération");
    } finally {
      setRunning(null);
    }
  };

  const runTool = (tool: ToolDef) => {
    if (tool.requiresDog && !currentDog) {
      toast.error("Sélectionnez un chien d'abord.");
      return;
    }
    const meta = getMeta(tool.feature_code);
    credit.requestConfirmation({
      featureCode: tool.feature_code,
      benefit: toolPrompts[tool.feature_code as keyof typeof toolPrompts]?.benefit ?? meta?.description ?? tool.description,
      onConfirm: () => executeTool(tool),
    });
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Outils IA</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Tous les générateurs intelligents et agents autonomes de DogWork au même endroit.
            Chaque création est sauvegardée automatiquement dans ta bibliothèque.
          </p>
        </motion.div>

        {/* Wallet + Library shortcut */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <Card className="p-4 flex items-center justify-between bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Coins className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Solde disponible</p>
                <p className="text-xl font-bold text-foreground">
                  {wallet?.balance ?? 0} <span className="text-sm font-normal text-muted-foreground">crédits</span>
                </p>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => navigate("/shop")}>
              Recharger
            </Button>
          </Card>
          <Card
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => navigate("/documents")}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <BookMarked className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bibliothèque</p>
                <p className="text-sm font-semibold text-foreground">Mes documents IA</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Card>
        </div>

        {/* Tools grid */}
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Générateurs à la demande
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TOOLS.map((tool, idx) => {
            const cost = getCost(tool.feature_code);
            const insufficient = (wallet?.balance ?? 0) < cost;
            const Icon = tool.icon;
            return (
              <motion.div
                key={tool.feature_code}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                 <Card className={`p-4 h-full flex flex-col bg-gradient-to-br ${tool.accent} border-border/50 hover:border-primary/40 transition-all group`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-background/80 backdrop-blur flex items-center justify-center shadow-sm">
                      <Icon className="h-5 w-5 text-foreground" />
                    </div>
                    <Badge variant={insufficient ? "outline" : "secondary"} className="text-[10px]">
                      {cost} crédit{cost > 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed flex-1">
                    {tool.description}
                  </p>
                   <div className="mt-4">
                     <Button
                       size="sm"
                       onClick={() => runTool(tool)}
                       disabled={insufficient || running === tool.feature_code}
                       className="w-full"
                     >
                       {running === tool.feature_code ? (
                         <><Loader2 className="mr-2 h-4 w-4 animate-spin" />En cours…</>
                       ) : insufficient ? "Crédits insuffisants" : "Lancer maintenant"}
                     </Button>
                   </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Autonomous agents */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-1">
            <Bot className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Agents IA autonomes
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Active un agent (off par défaut), puis lance-le quand tu en as besoin. Chaque agent utilise automatiquement le profil du chien actif (âge, seuil, réactivité) et mémorise tes paramètres pour la prochaine exécution. Les crédits sont débités uniquement au lancement.
          </p>

          <div className="grid gap-3">
            {AGENTS.map((def) => {
              const meta = getMeta(def.code);
              const cost = meta?.credits_cost ?? 0;
              const pref = prefs?.find((p) => p.agent_code === def.code);
              const enabled = pref?.enabled ?? false;
              const isRunning = running === def.code;
              const insufficient = (wallet?.balance ?? 0) < cost;

              return (
                <Card key={def.code} className="p-4 border-border/60">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Sparkles className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground">
                          {meta?.label ?? def.code}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {meta?.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(v) => togglePref.mutate({ code: def.code, enabled: v })}
                      disabled={togglePref.isPending}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <Coins className="h-3 w-3" />
                        {cost} crédit{cost > 1 ? "s" : ""}
                      </Badge>
                      {def.requiresDog && (
                        <Badge variant="outline" className="text-[10px]">Chien requis</Badge>
                      )}
                      {currentDog && (
                        <Badge variant="outline" className="text-[10px]">
                          Chien actif : {currentDog.name}
                        </Badge>
                      )}
                      {(pref?.metadata as any)?.last_dog_name && (pref?.metadata as any)?.last_dog_name !== currentDog?.name && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Dernier run : {(pref?.metadata as any).last_dog_name}
                        </Badge>
                      )}
                      {pref?.last_run_at && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(pref.last_run_at), { addSuffix: true, locale: fr })}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => runAgent(def)}
                      disabled={!enabled || isRunning || insufficient}
                    >
                      {isRunning ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          En cours…
                        </>
                      ) : insufficient ? (
                        "Crédits insuffisants"
                      ) : (
                        "Lancer maintenant"
                      )}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Toutes les générations sont sauvegardées automatiquement.
          Tu peux les retrouver, renommer ou supprimer depuis la{" "}
          <button onClick={() => navigate("/documents")} className="underline hover:text-primary">
            bibliothèque
          </button>.
        </p>
      </div>

      <CreditConfirmDialog
        open={credit.open}
        onOpenChange={credit.setOpen}
        onConfirm={credit.handleConfirm}
        cost={credit.cost}
        balance={credit.balance}
        featureLabel={credit.featureLabel}
        benefit={credit.benefit}
        loading={credit.loading || running !== null}
      />

      <AIResultDialog
        open={!!result}
        onOpenChange={(o) => {
          if (!o) {
            setResult(null);
            setSavedToJournal(false);
          }
        }}
        title={result?.title ?? "Résultat"}
        summary={result?.summary}
        content={result?.content}
        creditsSpent={result?.creditsSpent}
        extraActions={
          result && user && result.dogId && result.text
            ? [
                {
                  label: savedToJournal
                    ? "Sauvegardé ✓"
                    : `Sauver dans le journal${currentDog ? ` de ${currentDog.name}` : ""}`,
                  icon: NotebookPen,
                  variant: "default",
                  loading: savingToJournal,
                  disabled: savingToJournal || savedToJournal,
                  onClick: async () => {
                    setSavingToJournal(true);
                    try {
                      await saveAiTextToJournal({
                        dogId: result.dogId!,
                        userId: user.id,
                        title: result.title,
                        text: result.text!,
                      });
                      qc.invalidateQueries({ queryKey: ["journal_entries"] });
                      setSavedToJournal(true);
                      toast.success("Ajouté au journal du chien.");
                    } catch (e: any) {
                      toast.error(e.message ?? "Échec de l'enregistrement");
                    } finally {
                      setSavingToJournal(false);
                    }
                  },
                },
              ]
            : undefined
        }
      />
    </AppLayout>
  );
}
