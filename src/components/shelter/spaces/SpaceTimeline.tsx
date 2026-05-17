import { useMemo } from "react";
import {
  useSpaceCleaningLogs, useSpaceMaintenanceLogs, useSpaceIncidents,
  useSpaceNotes, useSpaceEquipment, useSpaceAssignments,
} from "@/hooks/useShelterSpaceDetail";
import type { ShelterSpace } from "@/types/shelterSpaces";
import { Sparkles, Wrench, AlertTriangle, StickyNote, Plus, PawPrint, Pencil } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Empty } from "./SpaceOccupationPanel";

type Event = { id: string; date: string; icon: React.ReactNode; title: string; subtitle?: string; tone: string };

export function SpaceTimeline({ space }: { space: ShelterSpace }) {
  const { data: cleaning = [] } = useSpaceCleaningLogs(space.id);
  const { data: maintenance = [] } = useSpaceMaintenanceLogs(space.id);
  const { data: incidents = [] } = useSpaceIncidents(space.id);
  const { data: notes = [] } = useSpaceNotes(space.id);
  const { data: equipment = [] } = useSpaceEquipment(space.id);
  const { data: assignments = [] } = useSpaceAssignments(space.id);

  const events: Event[] = useMemo(() => {
    const arr: Event[] = [
      { id: "create", date: space.created_at, icon: <Plus className="h-3 w-3" />, title: "Espace créé", tone: "text-primary" },
    ];
    if (space.updated_at && space.updated_at !== space.created_at) {
      arr.push({ id: "update", date: space.updated_at, icon: <Pencil className="h-3 w-3" />, title: "Espace modifié", tone: "text-muted-foreground" });
    }
    cleaning.forEach((c) => arr.push({ id: `cl-${c.id}`, date: c.cleaned_at, icon: <Sparkles className="h-3 w-3" />, title: "Nettoyage", subtitle: c.cleaning_level ?? undefined, tone: "text-emerald-600" }));
    maintenance.forEach((m) => arr.push({ id: `m-${m.id}`, date: m.created_at, icon: <Wrench className="h-3 w-3" />, title: `Maintenance · ${m.title}`, subtitle: m.priority, tone: "text-orange-600" }));
    incidents.forEach((i) => arr.push({ id: `i-${i.id}`, date: i.occurred_at, icon: <AlertTriangle className="h-3 w-3" />, title: `Incident · ${i.incident_type ?? "—"}`, subtitle: i.severity, tone: "text-red-600" }));
    notes.filter((n) => n.pinned).forEach((n) => arr.push({ id: `n-${n.id}`, date: n.created_at, icon: <StickyNote className="h-3 w-3" />, title: "Note épinglée", subtitle: n.note.slice(0, 60), tone: "text-amber-600" }));
    equipment.forEach((e) => arr.push({ id: `e-${e.id}`, date: e.created_at, icon: <Wrench className="h-3 w-3" />, title: `Équipement · ${e.name}`, tone: "text-muted-foreground" }));
    assignments.forEach((a) => arr.push({ id: `a-${a.id}`, date: a.starts_at, icon: <PawPrint className="h-3 w-3" />, title: "Assignation", subtitle: a.animal_id ? `Animal ${a.animal_id.slice(0, 8)}` : a.reason ?? undefined, tone: "text-blue-600" }));
    return arr.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [space, cleaning, maintenance, incidents, notes, equipment, assignments]);

  if (events.length === 0) return <Empty>Aucune activité.</Empty>;

  return (
    <div className="relative pl-4 border-l border-border space-y-3 py-2">
      {events.map((e) => (
        <div key={e.id} className="relative">
          <div className={`absolute -left-[21px] top-1 w-4 h-4 rounded-full bg-background border border-border flex items-center justify-center ${e.tone}`}>
            {e.icon}
          </div>
          <div className="pl-2">
            <p className="text-sm font-medium">{e.title}</p>
            {e.subtitle && <p className="text-[11px] text-muted-foreground">{e.subtitle}</p>}
            <p className="text-[10px] text-muted-foreground">{format(new Date(e.date), "dd MMM yyyy HH:mm", { locale: fr })}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
