import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  variant?: "card" | "inline" | "dashed";
  className?: string;
  children?: ReactNode;
}

/**
 * Empty state friendly DogWork — utilisé dans dashboards, listes, sections.
 * Garantit un message clair, humain, jamais brut "No data".
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  variant = "card",
  className,
  children,
}: EmptyStateProps) {
  const inner = (
    <div className="flex flex-col items-center text-center gap-3 py-6 px-4">
      {Icon && (
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Icon className="h-6 w-6 text-primary/70" />
        </div>
      )}
      <div className="space-y-1 max-w-[320px]">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      {(actionLabel || secondaryLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {actionLabel && onAction && (
            <Button size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryLabel && onSecondary && (
            <Button size="sm" variant="ghost" onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          )}
        </div>
      )}
      {children}
    </div>
  );

  if (variant === "inline") {
    return <div className={cn("w-full", className)}>{inner}</div>;
  }

  if (variant === "dashed") {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed border-border bg-card/40",
          className,
        )}
      >
        {inner}
      </div>
    );
  }

  return (
    <Card className={cn("bg-card/60 border-border/60", className)}>
      <CardContent className="p-0">{inner}</CardContent>
    </Card>
  );
}
