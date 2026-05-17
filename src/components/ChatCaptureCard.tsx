import { useState } from "react";
import { motion } from "framer-motion";
import { NotebookPen, Check, X, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useChatCapture, type ChatCapture } from "@/hooks/useChatCapture";

const KIND_LABEL: Record<ChatCapture["kind"], string> = {
  behavior_log: "Observation comportement",
  health_note: "Note santé",
  dog_field_update: "Mise à jour de la fiche",
  dog_problem: "Problème signalé",
  dog_objective: "Objectif de travail",
};

const KIND_ICON: Record<ChatCapture["kind"], string> = {
  behavior_log: "🐾",
  health_note: "❤️‍🩹",
  dog_field_update: "📋",
  dog_problem: "⚠️",
  dog_objective: "🎯",
};

export function ChatCaptureCard({ capture }: { capture: ChatCapture }) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "dismissed" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { apply } = useChatCapture();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (status === "dismissed") return null;

  const handleSave = async () => {
    setStatus("saving");
    setErrorMsg(null);
    const res = await apply(capture);
    if (res.ok) {
      setStatus("saved");
      toast({
        title: "Fiche mise à jour",
        description: `${capture.dog_name} : ${capture.summary}`,
      });
      // Invalider les caches potentiellement impactés
      queryClient.invalidateQueries({ queryKey: ["dogs"] });
      queryClient.invalidateQueries({ queryKey: ["dog", capture.dog_id] });
      queryClient.invalidateQueries({ queryKey: ["behavior_logs"] });
      queryClient.invalidateQueries({ queryKey: ["dog_problems"] });
      queryClient.invalidateQueries({ queryKey: ["dog_objectives"] });
    } else {
      setStatus("error");
      setErrorMsg(res.error ?? "Échec de l'enregistrement");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mt-2 w-full max-w-[92%] rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/0 p-3 shadow-sm"
    >
      <div className="flex items-start gap-2.5">
        <div className="shrink-0 mt-0.5 h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-base">
          {KIND_ICON[capture.kind]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="h-3 w-3" />
            <span>Détecté · {KIND_LABEL[capture.kind]}</span>
          </div>
          <p className="mt-0.5 text-sm font-medium text-foreground leading-snug">
            {capture.summary}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Sera enregistré dans la fiche de <strong>{capture.dog_name}</strong>
            {capture.target_field ? ` (champ ${capture.target_field})` : ""}
          </p>

          {status === "saved" ? (
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
              <Check className="h-3.5 w-3.5" />
              Enregistré dans la fiche
            </div>
          ) : status === "error" ? (
            <div className="mt-2 space-y-1.5">
              <p className="text-[11px] text-destructive">{errorMsg}</p>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleSave}>
                  Réessayer
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setStatus("dismissed")}>
                  Ignorer
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex gap-1.5">
              <Button
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={handleSave}
                disabled={status === "saving"}
              >
                {status === "saving" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <NotebookPen className="h-3 w-3" />
                )}
                Enregistrer dans la fiche
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1"
                onClick={() => setStatus("dismissed")}
                disabled={status === "saving"}
              >
                <X className="h-3 w-3" />
                Ignorer
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
