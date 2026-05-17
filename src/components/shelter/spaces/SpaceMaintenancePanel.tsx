import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Wrench } from "lucide-react";
import { useSpaceMaintenanceLogs, useMaintenanceMutations } from "@/hooks/useShelterSpaceDetail";
import { useUpdateShelterSpace } from "@/hooks/useShelterSpaces";
import type { SpaceMaintenanceLog, ShelterSpace } from "@/types/shelterSpaces";
import { toast } from "sonner";
import { Section, Empty, SkeletonRows } from "./SpaceOccupationPanel";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const PRIORITIES = [
  { value: "low", label: "Faible", color: "bg-emerald-500/15 text-emerald-700" },
  { value: "medium", label: "Moyenne", color: "bg-amber-500/15 text-amber-700" },
  { value: "high", label: "Haute", color: "bg-orange-500/15 text-orange-700" },
  { value: "critical", label: "Critique", color: "bg-red-500/15 text-red-700" },
];
const STATUSES = [
  { value: "open", label: "Ouverte" },
  { value: "in_progress", label: "En cours" },
  { value: "resolved", label: "Résolue" },
  { value: "cancelled", label: "Annulée" },
];

export function SpaceMaintenancePanel({ space }: { space: ShelterSpace }) {
  const { data: logs = [], isLoading } = useSpaceMaintenanceLogs(space.id);
  const { create, update } = useMaintenanceMutations();
  const updateSpace = useUpdateShelterSpace();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", due_at: "", estimated_cost: "" });

  const opens = logs.filter((l) => l.status === "open" || l.status === "in_progress");
  const closed = logs.filter((l) => l.status === "resolved" || l.status === "cancelled");

  const submit = async () => {
    if (!form.title.trim()) return toast.error("Titre requis");
    try {
      await create.mutateAsync({
        space_id: space.id,
        shelter_user_id: space.shelter_user_id,
        title: form.title.trim(),
        description: form.description || null,
        priority: form.priority,
        status: "open",
        due_at: form.due_at || null,
        estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : null,
      });
      if ((form.priority === "critical" || form.priority === "high") && space.status !== "closed" && space.status !== "emergency") {
        updateSpace.mutate({ id: space.id, patch: { status: "maintenance" } });
      }
      toast.success("Maintenance créée");
      setOpen(false);
      setForm({ title: "", description: "", priority: "medium", due_at: "", estimated_cost: "" });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <Section
        title={`Ouvertes (${opens.length})`}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 gap-1"><Plus className="h-3.5 w-3.5" /> Créer</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouvelle maintenance</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <Field label="Titre *"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Porte cassée..." /></Field>
                <Field label="Description"><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Priorité">
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Coût estimé"><Input type="number" step="0.01" value={form.estimated_cost} onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })} /></Field>
                </div>
                <Field label="Échéance"><Input type="datetime-local" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} /></Field>
                <Button className="w-full" onClick={submit} disabled={create.isPending}>{create.isPending ? "..." : "Créer"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      >
        {isLoading ? <SkeletonRows /> : opens.length === 0 ? <Empty>Aucune maintenance ouverte.</Empty> : opens.map((m) => <Row key={m.id} m={m} onStatus={(s) => update.mutate({ id: m.id, patch: { status: s, ...(s === "resolved" ? { resolved_at: new Date().toISOString() } : {}) } })} />)}
      </Section>

      {closed.length > 0 && (
        <Section title={`Clôturées (${closed.length})`}>
          {closed.slice(0, 10).map((m) => <Row key={m.id} m={m} compact />)}
        </Section>
      )}
    </div>
  );
}

function Row({ m, onStatus, compact }: { m: SpaceMaintenanceLog; onStatus?: (s: string) => void; compact?: boolean }) {
  const p = PRIORITIES.find((x) => x.value === m.priority) ?? PRIORITIES[0];
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-md border border-border/60 bg-card/40">
      <Wrench className="h-3.5 w-3.5 mt-1 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate">{m.title}</p>
          <Badge className={`text-[9px] ${p.color} border-0`}>{p.label}</Badge>
        </div>
        {m.description && !compact && <p className="text-[11px] text-muted-foreground mt-0.5">{m.description}</p>}
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Créé le {format(new Date(m.created_at), "dd MMM yyyy", { locale: fr })}
          {m.due_at && <> · échéance {format(new Date(m.due_at), "dd MMM", { locale: fr })}</>}
          {m.estimated_cost && <> · ~{m.estimated_cost}€</>}
        </p>
      </div>
      {onStatus && (
        <Select value={m.status} onValueChange={onStatus}>
          <SelectTrigger className="h-6 w-[110px] text-[10px]"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>)}</SelectContent>
        </Select>
      )}
      {!onStatus && <Badge variant="outline" className="text-[9px]">{m.status}</Badge>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
