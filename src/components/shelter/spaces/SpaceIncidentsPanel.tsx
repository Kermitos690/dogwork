import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertTriangle } from "lucide-react";
import { useSpaceIncidents, useIncidentMutations } from "@/hooks/useShelterSpaceDetail";
import { useUpdateShelterSpace } from "@/hooks/useShelterSpaces";
import type { SpaceIncident, ShelterSpace } from "@/types/shelterSpaces";
import { toast } from "sonner";
import { Section, Empty, SkeletonRows } from "./SpaceOccupationPanel";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const TYPES = [
  "bite", "fight", "escape", "injury", "destruction", "intense_fear",
  "excessive_barking", "sanitary_issue", "broken_equipment", "environmental_danger", "other",
];
const TYPE_LABEL: Record<string, string> = {
  bite: "Morsure", fight: "Bagarre", escape: "Évasion", injury: "Blessure",
  destruction: "Destruction", intense_fear: "Peur intense", excessive_barking: "Aboiements excessifs",
  sanitary_issue: "Sanitaire", broken_equipment: "Équipement cassé", environmental_danger: "Danger environnement", other: "Autre",
};
const SEVERITIES = [
  { value: "low", label: "Faible", color: "bg-emerald-500/15 text-emerald-700" },
  { value: "medium", label: "Moyenne", color: "bg-amber-500/15 text-amber-700" },
  { value: "high", label: "Élevée", color: "bg-orange-500/15 text-orange-700" },
  { value: "critical", label: "Critique", color: "bg-red-500/15 text-red-700" },
];

export function SpaceIncidentsPanel({ space }: { space: ShelterSpace }) {
  const { data: items = [], isLoading } = useSpaceIncidents(space.id);
  const { create } = useIncidentMutations();
  const updateSpace = useUpdateShelterSpace();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ incident_type: "other", severity: "low", description: "", action_taken: "", follow_up_required: false, space_closed: false });

  const submit = async () => {
    try {
      await create.mutateAsync({
        space_id: space.id,
        shelter_user_id: space.shelter_user_id,
        ...form,
      });
      if (form.space_closed && form.severity === "critical") {
        updateSpace.mutate({ id: space.id, patch: { status: "closed" } });
      } else if (form.space_closed) {
        updateSpace.mutate({ id: space.id, patch: { status: "restricted" } });
      }
      toast.success("Incident enregistré");
      setOpen(false);
      setForm({ incident_type: "other", severity: "low", description: "", action_taken: "", follow_up_required: false, space_closed: false });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Section
      title={`Incidents (${items.length})`}
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 gap-1"><Plus className="h-3.5 w-3.5" /> Signaler</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Signaler un incident</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Type">
                  <Select value={form.incident_type} onValueChange={(v) => setForm({ ...form, incident_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Gravité">
                  <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SEVERITIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Description"><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
              <Field label="Action prise"><Textarea rows={2} value={form.action_taken} onChange={(e) => setForm({ ...form, action_taken: e.target.value })} /></Field>
              <label className="flex items-center justify-between text-sm">
                <span>Suivi requis</span>
                <Switch checked={form.follow_up_required} onCheckedChange={(v) => setForm({ ...form, follow_up_required: v })} />
              </label>
              <label className="flex items-center justify-between text-sm">
                <span>Fermer l'espace</span>
                <Switch checked={form.space_closed} onCheckedChange={(v) => setForm({ ...form, space_closed: v })} />
              </label>
              <Button className="w-full" onClick={submit} disabled={create.isPending}>{create.isPending ? "..." : "Enregistrer"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      {isLoading ? <SkeletonRows /> : items.length === 0 ? <Empty>Aucun incident signalé.</Empty> : items.map((i) => <Row key={i.id} i={i} />)}
    </Section>
  );
}

function Row({ i }: { i: SpaceIncident }) {
  const s = SEVERITIES.find((x) => x.value === i.severity) ?? SEVERITIES[0];
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-md border border-border/60 bg-card/40">
      <AlertTriangle className={`h-3.5 w-3.5 mt-1 ${i.severity === "critical" || i.severity === "high" ? "text-red-500" : "text-muted-foreground"}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{i.incident_type ? TYPE_LABEL[i.incident_type] ?? i.incident_type : "Incident"}</p>
          <Badge className={`text-[9px] ${s.color} border-0`}>{s.label}</Badge>
        </div>
        {i.description && <p className="text-[11px] text-muted-foreground mt-0.5">{i.description}</p>}
        {i.action_taken && <p className="text-[10px] text-muted-foreground mt-0.5"><span className="font-medium">Action :</span> {i.action_taken}</p>}
        <div className="flex items-center gap-2 mt-1">
          <p className="text-[10px] text-muted-foreground">{format(new Date(i.occurred_at), "dd MMM yyyy HH:mm", { locale: fr })}</p>
          {i.follow_up_required && <Badge variant="outline" className="text-[8px]">Suivi requis</Badge>}
          {i.space_closed && <Badge variant="outline" className="text-[8px] text-red-600 border-red-500/40">Espace fermé</Badge>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
