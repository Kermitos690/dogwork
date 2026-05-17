import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Pin, Trash2 } from "lucide-react";
import { useSpaceNotes, useNoteMutations } from "@/hooks/useShelterSpaceDetail";
import type { SpaceNote, ShelterSpace } from "@/types/shelterSpaces";
import { toast } from "sonner";
import { Section, Empty, SkeletonRows } from "./SpaceOccupationPanel";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function SpaceNotesPanel({ space }: { space: ShelterSpace }) {
  const { data: notes = [], isLoading } = useSpaceNotes(space.id);
  const { create, update, remove } = useNoteMutations();
  const [text, setText] = useState("");
  const [pinned, setPinned] = useState(false);

  const submit = async () => {
    if (!text.trim()) return toast.error("Note vide");
    try {
      await create.mutateAsync({
        space_id: space.id,
        shelter_user_id: space.shelter_user_id,
        note: text.trim(),
        pinned,
        visibility: "staff",
      });
      toast.success("Note ajoutée");
      setText(""); setPinned(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const sorted = [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <div className="space-y-3">
      <div className="space-y-2 p-3 rounded-md border border-border/60 bg-card/40">
        <Label className="text-xs">Nouvelle note (staff uniquement)</Label>
        <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Observation, consigne, info..." />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs"><Switch checked={pinned} onCheckedChange={setPinned} /> Épingler</label>
          <Button size="sm" onClick={submit} disabled={create.isPending}>{create.isPending ? "..." : "Ajouter"}</Button>
        </div>
      </div>

      <Section title={`Notes (${notes.length})`}>
        {isLoading ? <SkeletonRows /> : sorted.length === 0 ? <Empty>Aucune note.</Empty> : sorted.map((n) => (
          <NoteRow key={n.id}
            n={n}
            onPin={() => update.mutate({ id: n.id, patch: { pinned: !n.pinned } })}
            onDelete={() => remove.mutate(n.id, { onSuccess: () => toast.success("Note supprimée") })}
          />
        ))}
      </Section>
    </div>
  );
}

function NoteRow({ n, onPin, onDelete }: { n: SpaceNote; onPin: () => void; onDelete: () => void }) {
  return (
    <div className={`flex items-start gap-2 p-2.5 rounded-md border ${n.pinned ? "border-primary/40 bg-primary/5" : "border-border/60 bg-card/40"}`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm whitespace-pre-wrap">{n.note}</p>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-[10px] text-muted-foreground">{format(new Date(n.created_at), "dd MMM yyyy HH:mm", { locale: fr })}</p>
          {n.pinned && <Badge variant="outline" className="text-[8px] text-primary border-primary/40">Épinglé</Badge>}
          <Badge variant="outline" className="text-[8px]">{n.visibility}</Badge>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onPin}><Pin className={`h-3 w-3 ${n.pinned ? "text-primary" : ""}`} /></Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onDelete}><Trash2 className="h-3 w-3" /></Button>
      </div>
    </div>
  );
}
