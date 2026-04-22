import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Copy, Printer, BookMarked, Check, ExternalLink, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface ExtraAction {
  label: string;
  icon?: React.ElementType;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "secondary" | "outline" | "ghost";
}

interface AIPostGenerationActionsProps {
  /** Plain-text representation used by Copy + Print fallback. */
  text: string;
  /** Title used in the printable header. */
  title?: string;
  /** Optional summary for the print header. */
  summary?: string | null;
  /** When provided, shows an "Open in Library" link to /documents. */
  showOpenLibrary?: boolean;
  /** Contextual integration actions (Use as plan, Save to journal, etc.). */
  extraActions?: ExtraAction[];
  className?: string;
  /** When provided, the print view will render this HTML instead of plain text. */
  printableHtml?: string;
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
  showOpenLibrary = true,
  extraActions = [],
  className,
  printableHtml,
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
    const win = window.open("", "_blank", "width=900,height=1200");
    if (!win) {
      toast.error("Activez les pop-ups pour exporter en PDF");
      return;
    }
    const safeTitle = (title ?? "Document IA").replace(/</g, "&lt;");
    const safeSummary = summary ? summary.replace(/</g, "&lt;") : "";
    const body =
      printableHtml ??
      `<pre style="white-space:pre-wrap;font-family:inherit;font-size:14px;line-height:1.6">${text.replace(/</g, "&lt;")}</pre>`;
    win.document.write(`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${safeTitle}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif;color:#1a1a2e;max-width:720px;margin:32px auto;padding:0 24px;line-height:1.6}
  h1{font-size:24px;margin:0 0 8px;font-weight:700}
  h2{font-size:18px;margin:24px 0 8px;font-weight:600}
  h3{font-size:15px;margin:16px 0 6px;font-weight:600}
  p{margin:0 0 12px;font-size:14px}
  ul,ol{padding-left:20px;margin:0 0 12px}
  li{margin:4px 0;font-size:14px}
  .summary{font-style:italic;color:#666;border-left:3px solid #f97316;padding-left:12px;margin:0 0 24px}
  .meta{color:#999;font-size:11px;margin-top:32px;border-top:1px solid #eee;padding-top:12px;text-align:center}
  @media print{body{margin:0;padding:16mm}}
</style>
</head>
<body>
  <h1>${safeTitle}</h1>
  ${safeSummary ? `<p class="summary">${safeSummary}</p>` : ""}
  ${body}
  <p class="meta">DogWork — Document IA · ${new Date().toLocaleDateString("fr-CH", { day: "numeric", month: "long", year: "numeric" })}</p>
</body>
</html>`);
    win.document.close();
    // Allow the new window to render before triggering print
    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch {
        /* noop */
      }
    }, 250);
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      {/* Universal actions */}
      <Button size="sm" variant="outline" onClick={handleCopy}>
        {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
        {copied ? "Copié" : "Copier"}
      </Button>
      <Button size="sm" variant="outline" onClick={handlePrint}>
        <Printer className="h-3.5 w-3.5 mr-1.5" />
        Exporter PDF
      </Button>

      {/* Contextual integration actions */}
      {extraActions.map((a, i) => {
        const Icon = a.icon ?? Sparkles;
        return (
          <Button
            key={i}
            size="sm"
            variant={a.variant ?? "default"}
            onClick={a.onClick}
            disabled={a.disabled}
          >
            <Icon className="h-3.5 w-3.5 mr-1.5" />
            {a.label}
          </Button>
        );
      })}

      {showOpenLibrary && (
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
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
