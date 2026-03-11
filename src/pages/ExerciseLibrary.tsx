import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, ChevronUp, ArrowLeft, BookOpen, AlertTriangle } from "lucide-react";
import { EXERCISE_LIBRARY, EXERCISE_CATEGORIES, type LibraryExercise } from "@/data/exerciseLibrary";

const levelColors: Record<string, string> = {
  "débutant": "bg-success/10 text-success border-success/20",
  "intermédiaire": "bg-warning/10 text-warning border-warning/20",
  "avancé": "bg-destructive/10 text-destructive border-destructive/20",
};

function ExerciseCard({ exercise }: { exercise: LibraryExercise }) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <button onClick={() => setOpen(!open)} className="w-full p-4 text-left">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{exercise.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{exercise.objective}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className={`text-xs ${levelColors[exercise.level]}`}>
                {exercise.level}
              </Badge>
              {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap mt-2">
            <span className="text-xs text-muted-foreground">⏱ {exercise.duration}</span>
            <span className="text-xs text-muted-foreground">• {exercise.repetitions}</span>
          </div>
        </button>

        {open && (
          <div className="border-t border-border p-4 space-y-4 animate-fade-in">
            {exercise.material.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Matériel</p>
                <div className="flex flex-wrap gap-1">
                  {exercise.material.map((m, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{m}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Étapes</p>
              <ol className="space-y-1.5">
                {exercise.steps.map((step, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                    <span className="text-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {exercise.mistakes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-destructive uppercase tracking-wide mb-1">❌ Erreurs à éviter</p>
                <ul className="space-y-1">
                  {exercise.mistakes.map((m, i) => (
                    <li key={i} className="text-sm text-muted-foreground">• {m}</li>
                  ))}
                </ul>
              </div>
            )}

            {exercise.precautions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-warning uppercase tracking-wide mb-1">⚠️ Précautions</p>
                <ul className="space-y-1">
                  {exercise.precautions.map((p, i) => (
                    <li key={i} className="text-sm text-muted-foreground">• {p}</li>
                  ))}
                </ul>
              </div>
            )}

            {exercise.contraindications.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-destructive uppercase tracking-wide mb-1">🚫 Contre-indications</p>
                <ul className="space-y-1">
                  {exercise.contraindications.map((c, i) => (
                    <li key={i} className="text-sm text-muted-foreground">• {c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
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
        e.steps.some(s => s.toLowerCase().includes(q))
      );
    }
    return list;
  }, [search, selectedCategory]);

  return (
    <AppLayout>
      <div className="pt-6 pb-4 space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Bibliothèque d'exercices</h1>
            <p className="text-xs text-muted-foreground">{EXERCISE_LIBRARY.length} exercices disponibles</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un exercice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              !selectedCategory ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            Tout
          </button>
          {EXERCISE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                selectedCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">{filtered.length} exercice(s)</p>

        <div className="space-y-3">
          {filtered.map((exercise) => (
            <ExerciseCard key={exercise.id} exercise={exercise} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-8">
            <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucun exercice trouvé.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
