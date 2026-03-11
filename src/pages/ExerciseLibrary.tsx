import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, ChevronUp, ArrowLeft, BookOpen, Camera } from "lucide-react";
import { EXERCISE_LIBRARY, EXERCISE_CATEGORIES, type LibraryExercise } from "@/data/exerciseLibrary";
import { motion, AnimatePresence } from "framer-motion";

const levelColors: Record<string, string> = {
  "débutant": "bg-success/15 text-success border-success/20",
  "intermédiaire": "bg-warning/15 text-warning border-warning/20",
  "avancé": "bg-destructive/15 text-destructive border-destructive/20",
};

function ExerciseCard({ exercise }: { exercise: LibraryExercise }) {
  const [open, setOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  return (
    <Card className="overflow-hidden neon-border">
      <CardContent className="p-0">
        <button onClick={() => setOpen(!open)} className="w-full p-4 text-left card-press">
          {/* Cover image placeholder */}
          <div className="w-full h-32 rounded-xl bg-secondary/50 mb-3 flex items-center justify-center overflow-hidden relative">
            {exercise.coverImage ? (
              <img src={exercise.coverImage} alt={exercise.name} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                <Camera className="h-6 w-6" />
                <span className="text-[10px]">Photo tuto</span>
              </div>
            )}
            <div className="absolute top-2 left-2">
              <span className="text-lg">{exercise.categoryIcon}</span>
            </div>
            <div className="absolute top-2 right-2">
              <Badge variant="outline" className={`text-[10px] ${levelColors[exercise.level]}`}>
                {exercise.level}
              </Badge>
            </div>
          </div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">{exercise.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{exercise.objective}</p>
            </div>
            {open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
          </div>
          <div className="flex gap-1.5 flex-wrap mt-2">
            <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-secondary">⏱ {exercise.duration}</span>
            <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-secondary">{exercise.repetitions}</span>
            {exercise.tags.slice(0, 2).map((t, i) => (
              <span key={i} className="text-[10px] text-primary px-2 py-0.5 rounded-full bg-primary/10">#{t}</span>
            ))}
          </div>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="border-t border-border p-4 space-y-4">
                {/* Dedication */}
                <p className="text-xs text-primary/80 italic">"{exercise.dedication}"</p>

                {/* Tutorial steps carousel */}
                {exercise.tutorialSteps.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Tutoriel étape par étape</p>
                    <div className="space-y-2">
                      {exercise.tutorialSteps.map((ts, i) => (
                        <motion.button
                          key={i}
                          onClick={() => setActiveStep(i)}
                          className={`w-full text-left rounded-xl p-3 transition-all ${activeStep === i ? "bg-primary/10 neon-border" : "bg-secondary/30"}`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Step image placeholder */}
                            <div className="w-14 h-14 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0">
                              {ts.imageUrl ? (
                                <img src={ts.imageUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                              ) : (
                                <span className="text-lg font-bold text-muted-foreground">{i + 1}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-foreground">{ts.title}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{ts.description}</p>
                              {ts.tip && activeStep === i && (
                                <p className="text-[10px] text-primary mt-1">💡 {ts.tip}</p>
                              )}
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {exercise.material.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Matériel</p>
                    <div className="flex flex-wrap gap-1">
                      {exercise.material.map((m, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">{m}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {exercise.mistakes.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-destructive uppercase tracking-widest mb-1">❌ Erreurs à éviter</p>
                    <ul className="space-y-0.5">
                      {exercise.mistakes.map((m, i) => (
                        <li key={i} className="text-xs text-muted-foreground">• {m}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {exercise.precautions.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-warning uppercase tracking-widest mb-1">⚠️ Précautions</p>
                    <ul className="space-y-0.5">
                      {exercise.precautions.map((p, i) => (
                        <li key={i} className="text-xs text-muted-foreground">• {p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {exercise.profileAdaptation && (
                  <p className="text-[10px] text-accent italic">🔄 {exercise.profileAdaptation}</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

export default function ExerciseLibrary() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = EXERCISE_LIBRARY;
    if (selectedCategory) {
      list = list.filter(e => e.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.objective.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q)) ||
        e.steps.some(s => s.toLowerCase().includes(q))
      );
    }
    return list;
  }, [search, selectedCategory]);

  return (
    <AppLayout>
      <div className="pt-6 pb-4 space-y-4">
        <div className="flex items-center gap-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
            <ArrowLeft className="h-4.5 w-4.5 text-foreground" />
          </motion.button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Bibliothèque</h1>
            <p className="text-[10px] text-muted-foreground">{EXERCISE_LIBRARY.length} exercices • {EXERCISE_CATEGORIES.length} catégories</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un exercice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              !selectedCategory ? "gradient-neon-strong text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            Tout
          </button>
          {EXERCISE_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key === selectedCategory ? null : cat.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1 ${
                selectedCategory === cat.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              <span>{cat.icon}</span> {cat.label}
            </button>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground">{filtered.length} exercice(s)</p>

        <div className="space-y-3">
          {filtered.map((exercise, i) => (
            <motion.div
              key={exercise.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.25 }}
            >
              <ExerciseCard exercise={exercise} />
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucun exercice trouvé.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
