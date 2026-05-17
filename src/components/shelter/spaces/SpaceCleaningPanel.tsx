import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Sparkles } from "lucide-react";
import { useSpaceCleaningLogs, useCleaningMutations } from "@/hooks/useShelterSpaceDetail";
import { useUpdateShelterSpace } from "@/hooks/useShelterSpaces";
import type { SpaceCleaningLog, ShelterSpace } from "@/types/shelterSpaces";
import { toast } from "sonner";
import { Section, Empty, SkeletonRows } from "./SpaceOccupationPanel";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const CHECKLIST = [
  { key: "trash", label: "Déchets retirés" },
  { key: "water_emptied", label: "Eau vidée" },
  { key: "floor_washed", label: "Sol lavé" },
  { key: "disinfected", label: "Désinfection faite" },
  { key: "fence_checked", label: "Clôture vérifiée" },
  { key: "equipment_checked", label: "Équipements vérifiés" },
  { key: "water_refilled", label: "Eau remise" },
  { key: "material_back", label: "Matériel remis" },
  { key: "validated", label: "Espace validé" },
];
const LEVELS = [
  { value: "quick", label: "Rapide" },
  { value: "standard", label: "Standard" },
  { value: "deep", label: "Approfondi" },
  { value: "disinfection", label: "Désinfection complète" },
];

export function SpaceCleaningPanel({ space }: { space: ShelterSpace }) {
  const { data: logs = [], isLoading } = useSpaceCleaningLogs(space.id);
  const { create } = useCleaningMutations();
  const updateSpace = useUpdateShelterSpace();
  const [open, setOpen] = useState(false);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [level, setLevel] = useState("standard");
  const [notes, setNotes] = useState("");
  const [next, setNext] = useState("");

  const last = logs[0];

  const submit = async () => {
    try {
      await create.mutateAsync({
        space_id: space.id,
        shelter_user_id: space.shelter_user_id,
        cleaning_level: level,
        checklist,
        notes: notes || null,
        next_cleaning_at: next || null,
      });
      if (space.status === "cleaning_required") {
        updateSpace.mutate({ id: space.id, patch: { status: "available" } });
      }
      toast.success("Nettoyage enregistré");
      setOpen(false);
      setChecklist({}); setNotes(""); setNext(""); setLevel("standard");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <SummaryCard label="Dernier nettoyage" value={last ? format(new Date(last.cleaned_at), "dd MMM HH:mm", { locale: fr }) : "—"} />
        <SummaryCard label="Prochain" value={last?.next_cleaning_at ? format(new Date(last.next_cleaning_at), "dd MMM yyyy", { locale: fr }) : "Non planifié"} />
      </div>

      <Section
        title={`Historique (${logs.length})`}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 gap-1"><Plus className="h-3.5 w-3.5" /> Enregistrer</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nouveau nettoyage</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-xs">Niveau</Label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Checklist</Label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {CHECKLIST.map((c) => (
                      <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={!!checklist[c.key]} onCheckedChange={(v) => setChecklist({ ...checklist, [c.key]: !!v })} />
                        <span>{c.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Prochaine date</Label>
                  <Input type="datetime-local" value={next} onChange={(e) => setNext(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Notes</Label>
                  <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <Button className="w-full" onClick={submit} disabled={create.isPending}>{create.isPending ? "Enregistrement..." : "Enregistrer"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      >
        {isLoading ? <SkeletonRows /> : logs.length === 0 ? <Empty>Aucun nettoyage enregistré.</Empty> : logs.map((l) => <CleaningRow key={l.id} log={l} />)}
      </Section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-card/40 p-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
  );
}

function CleaningRow({ log }: { log: SpaceCleaningLog }) {
  const done = Object.values(log.checklist || {}).filter(Boolean).length;
  const total = Object.keys(log.checklist || {}).length;
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-md border border-border/60 bg-card/40 text-xs">
      <Sparkles className="h-3.5 w-3.5 mt-0.5 text-primary" />
      <div className="flex-1 min-w-0">
        <p className="font-medium">{format(new Date(log.cleaned_at), "dd MMM yyyy HH:mm", { locale: fr })} {log.cleaning_level && <span className="text-muted-foreground">· {log.cleaning_level}</span>}</p>
        {total > 0 && <p className="text-[10px] text-muted-foreground">{done}/{total} étapes</p>}
        {log.notes && <p className="text-[11px] text-muted-foreground italic mt-0.5">{log.notes}</p>}
      </div>
    </div>
  );
}
