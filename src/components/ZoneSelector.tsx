import { motion } from "framer-motion";
import { ZONE_CLASSES, ZONE_META, type Zone } from "@/lib/zones";
import { cn } from "@/lib/utils";

interface ZoneSelectorProps {
  value: Zone | null;
  onChange: (zone: Zone | null) => void;
  suggestion?: Zone | null;
  label?: string;
  className?: string;
}

/**
 * Three-zone selector for recording the dog's behavioral state during/after a session.
 * - If `suggestion` is provided (auto-derived from tension_level), it is highlighted as a hint.
 * - Tapping the same zone again clears the manual selection (falls back to auto-derivation).
 */
export function ZoneSelector({
  value,
  onChange,
  suggestion,
  label = "Zone observée",
  className,
}: ZoneSelectorProps) {
  const zones: Zone[] = ["green", "orange", "red"];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {suggestion && !value && (
          <span className="text-[10px] text-muted-foreground">
            Suggéré : {ZONE_META[suggestion].short.toLowerCase()}
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {zones.map((z) => {
          const meta = ZONE_META[z];
          const active = value === z;
          const suggested = !active && suggestion === z;
          return (
            <motion.button
              key={z}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => onChange(active ? null : z)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 transition-all",
                active
                  ? cn(ZONE_CLASSES[z], "border-current")
                  : suggested
                    ? "border-dashed border-muted-foreground/40 bg-muted/30 text-foreground"
                    : "border-border/40 bg-card/40 text-muted-foreground",
              )}
            >
              <span className="text-base leading-none">{meta.emoji}</span>
              <span className="text-[11px] font-semibold">{meta.short}</span>
            </motion.button>
          );
        })}
      </div>
      {value && (
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {ZONE_META[value].description}
        </p>
      )}
    </div>
  );
}
