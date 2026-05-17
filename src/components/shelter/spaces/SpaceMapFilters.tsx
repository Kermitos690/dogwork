import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, RotateCcw } from "lucide-react";
import { SPACE_TYPES, SPACE_STATUSES, RISK_LEVELS, INDOOR_OUTDOOR } from "@/lib/shelterSpaces";

export interface SpaceFiltersState {
  q: string;
  type: string;
  status: string;
  risk: string;
  io: string;
  building: string;
  onlyAvailable: boolean;
  onlyMaintenance: boolean;
  onlyCleaning: boolean;
  onlyRisky: boolean;
}

export const DEFAULT_FILTERS: SpaceFiltersState = {
  q: "", type: "all", status: "all", risk: "all", io: "all", building: "all",
  onlyAvailable: false, onlyMaintenance: false, onlyCleaning: false, onlyRisky: false,
};

export function SpaceMapFilters({
  value, onChange, buildings,
}: {
  value: SpaceFiltersState;
  onChange: (v: SpaceFiltersState) => void;
  buildings: string[];
}) {
  const set = <K extends keyof SpaceFiltersState>(k: K, v: SpaceFiltersState[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="rounded-lg border border-border/60 bg-card/60 backdrop-blur-sm p-3 space-y-2">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={value.q}
          onChange={(e) => set("q", e.target.value)}
          placeholder="Rechercher un espace…"
          className="h-8 pl-7 text-xs"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select value={value.type} onValueChange={(v) => set("type", v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            {SPACE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={value.status} onValueChange={(v) => set("status", v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            {SPACE_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={value.risk} onValueChange={(v) => set("risk", v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Risque" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous risques</SelectItem>
            {RISK_LEVELS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={value.io} onValueChange={(v) => set("io", v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Zone" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Int./Ext.</SelectItem>
            {INDOOR_OUTDOOR.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {buildings.length > 0 && (
          <Select value={value.building} onValueChange={(v) => set("building", v)}>
            <SelectTrigger className="h-8 text-xs col-span-2"><SelectValue placeholder="Bâtiment" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous bâtiments</SelectItem>
              {buildings.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 pt-1">
        <FilterChip active={value.onlyAvailable} onClick={() => set("onlyAvailable", !value.onlyAvailable)}>Disponibles</FilterChip>
        <FilterChip active={value.onlyMaintenance} onClick={() => set("onlyMaintenance", !value.onlyMaintenance)}>Maintenance</FilterChip>
        <FilterChip active={value.onlyCleaning} onClick={() => set("onlyCleaning", !value.onlyCleaning)}>Nettoyage</FilterChip>
        <FilterChip active={value.onlyRisky} onClick={() => set("onlyRisky", !value.onlyRisky)}>Risque élevé</FilterChip>
      </div>
      <Button variant="ghost" size="sm" className="w-full h-7 text-xs gap-1.5" onClick={() => onChange(DEFAULT_FILTERS)}>
        <RotateCcw className="h-3 w-3" /> Réinitialiser
      </Button>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        "px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors " +
        (active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/30")
      }
    >
      {children}
    </button>
  );
}
