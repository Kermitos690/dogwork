import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAIBalance, useAIFeatures } from "@/hooks/useAICredits";
import {
  Sparkles, BookOpen, Brain, ClipboardCheck, Heart,
  TrendingUp, ImageIcon, Coins, BookMarked, ArrowRight
} from "lucide-react";

interface ToolDef {
  feature_code: string;
  icon: React.ElementType;
  title: string;
  description: string;
  route: string;
  accent: string;
}

const TOOLS: ToolDef[] = [
  {
    feature_code: "ai_plan_generation",
    icon: BookOpen,
    title: "Plan d'entraînement",
    description: "Génère un programme personnalisé pour ton chien sur la durée de ton choix.",
    route: "/plan",
    accent: "from-blue-500/20 to-indigo-500/10",
  },
  {
    feature_code: "ai_behavior_analysis",
    icon: Brain,
    title: "Analyse comportementale",
    description: "Lecture en profondeur du comportement et recommandations d'éducation.",
    route: "/stats",
    accent: "from-purple-500/20 to-pink-500/10",
  },
  {
    feature_code: "ai_evaluation_scoring",
    icon: ClipboardCheck,
    title: "Évaluation IA scoring",
    description: "Bilan structuré et noté de la posture, focus, sociabilité de ton chien.",
    route: "/evaluation",
    accent: "from-emerald-500/20 to-teal-500/10",
  },
  {
    feature_code: "ai_adoption_plan",
    icon: Heart,
    title: "Plan post-adoption",
    description: "Programme structuré pour les premières semaines d'un chien adopté.",
    route: "/adoption-followup",
    accent: "from-rose-500/20 to-orange-500/10",
  },
  {
    feature_code: "ai_progress_report",
    icon: TrendingUp,
    title: "Rapport de progression",
    description: "Synthèse claire des progrès sur la période choisie.",
    route: "/stats",
    accent: "from-amber-500/20 to-yellow-500/10",
  },
  {
    feature_code: "ai_image_generation",
    icon: ImageIcon,
    title: "Génération d'image",
    description: "Crée des illustrations sur mesure pour tes contenus.",
    route: "/outils",
    accent: "from-cyan-500/20 to-sky-500/10",
  },
];

export default function Outils() {
  const navigate = useNavigate();
  const { data: wallet } = useAIBalance();
  const { data: features } = useAIFeatures();

  const getCost = (code: string) =>
    features?.find((f) => f.code === code)?.credits_cost ?? 0;

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
            Tous les générateurs intelligents de DogWork au même endroit.
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
                <Card
                  className={`p-4 h-full flex flex-col bg-gradient-to-br ${tool.accent} border-border/50 hover:border-primary/40 transition-all cursor-pointer group`}
                  onClick={() => navigate(tool.route)}
                >
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
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className={insufficient ? "text-destructive" : "text-primary font-medium"}>
                      {insufficient ? "Crédits insuffisants" : "Lancer →"}
                    </span>
                  </div>
                </Card>
              </motion.div>
            );
          })}
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
    </AppLayout>
  );
}
