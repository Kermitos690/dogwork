import { SPACE_STATUSES, RISK_LEVELS } from "@/lib/shelterSpaces";
import { cn } from "@/lib/utils";

const TONE_DOT: Record<string, string> = {
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  yellow: "bg-yellow-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  rose: "bg-rose-500",
  violet: "bg-violet-500",
  slate: "bg-slate-500",
};

export function SpaceMapLegend({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("rounded-lg border border-border/60 bg-card/60 backdrop-blur-sm p-3", compact && "p-2")}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Statuts</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {SPACE_STATUSES.map((s) => (
          <div key={s.value} className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full shadow-sm", TONE_DOT[s.tone])} />
            <span className="text-[11px] text-foreground/80">{s.label}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-3 mb-2">Risque</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {RISK_LEVELS.map((r) => (
          <div key={r.value} className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-sm", TONE_DOT[r.tone])} />
            <span className="text-[11px] text-foreground/80">{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
