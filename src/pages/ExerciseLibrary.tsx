import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ArrowLeft, BookOpen, SlidersHorizontal } from "lucide-react";
import { EXERCISE_LIBRARY, EXERCISE_CATEGORIES, type LibraryExercise } from "@/data/exerciseLibrary";
import { motion } from "framer-motion";

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
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let list = EXERCISE_LIBRARY;
    if (selectedCategory) list = list.filter(e => e.category === selectedCategory);
    if (selectedLevel) list = list.filter(e => e.level === selectedLevel);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.objective.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [search, selectedCategory, selectedLevel]);

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pt-6 pb-4 space-y-4">
        <div className="flex items-center gap-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </motion.button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Bibliothèque</h1>
            <p className="text-[10px] text-muted-foreground">{EXERCISE_LIBRARY.length} exercices · {EXERCISE_CATEGORIES.length} catégories</p>
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
          {EXERCISE_CATEGORIES.map((cat) => (
            <button key={cat.key} onClick={() => setSelectedCategory(cat.key === selectedCategory ? null : cat.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1 ${selectedCategory === cat.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              <span>{cat.icon}</span> {cat.label}
            </button>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground">{filtered.length} exercice(s)</p>

        <div className="space-y-2">
          {filtered.map((exercise, i) => (
            <motion.button key={exercise.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.3), duration: 0.2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(`/exercises/${exercise.slug}`)}
              className="w-full text-left glass-card rounded-xl p-3 flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0 text-lg">
                {exercise.categoryIcon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{exercise.name}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-1">{exercise.objective}</p>
                <div className="flex gap-1 mt-1">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${levelColors[exercise.level]}`}>{exercise.level}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">{typeIcons[exercise.exerciseType] || ""} {exercise.exerciseType}</span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucun exercice trouvé.</p>
          </div>
        )}
      </motion.div>
    </AppLayout>
  );
}
