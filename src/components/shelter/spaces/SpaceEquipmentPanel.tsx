import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Wrench } from "lucide-react";
import { useSpaceEquipment, useEquipmentMutations } from "@/hooks/useShelterSpaceDetail";
import type { SpaceEquipment } from "@/types/shelterSpaces";
import { toast } from "sonner";
import { Section, Empty, SkeletonRows } from "./SpaceOccupationPanel";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUSES = [
  { value: "ok", label: "OK", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  { value: "to_check", label: "À vérifier", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  { value: "broken", label: "Cassé", color: "bg-red-500/15 text-red-700 dark:text-red-400" },
  { value: "missing", label: "Manquant", color: "bg-orange-500/15 text-orange-700 dark:text-orange-400" },
  { value: "dangerous", label: "Dangereux", color: "bg-red-700/20 text-red-800 dark:text-red-300" },
];

export function SpaceEquipmentPanel({ spaceId, shelterUserId }: { spaceId: string; shelterUserId: string }) {
  const { data: items = [], isLoading } = useSpaceEquipment(spaceId);
  const { create, update, remove } = useEquipmentMutations();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", equipment_type: "", quantity: 1, status: "ok", notes: "", last_checked_at: "", next_check_at: "" });

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Nom requis");
    try {
      await create.mutateAsync({
        space_id: spaceId,
        shelter_user_id: shelterUserId,
        name: form.name.trim(),
        equipment_type: form.equipment_type || null,
        quantity: form.quantity,
        status: form.status,
        notes: form.notes || null,
        last_checked_at: form.last_checked_at || null,
        next_check_at: form.next_check_at || null,
      });
      toast.success("Équipement ajouté");
      setOpen(false);
      setForm({ name: "", equipment_type: "", quantity: 1, status: "ok", notes: "", last_checked_at: "", next_check_at: "" });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Section
      title={`Équipements (${items.length})`}
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 gap-1"><Plus className="h-3.5 w-3.5" /> Ajouter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvel équipement</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <Field label="Nom *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Gamelle, panier, agility..." /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Type"><Input value={form.equipment_type} onChange={(e) => setForm({ ...form, equipment_type: e.target.value })} placeholder="Mobilier, sécurité..." /></Field>
                <Field label="Quantité"><Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} /></Field>
              </div>
              <Field label="Statut">
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Dernière vérif."><Input type="date" value={form.last_checked_at} onChange={(e) => setForm({ ...form, last_checked_at: e.target.value })} /></Field>
                <Field label="Prochaine vérif."><Input type="date" value={form.next_check_at} onChange={(e) => setForm({ ...form, next_check_at: e.target.value })} /></Field>
              </div>
              <Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></Field>
              <Button className="w-full" onClick={submit} disabled={create.isPending}>{create.isPending ? "Ajout..." : "Ajouter"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      {isLoading ? <SkeletonRows /> : items.length === 0 ? <Empty>Aucun équipement enregistré.</Empty> : items.map((eq) => (
        <EquipmentRow
          key={eq.id}
          eq={eq}
          onStatus={(s) => update.mutate({ id: eq.id, patch: { status: s } })}
          onDelete={() => remove.mutate(eq.id, { onSuccess: () => toast.success("Équipement supprimé") })}
        />
      ))}
    </Section>
  );
}

function EquipmentRow({ eq, onStatus, onDelete }: { eq: SpaceEquipment; onStatus: (s: string) => void; onDelete: () => void }) {
  const meta = STATUSES.find((s) => s.value === eq.status) ?? STATUSES[0];
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-md border border-border/60 bg-card/40">
      <Wrench className="h-3.5 w-3.5 mt-1 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate">{eq.name} <span className="text-muted-foreground text-xs">×{eq.quantity}</span></p>
          <Badge className={`text-[9px] ${meta.color} border-0`}>{meta.label}</Badge>
        </div>
        {eq.equipment_type && <p className="text-[10px] text-muted-foreground">{eq.equipment_type}</p>}
        {(eq.last_checked_at || eq.next_check_at) && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {eq.last_checked_at && <>Vérifié : {format(new Date(eq.last_checked_at), "dd MMM yyyy", { locale: fr })}</>}
            {eq.last_checked_at && eq.next_check_at && " · "}
            {eq.next_check_at && <>Prochaine : {format(new Date(eq.next_check_at), "dd MMM yyyy", { locale: fr })}</>}
          </p>
        )}
        {eq.notes && <p className="text-[11px] text-muted-foreground italic mt-0.5">{eq.notes}</p>}
      </div>
      <div className="flex flex-col gap-1">
        <Select value={eq.status} onValueChange={onStatus}>
          <SelectTrigger className="h-6 w-[100px] text-[10px]"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive self-end" onClick={onDelete}><Trash2 className="h-3 w-3" /></Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
