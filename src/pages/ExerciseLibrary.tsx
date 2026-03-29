import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowLeft, BookOpen, SlidersHorizontal, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { ExerciseCoverFallback } from "@/components/ExerciseCoverFallback";
import { useSubscription } from "@/hooks/useSubscription";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { PLANS } from "@/lib/plans";
import { ExerciseLockBadge } from "@/components/UpgradePrompt";

const PAGE_SIZE = 40;

const levelColors: Record<string, string> = {
  "débutant": "bg-success/15 text-success border-success/20",
  "intermédiaire": "bg-warning/15 text-warning border-warning/20",
  "avancé": "bg-destructive/15 text-destructive border-destructive/20",
};

const typeIcons: Record<string, string> = {
  fondation: "🏗️", ciblé: "🎯", bonus: "🎁", trick: "🎪",
  récupération: "🧘", mental: "🧩", relation: "💙", routine: "🔄",
};

export default function ExerciseLibrary() {
  const navigate = useNavigate();
  const { tier } = useSubscription();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Check if user has privileged access
  const privilegedGate = useFeatureGate("ai_chat"); // admin/educator bypass check

  const { data: categories } = useQuery({
    queryKey: ["exercise_categories"],
    queryFn: async () => {
      const { data } = await supabase.from("exercise_categories").select("*").order("sort_order");
      return data || [];
    },
  });

  const { data: exercises, isLoading } = useQuery({
    queryKey: ["exercises_library"],
    queryFn: async () => {
      const { data } = await supabase
        .from("exercises")
        .select("id, slug, name, objective, level, exercise_type, cover_image, is_professional, tags, sort_order, min_tier, exercise_categories(name, icon, slug)")
        .order("sort_order");
      return data || [];
    },
  });

  const allowedTiers = PLANS[tier].features.allowed_exercise_tiers;
  const isPrivileged = privilegedGate.allowed && tier === "starter"; // means admin/educator bypass

  const filtered = useMemo(() => {
    let list = exercises || [];
    if (selectedCategory) list = list.filter((e: any) => e.exercise_categories?.slug === selectedCategory);
    if (selectedLevel) list = list.filter((e: any) => e.level === selectedLevel);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e: any) =>
        e.name.toLowerCase().includes(q) ||
        e.objective?.toLowerCase().includes(q) ||
        (e.tags as string[])?.some(t => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [search, selectedCategory, selectedLevel, exercises]);

  const resetAndFilter = useCallback(() => {
    setVisibleCount(PAGE_SIZE);
  }, []);

  useMemo(() => { resetAndFilter(); }, [selectedCategory, selectedLevel, search, resetAndFilter]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const accessibleCount = exercises?.filter((e: any) => isPrivileged || allowedTiers.includes(e.min_tier)).length || 0;
  const totalCount = exercises?.length || 0;

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pb-4 space-y-4">
        <div className="flex items-center gap-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </motion.button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Bibliothèque</h1>
            <p className="text-[10px] text-muted-foreground">
              {accessibleCount}/{totalCount} exercices accessibles · {categories?.length || 0} catégories
            </p>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowFilters(!showFilters)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${showFilters ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            <SlidersHorizontal className="h-4 w-4" />
          </motion.button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary border-border" />
        </div>

        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="space-y-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Niveau</p>
            <div className="flex gap-2">
              {["débutant", "intermédiaire", "avancé"].map(l => (
                <button key={l} onClick={() => setSelectedLevel(selectedLevel === l ? null : l)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${selectedLevel === l ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                  {l}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button onClick={() => setSelectedCategory(null)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${!selectedCategory ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            Tout
          </button>
          {(categories || []).map((cat: any) => (
            <button key={cat.slug} onClick={() => setSelectedCategory(cat.slug === selectedCategory ? null : cat.slug)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1 ${selectedCategory === cat.slug ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              <span>{cat.icon}</span> {cat.name}
            </button>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground">{filtered.length} exercice(s){hasMore ? ` · ${visibleCount} affichés` : ""}</p>

        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-secondary/50 animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((exercise: any, i: number) => {
              const isLocked = !isPrivileged && !allowedTiers.includes(exercise.min_tier);

              return (
                <motion.button key={exercise.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3), duration: 0.2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    if (isLocked) {
                      navigate("/subscription");
                    } else {
                      navigate(`/exercises/${exercise.slug}`);
                    }
                  }}
                  className="relative w-full text-left glass-card rounded-xl overflow-hidden flex items-stretch gap-0">
                  {isLocked && <ExerciseLockBadge tier={exercise.min_tier} />}
                  {exercise.cover_image ? (
                    <div className="w-20 h-20 shrink-0">
                      <img src={exercise.cover_image} alt={exercise.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ) : (
                    <ExerciseCoverFallback name={exercise.name} categoryIcon={exercise.exercise_categories?.icon} size="sm" className="rounded-none rounded-l-xl" />
                  )}
                  <div className="flex-1 min-w-0 p-3">
                    <p className="text-sm font-semibold text-foreground truncate">{exercise.name}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{exercise.objective}</p>
                    <div className="flex gap-1 mt-1">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${levelColors[exercise.level] || ""}`}>{exercise.level}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">{typeIcons[exercise.exercise_type] || ""} {exercise.exercise_type}</span>
                      {exercise.is_professional && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">PRO</span>}
                    </div>
                  </div>
                </motion.button>
              );
            })}

            {hasMore && (
              <Button variant="outline" className="w-full gap-2" onClick={() => setVisibleCount(c => c + PAGE_SIZE)}>
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
    </AppLayout>
  );
}
