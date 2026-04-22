import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AIDocumentViewer } from "./AIDocumentViewer";
import { AIPostGenerationActions } from "./AIPostGenerationActions";
import { Sparkles, Coins } from "lucide-react";

interface AIResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  summary?: string | null;
  /** Raw text or structured object — passed straight to AIDocumentViewer. */
  content: unknown;
  creditsSpent?: number;
  /** Contextual integration actions, e.g. "Use as active plan". */
  extraActions?: React.ComponentProps<typeof AIPostGenerationActions>["extraActions"];
}

/**
 * Standard post-generation surface shown immediately after any AI run.
 * Combines the structured viewer + the universal action bar so the user
 * never lands on a raw chat-style answer with no follow-up.
 */
export function AIResultDialog({
  open,
  onOpenChange,
  title,
  summary,
  content,
  creditsSpent,
  extraActions,
}: AIResultDialogProps) {
  // Flatten content to plain text for Copy + print fallback.
  const plainText = toPlainText(content);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] sm:max-h-[88vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 pt-5 pb-3 border-b border-border space-y-1.5">
          <div className="flex items-start gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base sm:text-lg leading-tight break-words text-left">{title}</DialogTitle>
              {creditsSpent != null && creditsSpent > 0 && (
                <Badge variant="secondary" className="mt-1.5 gap-1 text-[10px]">
                  <Coins className="h-3 w-3" />
                  {creditsSpent} crédit{creditsSpent > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </div>
          <DialogDescription className="text-xs text-left">
            Aperçu du résultat. Vous pouvez le copier, l'exporter ou le retrouver dans votre bibliothèque.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
          <AIDocumentViewer content={content} summary={summary} printable />
        </div>

        <div className="border-t border-border px-4 sm:px-6 py-3 bg-muted/20">
          <AIPostGenerationActions
            title={title}
            summary={summary}
            text={plainText}
            extraActions={extraActions}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function toPlainText(content: unknown): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (typeof content !== "object") return String(content);
  const obj = content as Record<string, unknown>;
  if (typeof obj.text === "string") return obj.text;
  // Best-effort flatten
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return "";
  }
}
