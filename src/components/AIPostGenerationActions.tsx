import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Copy, FileDown, BookMarked, Check, ExternalLink, Sparkles, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { downloadDocx } from "@/lib/docxRenderer";

interface ExtraAction {
  label: string;
  icon?: React.ElementType;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "default" | "secondary" | "outline" | "ghost";
}

interface AIPostGenerationActionsProps {
  /** Plain-text representation used by Copy. */
  text: string;
  /** Title used in the printable header. */
  title?: string;
  /** Optional summary for the print header. */
  summary?: string | null;
  /** Optional structured content used by the printable PDF renderer (preferred). */
  content?: unknown;
  /** Optional context label rendered as a brand pill (role, dog name, etc.). */
  contextLabel?: string;
  /** When provided, shows an "Open in Library" link to /documents. */
  showOpenLibrary?: boolean;
  /** Contextual integration actions (Use as plan, Save to journal, etc.). */
  extraActions?: ExtraAction[];
  className?: string;
}

/**
 * Universal post-generation action bar. Offers the contextual outcomes every
 * AI output should support: copy, print/PDF (browser-native), library access,
 * and any caller-defined integration actions (apply, save to journal, etc.).
 */
export function AIPostGenerationActions({
  text,
  title,
  summary,
  content,
  contextLabel,
  showOpenLibrary = true,
  extraActions = [],
  className,
}: AIPostGenerationActionsProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copié dans le presse-papier");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const handlePrint = () => {
    const ok = printDocument({
      title: title ?? "Document DogWork",
      summary,
      // Prefer structured content (rich rendering, emojis, sections);
      // fall back to the plain text payload.
      content: content ?? text,
      contextLabel,
    });
    if (!ok) toast.error("Activez les pop-ups pour exporter en PDF");
  };

  return (
    <div className={`flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 ${className ?? ""}`}>
      {/* Contextual integration actions — primary, full-width on mobile */}
      {extraActions.map((a, i) => {
        const Icon = a.icon ?? Sparkles;
        const isLoading = !!a.loading;
        return (
          <Button
            key={i}
            size="sm"
            variant={a.variant ?? "default"}
            onClick={a.onClick}
            disabled={a.disabled || isLoading}
            className="w-full sm:w-auto justify-center"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Icon className="h-3.5 w-3.5 mr-1.5" />
            )}
            {a.label}
          </Button>
        );
      })}

      {/* Universal actions — secondary, side-by-side on mobile */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Button size="sm" variant="outline" onClick={handleCopy} className="flex-1 sm:flex-none justify-center">
          {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
          {copied ? "Copié" : "Copier"}
        </Button>
        <Button size="sm" variant="outline" onClick={handlePrint} className="flex-1 sm:flex-none justify-center">
          <Printer className="h-3.5 w-3.5 mr-1.5" />
          PDF
        </Button>
      </div>

      {showOpenLibrary && (
        <Button
          size="sm"
          variant="ghost"
          className="w-full sm:w-auto sm:ml-auto justify-center text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/documents")}
        >
          <BookMarked className="h-3.5 w-3.5 mr-1.5" />
          Bibliothèque
          <ExternalLink className="h-3 w-3 ml-1 opacity-60" />
        </Button>
      )}
    </div>
  );
}
