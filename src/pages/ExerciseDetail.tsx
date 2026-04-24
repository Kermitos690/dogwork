import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { ExerciseContent } from "@/components/ExerciseContent";
import { useExerciseAccess } from "@/hooks/useFeatureGate";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import type { OwnerTier } from "@/lib/plans";

export default function ExerciseDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: exercise, isLoading } = useQuery({
    queryKey: ["exercise_detail_rpc", slug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_exercise_for_user", { _slug: slug! });
      if (error) throw error;
      return data as any;
    },
    enabled: !!slug,
  });

  const isLocked = exercise?.locked === true;
  const accessGate = useExerciseAccess(exercise?.min_tier || "starter");

  if (isLoading) {
    return (
      <AppLayout>
        <div className="pt-4 text-center">
          <div className="animate-pulse text-muted-foreground">{t("common.loading")}</div>
        </div>
      </AppLayout>
    );
  }

  if (!exercise) {
    return <ExerciseNotFound slug={slug || ""} navigate={navigate} t={t} />;
  }

  // Gate: if exercise is locked for this user's tier (server-side enforced)
  if (isLocked || !accessGate.allowed) {
    return (
      <AppLayout>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pb-8 space-y-4">
          <div className="flex items-center gap-3">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/exercises")} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <ArrowLeft className="h-4 w-4 text-foreground" />
            </motion.button>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{exercise.category_icon} {exercise.category_name}</p>
              <h1 className="text-lg font-bold text-foreground break-words">{exercise.name}</h1>
            </div>
          </div>

          {exercise.cover_image && (
            <div className="w-full rounded-2xl overflow-hidden border border-border relative">
              <img src={exercise.cover_image} alt={exercise.name} className="w-full h-auto max-w-full object-contain blur-sm opacity-50" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Badge className="text-sm bg-background/80 backdrop-blur-sm">
                  Contenu {(exercise.min_tier as string) === "expert" ? "Expert" : "Pro"}
                </Badge>
              </div>
            </div>
          )}

          <UpgradePrompt
            requiredTier={exercise.min_tier as OwnerTier}
            title={exercise.name}
            description={exercise.objective || `Cet exercice nécessite le plan ${(exercise.min_tier as string) === "expert" ? "Expert" : "Pro"} pour être consulté.`}
          />
        </motion.div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/exercises")} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </motion.button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{exercise.category_icon} {exercise.category_name}</p>
            <h1 className="text-lg font-bold text-foreground break-words">{exercise.name}</h1>
          </div>
        </div>

        <ExerciseContent exercise={exercise} />

        <div className="flex gap-2 pt-2">
          <motion.div whileTap={{ scale: 0.95 }} className="flex-1">
            <Button className="w-full gap-2 rounded-xl h-11" onClick={() => navigate(`/training/1?source=exercise&exercise=${exercise.slug}`)}>
              <Play className="h-4 w-4" /> {t("exerciseDetail.start")}
            </Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button variant="outline" className="rounded-xl h-11 px-4">
              <Heart className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </AppLayout>
  );
}

/**
 * Écran "exercice introuvable" enrichi : propose des suggestions
 * basées sur les mots-clés du slug demandé. Évite les culs-de-sac.
 */
function ExerciseNotFound({ slug, navigate, t }: { slug: string; navigate: ReturnType<typeof useNavigate>; t: (k: string) => string }) {
  // Tokenise le slug pour chercher des correspondances ("focus-eye-contact" → ["focus","eye","contact"])
  const tokens = slug
    .split(/[-_/]+/)
    .filter(tok => tok.length >= 3)
    .map(tok => tok.toLowerCase());

  const { data: suggestions } = useQuery({
    queryKey: ["exercise_suggestions", slug],
    queryFn: async () => {
      if (tokens.length === 0) return [];
      // Recherche par OR sur slug + name pour chaque token
      const orFilter = tokens
        .flatMap(tok => [`slug.ilike.%${tok}%`, `name.ilike.%${tok}%`])
        .join(",");
      const { data, error } = await supabase
        .from("exercises")
        .select("slug, name, cover_image, level")
        .or(orFilter)
        .limit(6);
      if (error) return [];
      return data || [];
    },
    enabled: tokens.length > 0,
    staleTime: 60_000,
  });

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-6 px-1 space-y-5"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
            <Heart className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="text-base font-bold text-foreground mb-1">{t("exerciseDetail.notFound")}</h1>
          <p className="text-xs text-muted-foreground max-w-xs">
            L'exercice « <span className="font-mono">{slug}</span> » n'est plus disponible. Voici quelques alternatives proches dans la bibliothèque.
          </p>
        </div>

        {suggestions && suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1">Suggestions</p>
            <div className="space-y-2">
              {suggestions.map((s: any) => (
                <motion.button
                  key={s.slug}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/exercises/${s.slug}`, { replace: true })}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors text-left"
                >
                  {s.cover_image ? (
                    <img src={s.cover_image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" loading="lazy" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                    {s.level && <p className="text-[10px] text-muted-foreground">{s.level}</p>}
                  </div>
                  <Play className="h-4 w-4 text-primary shrink-0" />
                </motion.button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={() => navigate(-1)} className="flex-1 rounded-xl">
            <ArrowLeft className="h-4 w-4 mr-1" /> {t("common.back")}
          </Button>
          <Button onClick={() => navigate("/exercises")} className="flex-1 rounded-xl">
            Bibliothèque complète
          </Button>
        </div>
      </motion.div>
    </AppLayout>
  );
}
