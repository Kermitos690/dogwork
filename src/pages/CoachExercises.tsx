import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Search, BookOpen, Eye, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CoachLayout } from "@/components/CoachLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExerciseCoverFallback } from "@/components/ExerciseCoverFallback";

const PAGE_SIZE = 30;

const levelColors: Record<string, string> = {
  "débutant": "bg-success/15 text-success border-success/20",
  "intermédiaire": "bg-warning/15 text-warning border-warning/20",
  "avancé": "bg-destructive/15 text-destructive border-destructive/20",
};

/**
 * Coach-side exercise browser.
 * Lets educators discover the catalog and open the preview that mirrors the owner experience.
 * Reuses the same `exercises` table as the owner library — read-only, no editing.
 */
export default function CoachExercises() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const { data: categories } = useQuery({
    queryKey: ["coach_exercise_categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("exercise_categories")
        .select("slug, name, icon")
        .order("sort_order");
      return data || [];
    },
    staleTime: 10 * 60_000,
  });

  const { data: exercises, isLoading } = useQuery({
    queryKey: ["coach_exercises_list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("exercises")
        .select("id, slug, name, objective, level, exercise_type, cover_image, is_professional, min_tier, exercise_categories(name, icon, slug)")
        .order("sort_order");
      return data || [];
    },
    staleTime: 5 * 60_000,
  });

  const filtered = useMemo(() => {
    let list = exercises || [];
    if (selectedCategory) list = list.filter((e: any) => e.exercise_categories?.slug === selectedCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e: any) =>
          e.name.toLowerCase().includes(q) ||
          e.objective?.toLowerCase().includes(q) ||
          e.slug?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [search, selectedCategory, exercises]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <CoachLayout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="pb-4 space-y-4"
      >
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center"
            aria-label="Retour"
          >
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </motion.button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground">Catalogue exercices</h1>
            <p className="text-[11px] text-muted-foreground">
              {exercises?.length || 0} exercices · aperçu côté propriétaire
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un exercice…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className="pl-9 bg-secondary border-border"
          />
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => {
              setSelectedCategory(null);
              setVisibleCount(PAGE_SIZE);
            }}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              !selectedCategory ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            Tout
          </button>
          {(categories || []).map((cat: any) => (
            <button
              key={cat.slug}
              onClick={() => {
                setSelectedCategory(cat.slug === selectedCategory ? null : cat.slug);
                setVisibleCount(PAGE_SIZE);
              }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1 ${
                selectedCategory === cat.slug ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              <span>{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground">
          {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
          {hasMore ? ` · ${visibleCount} affichés` : ""}
        </p>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-secondary/50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((ex: any, i: number) => (
              <motion.button
                key={ex.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3), duration: 0.2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(`/coach/exercise-preview/${ex.slug}`)}
                className="relative w-full text-left glass-card rounded-xl overflow-hidden flex items-stretch gap-0"
              >
                {ex.cover_image ? (
                  <div className="w-20 h-20 shrink-0">
                    <img
                      src={ex.cover_image}
                      alt={ex.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <ExerciseCoverFallback
                    name={ex.name}
                    categoryIcon={ex.exercise_categories?.icon}
                    size="sm"
                    className="rounded-none rounded-l-xl"
                  />
                )}
                <div className="flex-1 min-w-0 p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{ex.name}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{ex.objective}</p>
                    </div>
                    <Eye className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  </div>
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {ex.level && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${levelColors[ex.level] || ""}`}>
                        {ex.level}
                      </span>
                    )}
                    {ex.min_tier && ex.min_tier !== "starter" && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                        {ex.min_tier}
                      </span>
                    )}
                    {ex.is_professional && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">PRO</span>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}

            {hasMore && (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              >
                <ChevronDown className="h-4 w-4" /> Voir plus ({filtered.length - visibleCount} restants)
              </Button>
            )}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucun exercice trouvé.</p>
          </div>
        )}
      </motion.div>
    </CoachLayout>
  );
}
