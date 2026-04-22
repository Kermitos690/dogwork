import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, Sparkles, Target, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CoachLayout } from "@/components/CoachLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ExerciseContent } from "@/components/ExerciseContent";

/**
 * Coach-facing preview of an exercise.
 * Shows exactly what the owner will see (via the same RPC + shared <ExerciseContent />),
 * wrapped in a clearly-marked "preview mode" frame and an internal-metadata strip.
 */
export default function CoachExercisePreview() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const { data: exercise, isLoading, error } = useQuery({
    queryKey: ["coach_exercise_preview", slug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_exercise_for_user", { _slug: slug! });
      if (error) throw error;
      return data as any;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <CoachLayout>
        <div className="pt-4 text-center">
          <div className="animate-pulse text-muted-foreground">Chargement de l'exercice…</div>
        </div>
      </CoachLayout>
    );
  }

  if (error || !exercise) {
    return (
      <CoachLayout>
        <div className="pt-4 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Exercice introuvable.</p>
          <Button variant="outline" onClick={() => navigate(-1)}>Retour</Button>
        </div>
      </CoachLayout>
    );
  }

  const isLocked = exercise.locked === true;

  return (
    <CoachLayout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="pb-8 space-y-4"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0"
            aria-label="Retour"
          >
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </motion.button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {exercise.category_icon} {exercise.category_name}
            </p>
            <h1 className="text-lg font-bold text-foreground break-words">{exercise.name}</h1>
          </div>
        </div>

        {/* Preview mode banner */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">Mode aperçu éducateur</p>
            <p className="text-[11px] text-muted-foreground break-words">
              Vous voyez exactement ce que le client verra côté propriétaire.
            </p>
          </div>
        </div>

        {/* Internal coach metadata (only meaningful fields) */}
        <Card className="p-3 space-y-2 border-dashed">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Métadonnées internes
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {exercise.min_tier && (
              <Badge variant="outline" className="text-[10px]">
                Palier requis : {exercise.min_tier}
              </Badge>
            )}
            {typeof exercise.difficulty === "number" && (
              <Badge variant="outline" className="text-[10px]">
                Difficulté : {exercise.difficulty}/5
              </Badge>
            )}
            {typeof exercise.intensity_level === "number" && (
              <Badge variant="outline" className="text-[10px]">
                Intensité : {exercise.intensity_level}/5
              </Badge>
            )}
            {typeof exercise.cognitive_load === "number" && (
              <Badge variant="outline" className="text-[10px]">
                Charge cognitive : {exercise.cognitive_load}/5
              </Badge>
            )}
            {exercise.environment && (
              <Badge variant="outline" className="text-[10px]">
                Environnement : {exercise.environment}
              </Badge>
            )}
            {exercise.exercise_type && (
              <Badge variant="outline" className="text-[10px]">
                Type : {exercise.exercise_type}
              </Badge>
            )}
            {isLocked && (
              <Badge className="text-[10px] bg-warning/15 text-warning">
                Verrouillé pour ce profil
              </Badge>
            )}
          </div>
          {Array.isArray(exercise.priority_axis) && exercise.priority_axis.length > 0 && (
            <div className="flex items-start gap-1.5 pt-1">
              <Target className="h-3 w-3 text-primary mt-0.5 shrink-0" />
              <p className="text-[11px] text-muted-foreground break-words">
                Axes prioritaires : {exercise.priority_axis.join(", ")}
              </p>
            </div>
          )}
          {Array.isArray(exercise.target_problems) && exercise.target_problems.length > 0 && (
            <div className="flex items-start gap-1.5">
              <Layers className="h-3 w-3 text-primary mt-0.5 shrink-0" />
              <p className="text-[11px] text-muted-foreground break-words">
                Problèmes ciblés : {exercise.target_problems.join(", ")}
              </p>
            </div>
          )}
        </Card>

        {/* Shared owner-facing content (same component used in /exercises/:slug) */}
        <ExerciseContent exercise={exercise} hideActions />
      </motion.div>
    </CoachLayout>
  );
}
