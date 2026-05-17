import { memo } from "react";
import { AlertTriangle, Wrench, Sparkles, PawPrint } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStatusMeta, getRiskMeta, getSpaceTypeLabel, calculateOccupancyRate } from "@/lib/shelterSpaces";
import type { ShelterSpace } from "@/types/shelterSpaces";

const STATUS_RING: Record<string, string> = {
  emerald: "ring-emerald-400/40 from-emerald-500/20 to-emerald-500/5",
  blue: "ring-blue-400/40 from-blue-500/20 to-blue-500/5",
  amber: "ring-amber-400/40 from-amber-500/20 to-amber-500/5",
  yellow: "ring-yellow-400/40 from-yellow-500/20 to-yellow-500/5",
  orange: "ring-orange-400/40 from-orange-500/20 to-orange-500/5",
  red: "ring-red-400/40 from-red-500/20 to-red-500/5",
  rose: "ring-rose-400/40 from-rose-500/20 to-rose-500/5",
  violet: "ring-violet-400/40 from-violet-500/20 to-violet-500/5",
  slate: "ring-slate-400/30 from-slate-500/20 to-slate-500/5",
};

export interface SpaceMapNodeProps {
  space: ShelterSpace & { animal_name?: string | null; current_occupancy?: number | null };
  x: number;
  y: number;
  w: number;
  h: number;
  cellSize: number;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}

function SpaceMapNodeBase({ space, x, y, w, h, cellSize, selected, onSelect, onOpen }: SpaceMapNodeProps) {
  const status = getStatusMeta(space.status);
  const risk = getRiskMeta(space.risk_level);
  const tone = STATUS_RING[status.tone] ?? STATUS_RING.slate;
  const occupancy = calculateOccupancyRate(
    space.current_occupancy ?? (space.current_animal_id ? 1 : 0),
    space.capacity
  );
  const isAlert = ["maintenance", "cleaning_required", "emergency", "quarantine", "closed"].includes(status.value);
  const isRisky = risk.value === "high" || risk.value === "critical";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onDoubleClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(); }}
      aria-label={`${space.name} — ${status.label}`}
      className={cn(
        "absolute group cursor-pointer transition-all duration-300 ease-out",
        "rounded-xl border bg-gradient-to-br backdrop-blur-sm",
        "shadow-[0_4px_12px_-2px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)]",
        "hover:shadow-[0_18px_40px_-12px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.12)]",
        "hover:-translate-y-0.5 hover:[transform:perspective(900px)_rotateX(2deg)_translateY(-2px)]",
        tone,
        "border-border/70",
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background z-20"
      )}
      style={{
        left: x * cellSize,
        top: y * cellSize,
        width: w * cellSize - 6,
        height: h * cellSize - 6,
        minWidth: 110,
        minHeight: 80,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-2 pb-1">
        <div className="min-w-0">
          <p className="text-xs font-bold text-foreground truncate leading-tight">{space.name}</p>
          <p className="text-[9px] text-muted-foreground truncate">{getSpaceTypeLabel(space.space_type)}</p>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          {isAlert && (
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)] animate-pulse" aria-hidden />
          )}
          {isRisky && <AlertTriangle className="h-3 w-3 text-orange-500" aria-label="Risque élevé" />}
        </div>
      </div>

      {/* Body */}
      <div className="px-2 space-y-1">
        {space.capacity && space.capacity > 0 && (
          <div className="flex items-center gap-1">
            <div className="flex-1 h-1 bg-background/60 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  occupancy >= 100 ? "bg-red-500" : occupancy >= 70 ? "bg-amber-500" : "bg-emerald-500"
                )}
                style={{ width: `${occupancy}%` }}
              />
            </div>
            <span className="text-[8px] text-muted-foreground tabular-nums">{occupancy}%</span>
          </div>
        )}
        {space.animal_name && (
          <div className="flex items-center gap-1 text-[10px] text-primary truncate">
            <PawPrint className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate font-medium">{space.animal_name}</span>
          </div>
        )}
      </div>

      {/* Status pill (footer) */}
      <div className="absolute bottom-1 left-1 right-1 flex items-center gap-1">
        <span
          className="h-1.5 w-1.5 rounded-full shadow-sm bg-foreground/70"
          aria-hidden
        />
        <span className="text-[8px] uppercase tracking-wide font-semibold text-foreground/70 truncate">{status.label}</span>
        {status.value === "cleaning_required" && <Sparkles className="h-2.5 w-2.5 text-yellow-500 ml-auto" />}
        {status.value === "maintenance" && <Wrench className="h-2.5 w-2.5 text-orange-500 ml-auto" />}
      </div>
    </div>
  );
}

export const SpaceMapNode = memo(SpaceMapNodeBase);
