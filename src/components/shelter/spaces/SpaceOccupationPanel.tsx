import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { calculateOccupancyRate } from "@/lib/shelterSpaces";
import type { ShelterSpace, SpaceAssignment } from "@/types/shelterSpaces";
import { useSpaceAssignments } from "@/hooks/useShelterSpaceDetail";
import { PawPrint, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function SpaceOccupationPanel({ space, currentOccupancy }: { space: ShelterSpace; currentOccupancy: number }) {
  const { data: assignments = [], isLoading } = useSpaceAssignments(space.id);
  const active = assignments.filter((a) => a.status === "active" && !a.ends_at);
  const history = assignments.filter((a) => a.status !== "active" || a.ends_at);
  const max = space.capacity ?? 0;
  const rate = calculateOccupancyRate(currentOccupancy, max);
  const over = max > 0 && currentOccupancy > max;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Occupé" value={`${currentOccupancy}`} />
        <Stat label="Capacité" value={max ? `${max}` : "—"} sub={space.capacity_recommended ? `reco ${space.capacity_recommended}` : undefined} />
        <Stat label="Taux" value={`${rate}%`} highlight={over ? "red" : rate >= 80 ? "amber" : undefined} />
      </div>

      {over && (
        <Card className="border-red-500/40 bg-red-500/5">
          <CardContent className="p-3 text-xs text-red-700 dark:text-red-400">
            ⚠️ Surcapacité détectée. Vérifier la sécurité des animaux assignés.
          </CardContent>
        </Card>
      )}

      <Section title="Assignations actives">
        {isLoading ? (
          <SkeletonRows />
        ) : active.length === 0 ? (
          <Empty>Aucune assignation active.</Empty>
        ) : (
          active.map((a) => <AssignmentRow key={a.id} a={a} />)
        )}
      </Section>

      <Section title="Historique récent">
        {history.length === 0 ? <Empty>Aucun historique.</Empty> : history.slice(0, 10).map((a) => <AssignmentRow key={a.id} a={a} historical />)}
      </Section>
    </div>
  );
}

function Stat({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: "red" | "amber" }) {
  const color = highlight === "red" ? "text-red-600" : highlight === "amber" ? "text-amber-600" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <p className={`text-lg font-bold ${color}`}>{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        {sub && <p className="text-[9px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function AssignmentRow({ a, historical }: { a: SpaceAssignment; historical?: boolean }) {
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-md border border-border/60 bg-card/40 text-xs">
      <PawPrint className={`h-3.5 w-3.5 mt-0.5 ${historical ? "text-muted-foreground" : "text-primary"}`} />
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="font-medium truncate">{a.animal_id ? `Animal · ${a.animal_id.slice(0, 8)}` : a.reason || "Assignation"}</p>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {format(new Date(a.starts_at), "dd MMM yyyy HH:mm", { locale: fr })}
          {a.ends_at && <> → {format(new Date(a.ends_at), "dd MMM yyyy HH:mm", { locale: fr })}</>}
        </div>
        {a.notes && <p className="text-muted-foreground italic">{a.notes}</p>}
      </div>
      <Badge variant="outline" className="text-[9px]">{a.status}</Badge>
    </div>
  );
}

export function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{title}</h3>
        {action}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground italic py-3 text-center">{children}</p>;
}

export function SkeletonRows() {
  return (
    <>
      <div className="h-12 rounded-md bg-muted/40 animate-pulse" />
      <div className="h-12 rounded-md bg-muted/40 animate-pulse" />
    </>
  );
}
