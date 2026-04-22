import { motion } from "framer-motion";
import { Activity, TrendingUp } from "lucide-react";
import { ZoneBadge } from "@/components/ZoneBadge";
import { ZONE_META, type Zone } from "@/lib/zones";
import type { ZoneDistribution, ZoneTrendPoint } from "@/hooks/useStats";

interface ZoneInsightCardProps {
  distribution: ZoneDistribution;
  trend: ZoneTrendPoint[];
  recentDominant: Zone | null;
  dataQuality: { explicit: number; derived: number; total: number; explicitPct: number };
  delay?: number;
}

/**
 * Premium zone-insight block for the Stats screen.
 * Uses real persisted zone_state (with derived fallback) already aggregated by useStats.
 * Mobile-first, premium-sober, semantic tokens only.
 */
export function ZoneInsightCard({
  distribution,
  trend,
  recentDominant,
  dataQuality,
  delay = 0,
}: ZoneInsightCardProps) {
  const empty = distribution.total === 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="space-y-3"
      aria-label="Zones comportementales"
    >
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">Zones comportementales</h2>
        {recentDominant && (
          <span className="ml-auto flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <TrendingUp className="h-3 w-3" /> 7 j ·
            <ZoneBadge zone={recentDominant} size="sm" />
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm p-4 space-y-3">
        {empty ? (
          <div className="flex items-center gap-2 py-2">
            <Activity className="h-4 w-4 text-muted-foreground/60" />
            <p className="text-xs text-muted-foreground">
              Aucune zone enregistrée. Validez une séance ou un bilan pour voir la répartition.
            </p>
          </div>
        ) : (
          <>
            {/* Distribution bar */}
            <div className="space-y-2">
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/30">
                {distribution.greenPct > 0 && (
                  <div
                    className="h-full bg-success transition-all"
                    style={{ width: `${distribution.greenPct}%` }}
                    title={`Vert : ${distribution.green}`}
                  />
                )}
                {distribution.orangePct > 0 && (
                  <div
                    className="h-full bg-warning transition-all"
                    style={{ width: `${distribution.orangePct}%` }}
                    title={`Orange : ${distribution.orange}`}
                  />
                )}
                {distribution.redPct > 0 && (
                  <div
                    className="h-full bg-destructive transition-all"
                    style={{ width: `${distribution.redPct}%` }}
                    title={`Rouge : ${distribution.red}`}
                  />
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {(["green", "orange", "red"] as const).map((z) => {
                  const pct = distribution[`${z}Pct` as const];
                  const count = distribution[z];
                  return (
                    <div key={z}>
                      <p
                        className={`text-base font-bold ${
                          z === "green" ? "text-success" : z === "orange" ? "text-warning" : "text-destructive"
                        }`}
                      >
                        {count}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {ZONE_META[z].short} · {pct}%
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mini trend (last buckets, sparkline-style stacked bars) */}
            {trend.length > 0 && (
              <div className="pt-2 border-t border-border/30">
                <p className="text-[10px] text-muted-foreground mb-1.5">Tendance récente</p>
                <div className="flex items-end gap-0.5 h-10">
                  {trend.slice(-14).map((p) => {
                    const tot = p.green + p.orange + p.red || 1;
                    return (
                      <div
                        key={p.date}
                        className="flex-1 flex flex-col-reverse rounded-sm overflow-hidden bg-muted/20 min-w-[3px]"
                        title={`${p.date} · 🟢${p.green} 🟠${p.orange} 🔴${p.red}`}
                      >
                        {p.green > 0 && <div className="bg-success" style={{ height: `${(p.green / tot) * 100}%` }} />}
                        {p.orange > 0 && <div className="bg-warning" style={{ height: `${(p.orange / tot) * 100}%` }} />}
                        {p.red > 0 && <div className="bg-destructive" style={{ height: `${(p.red / tot) * 100}%` }} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Data quality footer */}
            {dataQuality.total > 0 && dataQuality.explicitPct < 100 && (
              <p className="text-[10px] text-muted-foreground pt-1">
                {dataQuality.explicit} observation{dataQuality.explicit > 1 ? "s" : ""} explicite
                {dataQuality.explicit > 1 ? "s" : ""} · {dataQuality.derived} déduite
                {dataQuality.derived > 1 ? "s" : ""} de la tension
              </p>
            )}
          </>
        )}
      </div>
    </motion.section>
  );
}
