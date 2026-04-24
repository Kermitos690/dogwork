import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Play, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

interface OutlineExercise {
  id: string;
  name: string;
}

interface SessionDayOutlineSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayId: number;
  exercises: OutlineExercise[];
  currentIndex: number;
  completedIds: string[];
  onJumpTo: (index: number) => void;
}

/**
 * Bottom-sheet "Sommaire de la journée" pendant TrainingSession.
 * Permet de voir tous les exercices du jour, leur état, et de sauter
 * directement à un exercice sans perdre la progression.
 */
export function SessionDayOutlineSheet({
  open,
  onOpenChange,
  dayId,
  exercises,
  currentIndex,
  completedIds,
  onJumpTo,
}: SessionDayOutlineSheetProps) {
  const total = exercises.length;
  const doneCount = completedIds.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl max-h-[85vh] p-0 border-t border-border bg-card"
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/40 text-left">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              Sommaire · Jour {dayId}
            </p>
          </div>
          <SheetTitle className="text-lg font-bold leading-tight mt-1">
            {doneCount} / {total} exercices
          </SheetTitle>
          <SheetDescription className="sr-only">
            Liste complète des exercices de la journée avec leur état d'avancement.
          </SheetDescription>
          <div className="mt-2">
            <Progress value={pct} className="h-1.5" />
          </div>
        </SheetHeader>

        <ScrollArea className="max-h-[60vh] px-3 py-3 safe-bottom">
          <ul className="space-y-1.5">
            {exercises.map((ex, i) => {
              const isDone = completedIds.includes(ex.id);
              const isCurrent = i === currentIndex;
              return (
                <li key={ex.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onJumpTo(i);
                      onOpenChange(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors active:scale-[0.99]",
                      isCurrent
                        ? "bg-primary/10 border border-primary/30"
                        : "bg-muted/30 hover:bg-muted/60 border border-transparent",
                    )}
                  >
                    <div
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                        isDone
                          ? "bg-success/15 text-success"
                          : isCurrent
                            ? "bg-primary text-primary-foreground"
                            : "bg-card text-muted-foreground border border-border",
                      )}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : isCurrent ? (
                        <Play className="h-4 w-4 ml-0.5" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-[10px] font-semibold uppercase tracking-wider",
                        isCurrent ? "text-primary" : "text-muted-foreground",
                      )}>
                        Exercice {i + 1}
                      </p>
                      <p className="text-sm font-medium text-foreground truncate">
                        {ex.name}
                      </p>
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider shrink-0">
                        En cours
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
