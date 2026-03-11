import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getAllDays } from "@/data/program";
import { useState, useMemo } from "react";

export default function ExerciseLibrary() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const days = getAllDays();

  const allExercises = useMemo(() => {
    const exercises: { exercise: any; day: any }[] = [];
    days.forEach((day) => {
      day.exercises.forEach((ex) => {
        exercises.push({ exercise: ex, day });
      });
    });
    return exercises;
  }, [days]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allExercises;
    const q = search.toLowerCase();
    return allExercises.filter(
      (e) =>
        e.exercise.name.toLowerCase().includes(q) ||
        e.exercise.instructions.toLowerCase().includes(q) ||
        e.day.functions.some((f: string) => f.toLowerCase().includes(q))
    );
  }, [allExercises, search]);

  // Get unique functions
  const allFunctions = useMemo(() => {
    const set = new Set<string>();
    days.forEach((d) => d.functions.forEach((f) => set.add(f)));
    return Array.from(set).sort();
  }, [days]);

  return (
    <AppLayout>
      <div className="pt-6 pb-4 space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Bibliothèque d'exercices</h1>
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

        <p className="text-xs text-muted-foreground">{filtered.length} exercice(s) trouvé(s)</p>

        <div className="space-y-2">
          {filtered.map(({ exercise, day }, i) => (
            <Card key={exercise.id} className="stagger-item" style={{ animationDelay: `${i * 30}ms` }}>
              <CardContent className="p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{exercise.name}</p>
                  <span className="text-xs text-muted-foreground">Jour {day.id}</span>
                </div>
                <p className="text-xs text-muted-foreground">{exercise.instructions}</p>
                <div className="flex gap-1 flex-wrap mt-1">
                  <Badge variant="secondary" className="text-xs">{exercise.repetitionsTarget} rép.</Badge>
                  {exercise.timerSuggested && (
                    <Badge variant="secondary" className="text-xs">{exercise.timerSuggested}s</Badge>
                  )}
                  {day.functions.map((f: string) => (
                    <Badge key={f} variant="outline" className="text-xs">{f}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
