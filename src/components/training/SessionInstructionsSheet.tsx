import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Target, Timer, Repeat, BookOpen } from "lucide-react";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";

interface SessionInstructionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseName: string;
  instructions?: string;
  repetitions?: number;
  timerSeconds?: number;
  exerciseIndex: number;
  total: number;
}

/**
 * Bottom-sheet "Consignes" affichée pendant TrainingSession.
 * Donne accès en 1 tap au détail de l'exercice + lecture vocale.
 * Aucun changement de logique métier — purement présentation.
 */
export function SessionInstructionsSheet({
  open,
  onOpenChange,
  exerciseName,
  instructions,
  repetitions,
  timerSeconds,
  exerciseIndex,
  total,
}: SessionInstructionsSheetProps) {
  const tts = useTextToSpeech();

  const handleSpeak = () => {
    const text = [exerciseName, instructions].filter(Boolean).join(". ");
    if (tts.isSpeaking) {
      tts.stop();
    } else {
      tts.speak(text);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) tts.stop(); onOpenChange(o); }}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl max-h-[85vh] p-0 border-t border-border bg-card"
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/40 text-left">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              Consignes · Exercice {exerciseIndex + 1} / {total}
            </p>
          </div>
          <SheetTitle className="text-xl font-bold leading-tight mt-1">
            {exerciseName}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Détail des consignes et caractéristiques de l'exercice en cours.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="max-h-[55vh] px-5 py-4">
          {/* Caractéristiques rapides */}
          <div className="flex flex-wrap gap-2 mb-4">
            {repetitions != null && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Repeat className="h-3.5 w-3.5" /> {repetitions} rép.
              </span>
            )}
            {timerSeconds != null && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Timer className="h-3.5 w-3.5" /> {timerSeconds}s
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <Target className="h-3.5 w-3.5" /> Mode terrain
            </span>
          </div>

          {/* Consigne détaillée */}
          {instructions ? (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                Comment faire
              </p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                {instructions}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center">
              <p className="text-xs text-muted-foreground">
                Pas de consigne détaillée pour cet exercice.
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Suivez la consigne courte affichée à l'écran.
              </p>
            </div>
          )}
        </ScrollArea>

        <div className="px-5 py-4 border-t border-border/40 bg-background/60 safe-bottom">
          <Button
            type="button"
            size="lg"
            variant={tts.isSpeaking ? "secondary" : "default"}
            className="w-full h-12 rounded-2xl"
            onClick={handleSpeak}
          >
            {tts.isSpeaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            {tts.isSpeaking ? "Arrêter la lecture" : "Lire à voix haute"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
