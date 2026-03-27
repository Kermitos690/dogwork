import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith("en") ? "en" : "fr";

  const toggle = () => {
    i18n.changeLanguage(current === "fr" ? "en" : "fr");
  };

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors bg-muted/50 hover:bg-muted text-foreground border border-border/40 ${className}`}
      title={current === "fr" ? "Switch to English" : "Passer en français"}
    >
      <Globe className="h-3.5 w-3.5" />
      {current === "fr" ? "EN" : "FR"}
    </button>
  );
}
