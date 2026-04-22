import { ZONE_CLASSES, ZONE_DOT_CLASSES, ZONE_META, type Zone } from "@/lib/zones";
import { cn } from "@/lib/utils";

interface ZoneBadgeProps {
  zone: Zone | null | undefined;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

/**
 * Visual badge representing the behavioral zone of a session/observation.
 * Renders nothing if zone is unknown (no fake fallback).
 */
export function ZoneBadge({ zone, size = "sm", showLabel = true, className }: ZoneBadgeProps) {
  if (!zone) return null;
  const meta = ZONE_META[zone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        ZONE_CLASSES[zone],
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        className,
      )}
      title={meta.description}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", ZONE_DOT_CLASSES[zone])} aria-hidden />
      {showLabel && meta.short}
    </span>
  );
}
