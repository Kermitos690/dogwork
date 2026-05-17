import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Maximize2, Minimize2, LayoutGrid, Box, Activity, ShieldAlert, ExternalLink, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSpaceTypeLabel, calculateOccupancyRate } from "@/lib/shelterSpaces";
import { SpaceMapFilters, DEFAULT_FILTERS, type SpaceFiltersState } from "./SpaceMapFilters";
import { SpaceMapLegend } from "./SpaceMapLegend";
import { SpaceVisualMap } from "./SpaceVisualMap";
import { SpaceMapSidePanel } from "./SpaceMapSidePanel";
import { SpaceStatusBadge, SpaceRiskBadge } from "./SpaceBadges";
import type { ShelterSpace } from "@/types/shelterSpaces";

type Mode = "plan" | "cards" | "occupation" | "risks";

type EnrichedSpace = ShelterSpace & { animal_name?: string | null; current_occupancy?: number | null };

interface Props {
  onCreate?: () => void;
}

export function SpaceVisualCommandCenter({ onCreate }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("plan");
  const [filters, setFilters] = useState<SpaceFiltersState>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: spaces = [], isLoading } = useQuery({
    queryKey: ["shelter-spaces-cockpit", user?.id],
    queryFn: async () => {
      // Try enriched grid view first for animal_name etc.
      const { data: grid } = await supabase.from("v_shelter_spaces_grid" as any).select("*");
      if (grid && Array.isArray(grid) && grid.length > 0) return grid as any[];
      const { data } = await supabase
        .from("shelter_spaces" as any)
        .select("*")
        .eq("shelter_user_id", user!.id)
        .order("name");
      return (data as any[]) ?? [];
    },
    enabled: !!user,
  });

  const buildings = useMemo(() => {
    const set = new Set<string>();
    (spaces as EnrichedSpace[]).forEach((s) => { if (s.building) set.add(s.building); });
    return Array.from(set).sort();
  }, [spaces]);

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return (spaces as EnrichedSpace[]).filter((s) => {
      if (q && !`${s.name} ${s.zone_label ?? ""} ${s.building ?? ""}`.toLowerCase().includes(q)) return false;
      if (filters.type !== "all" && s.space_type !== filters.type) return false;
      if (filters.status !== "all" && (s.status ?? "available") !== filters.status) return false;
      if (filters.risk !== "all" && (s.risk_level ?? "low") !== filters.risk) return false;
      if (filters.io !== "all" && (s.indoor_outdoor ?? "indoor") !== filters.io) return false;
      if (filters.building !== "all" && s.building !== filters.building) return false;
      if (filters.onlyAvailable && (s.status ?? "available") !== "available") return false;
      if (filters.onlyMaintenance && (s.status ?? "") !== "maintenance") return false;
      if (filters.onlyCleaning && (s.status ?? "") !== "cleaning_required") return false;
      if (filters.onlyRisky && !["high", "critical"].includes(s.risk_level ?? "low")) return false;
      return true;
    });
  }, [spaces, filters]);

  const selectedSpace = useMemo(
    () => filtered.find((s) => s.id === selectedId) ?? (spaces as EnrichedSpace[]).find((s) => s.id === selectedId) ?? null,
    [filtered, spaces, selectedId]
  );

  // Quick stats from filtered
  const stats = useMemo(() => {
    const total = filtered.length;
    const by = (pred: (s: EnrichedSpace) => boolean) => filtered.filter(pred).length;
    const capTotal = filtered.reduce((sum, s) => sum + (s.capacity ?? 0), 0);
    const occ = filtered.reduce((sum, s) => sum + (s.current_occupancy ?? (s.current_animal_id ? 1 : 0)), 0);
    return {
      total,
      available: by((s) => (s.status ?? "available") === "available"),
      occupied: by((s) => ["occupied", "full"].includes(s.status ?? "")),
      maintenance: by((s) => s.status === "maintenance"),
      cleaning: by((s) => s.status === "cleaning_required"),
      closed: by((s) => s.status === "closed"),
      risky: by((s) => ["high", "critical"].includes(s.risk_level ?? "low")),
      capTotal,
      occ,
    };
  }, [filtered]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setSheetOpen(true);
  };

  // Apply mode-specific transforms (sorting / emphasis filtering)
  const display = useMemo(() => {
    const arr = [...filtered];
    if (mode === "occupation") {
      arr.sort((a, b) => {
        const ra = calculateOccupancyRate(a.current_occupancy ?? (a.current_animal_id ? 1 : 0), a.capacity);
        const rb = calculateOccupancyRate(b.current_occupancy ?? (b.current_animal_id ? 1 : 0), b.capacity);
        return rb - ra;
      });
    } else if (mode === "risks") {
      const order = { critical: 0, high: 1, medium: 2, low: 3 } as Record<string, number>;
      arr.sort((a, b) => (order[a.risk_level ?? "low"] ?? 9) - (order[b.risk_level ?? "low"] ?? 9));
    }
    return arr;
  }, [filtered, mode]);

  const wrapperClass = cn(
    "space-y-3",
    fullscreen && "fixed inset-0 z-50 bg-background p-4 overflow-auto"
  );

  return (
    <div className={wrapperClass}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-foreground">Plan du refuge</h2>
          <span className="text-xs text-muted-foreground">{stats.total} espace{stats.total > 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <ModeButton active={mode === "plan"} onClick={() => setMode("plan")} icon={<Box className="h-3.5 w-3.5" />}>Plan</ModeButton>
          <ModeButton active={mode === "cards"} onClick={() => setMode("cards")} icon={<LayoutGrid className="h-3.5 w-3.5" />}>Cartes</ModeButton>
          <ModeButton active={mode === "occupation"} onClick={() => setMode("occupation")} icon={<Activity className="h-3.5 w-3.5" />}>Occupation</ModeButton>
          <ModeButton active={mode === "risks"} onClick={() => setMode("risks")} icon={<ShieldAlert className="h-3.5 w-3.5" />}>Risques</ModeButton>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setFullscreen((f) => !f)}>
            {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{fullscreen ? "Quitter" : "Plein écran"}</span>
          </Button>
          {onCreate && (
            <Button size="sm" className="h-8 gap-1.5" onClick={onCreate}>
              <Plus className="h-3.5 w-3.5" /> Créer
            </Button>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        <StatTile label="Disponibles" value={stats.available} tone="emerald" />
        <StatTile label="Occupés" value={stats.occupied} tone="blue" />
        <StatTile label="Maintenance" value={stats.maintenance} tone="orange" />
        <StatTile label="Nettoyage" value={stats.cleaning} tone="yellow" />
        <StatTile label="Risques" value={stats.risky} tone="red" />
        <StatTile label="Capacité" value={`${stats.occ}/${stats.capTotal || "—"}`} tone="violet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_320px] gap-3">
        {/* Left: filters + legend */}
        <div className="space-y-3">
          <SpaceMapFilters value={filters} onChange={setFilters} buildings={buildings} />
          <div className="hidden lg:block"><SpaceMapLegend /></div>
        </div>

        {/* Center: map / cards */}
        <div className="min-w-0">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-10 text-sm">Chargement du plan…</div>
          ) : display.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Aucun espace ne correspond aux filtres.</CardContent></Card>
          ) : mode === "plan" ? (
            <SpaceVisualMap
              spaces={display}
              selectedId={selectedId}
              onSelect={handleSelect}
              onOpen={(id) => { /* navigation handled by Link in side panel; opening here too via dblclick on node */ window.location.assign(`/shelter/spaces/${id}`); }}
            />
          ) : (
            <SpaceCardsGrid spaces={display} mode={mode} selectedId={selectedId} onSelect={handleSelect} />
          )}
        </div>

        {/* Right: side panel (desktop) */}
        <div className="hidden lg:block">
          {selectedSpace ? (
            <SpaceMapSidePanel space={selectedSpace} open={true} onClose={() => setSelectedId(null)} />
          ) : (
            <Card className="h-full"><CardContent className="p-6 text-xs text-muted-foreground text-center">Sélectionnez un espace pour afficher ses détails.</CardContent></Card>
          )}
        </div>
      </div>

      {/* Mobile sheet */}
      <div className="lg:hidden">
        <SpaceMapSidePanel space={selectedSpace} open={sheetOpen && !!selectedSpace} onClose={() => { setSheetOpen(false); setSelectedId(null); }} />
      </div>
    </div>
  );
}

function ModeButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-8 px-2.5 inline-flex items-center gap-1.5 text-xs font-medium rounded-md border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "bg-card text-muted-foreground border-border hover:text-foreground"
      )}
    >
      {icon}<span className="hidden sm:inline">{children}</span>
    </button>
  );
}

const TONE_TILE: Record<string, string> = {
  emerald: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
  blue: "from-blue-500/15 to-blue-500/5 border-blue-500/30 text-blue-700 dark:text-blue-400",
  orange: "from-orange-500/15 to-orange-500/5 border-orange-500/30 text-orange-700 dark:text-orange-400",
  yellow: "from-yellow-500/15 to-yellow-500/5 border-yellow-500/30 text-yellow-700 dark:text-yellow-400",
  red: "from-red-500/15 to-red-500/5 border-red-500/30 text-red-700 dark:text-red-400",
  violet: "from-violet-500/15 to-violet-500/5 border-violet-500/30 text-violet-700 dark:text-violet-400",
};

function StatTile({ label, value, tone }: { label: string; value: number | string; tone: keyof typeof TONE_TILE }) {
  return (
    <div className={cn("rounded-lg border bg-gradient-to-br p-2.5 backdrop-blur-sm", TONE_TILE[tone])}>
      <p className="text-lg font-bold tabular-nums leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-wide opacity-80 mt-1">{label}</p>
    </div>
  );
}

function SpaceCardsGrid({
  spaces, mode, selectedId, onSelect,
}: {
  spaces: EnrichedSpace[];
  mode: Mode;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {spaces.map((s) => {
        const occ = calculateOccupancyRate(s.current_occupancy ?? (s.current_animal_id ? 1 : 0), s.capacity);
        const isSel = s.id === selectedId;
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={cn(
              "text-left rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-3 transition-all",
              "hover:-translate-y-0.5 hover:shadow-lg",
              isSel && "ring-2 ring-primary"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{s.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{getSpaceTypeLabel(s.space_type)}</p>
              </div>
              <div className="flex flex-col gap-1 items-end">
                <SpaceStatusBadge value={s.status} />
                <SpaceRiskBadge value={s.risk_level} />
              </div>
            </div>
            {(mode === "occupation" || (s.capacity ?? 0) > 0) && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Occupation</span><span className="tabular-nums">{occ}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={cn(
                    "h-full rounded-full transition-all",
                    occ >= 100 ? "bg-red-500" : occ >= 70 ? "bg-amber-500" : "bg-emerald-500"
                  )} style={{ width: `${occ}%` }} />
                </div>
              </div>
            )}
            <div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground">
              <span className="truncate">{[s.building, s.floor, s.zone_label].filter(Boolean).join(" · ") || "—"}</span>
              <Link to={`/shelter/spaces/${s.id}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-primary hover:underline">
                Détail <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </button>
        );
      })}
    </div>
  );
}
