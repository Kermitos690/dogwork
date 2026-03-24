import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Home, Dog, Play, BookOpen, BarChart3, ClipboardList, Bot, Shield, Calendar, Target, Sparkles, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const TOUR_KEY = "dogwork_tour_completed";

interface TourStep {
  icon: any;
  title: string;
  description: string;
  route?: string;
  emoji: string;
}

const tourSteps: TourStep[] = [
  {
    icon: Sparkles,
    title: "Bienvenue sur DogWork ! 🎉",
    description: "Découvrez votre application d'éducation canine intelligente. Cette visite guidée va vous montrer toutes les fonctionnalités disponibles.",
    emoji: "👋",
  },
  {
    icon: Home,
    title: "Dashboard",
    description: "Votre tableau de bord centralise tout : progression du jour, action rapide, alertes de sécurité et suggestions de l'IA.",
    route: "/",
    emoji: "🏠",
  },
  {
    icon: Dog,
    title: "Gestion des chiens",
    description: "Créez les profils de vos chiens avec toutes les infos : race, âge, santé, comportement. Vous pouvez gérer plusieurs chiens !",
    route: "/dogs",
    emoji: "🐕",
  },
  {
    icon: ClipboardList,
    title: "Évaluation & Problèmes",
    description: "Évaluez le comportement de votre chien via un questionnaire complet. Identifiez les problèmes et définissez vos objectifs.",
    route: "/evaluation",
    emoji: "📋",
  },
  {
    icon: Calendar,
    title: "Plan d'entraînement",
    description: "L'IA génère un plan personnalisé basé sur le profil de votre chien. Vous pouvez aussi suivre le programme standard de 28 jours.",
    route: "/plan",
    emoji: "📅",
  },
  {
    icon: Play,
    title: "Entraînement (GO !)",
    description: "Lancez vos séances avec timer intégré, compteur de répétitions et navigation entre exercices. Validez chaque exercice au fur et à mesure.",
    emoji: "▶️",
  },
  {
    icon: BookOpen,
    title: "Bibliothèque d'exercices",
    description: "Plus de 480 exercices détaillés avec étapes, erreurs courantes, précautions et critères de réussite. Filtrez par catégorie et niveau.",
    route: "/exercises",
    emoji: "📚",
  },
  {
    icon: BarChart3,
    title: "Statistiques",
    description: "Suivez votre progression avec des graphiques : tension, réactivité, distance de confort, score global et recommandations personnalisées.",
    route: "/stats",
    emoji: "📊",
  },
  {
    icon: Shield,
    title: "Sécurité",
    description: "Règles essentielles pour un entraînement bienveillant : seuils de réactivité, signaux d'apaisement, gestion de distance, et quand s'arrêter.",
    route: "/safety",
    emoji: "🛡️",
  },
  {
    icon: Bot,
    title: "Assistant IA",
    description: "Votre assistant intelligent 24/7 ! Posez vos questions, demandez des conseils personnalisés, ou demandez de l'aide sur un exercice. Cliquez le bouton 💬.",
    emoji: "🤖",
  },
  {
    icon: HelpCircle,
    title: "Guide complet",
    description: "Retrouvez le guide détaillé de toutes les fonctionnalités dans l'onglet Aide. Des tutoriels spécifiques existent pour les éducateurs et administrateurs.",
    route: "/help",
    emoji: "📖",
  },
  {
    icon: Target,
    title: "C'est parti ! 🚀",
    description: "Vous êtes prêt à commencer l'aventure DogWork avec votre compagnon. Bonne éducation ! Vous pouvez relancer cette visite depuis la page Aide.",
    emoji: "🎯",
  },
];

export function GuidedTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_KEY);
    if (!completed) {
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const close = () => {
    setIsOpen(false);
    localStorage.setItem(TOUR_KEY, "true");
  };

  const next = () => {
    if (step < tourSteps.length - 1) {
      setStep(step + 1);
    } else {
      close();
    }
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  const goToStep = () => {
    const s = tourSteps[step];
    if (s.route) {
      navigate(s.route);
    }
  };

  const current = tourSteps[step];
  const Icon = current.icon;
  const progress = ((step + 1) / tourSteps.length) * 100;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={close} role="presentation" />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Progress bar */}
          <div className="h-1 bg-muted">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Close */}
          <button onClick={close} aria-label="Fermer la visite guidée" className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors z-10">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Content */}
          <div className="p-6 pt-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Icon + Emoji */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl">{current.emoji}</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Étape {step + 1}/{tourSteps.length}</p>
                    <h3 className="text-base font-bold text-foreground">{current.title}</h3>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {current.description}
                </p>

                {/* Go to page button */}
                {current.route && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={goToStep}
                  >
                    <Icon className="h-3.5 w-3.5 mr-1.5" />
                    Voir cette page
                  </Button>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-5">
              <Button
                variant="ghost"
                size="sm"
                onClick={prev}
                disabled={step === 0}
                className="text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Précédent
              </Button>

              {/* Dots */}
              <div className="flex gap-1">
                {tourSteps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    aria-label={`Aller à l'étape ${i + 1}`}
                    aria-current={i === step ? "step" : undefined}
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      i === step ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>

              <Button
                size="sm"
                onClick={next}
                className="text-xs"
              >
                {step === tourSteps.length - 1 ? "Terminer" : "Suivant"}
                {step < tourSteps.length - 1 && <ChevronRight className="h-3.5 w-3.5 ml-1" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/** Button to manually re-trigger the tour */
export function RestartTourButton() {
  const handleRestart = () => {
    localStorage.removeItem(TOUR_KEY);
    window.location.reload();
  };

  return (
    <Button variant="outline" size="sm" onClick={handleRestart} className="gap-1.5">
      <HelpCircle className="h-3.5 w-3.5" />
      Relancer la visite guidée
    </Button>
  );
}
