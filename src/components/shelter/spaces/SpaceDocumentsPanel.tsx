import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FileText, Trash2, ExternalLink } from "lucide-react";
import { useSpaceDocuments, useDocumentMutations } from "@/hooks/useShelterSpaceDetail";
import type { SpaceDocument, ShelterSpace } from "@/types/shelterSpaces";
import { toast } from "sonner";
import { Section, Empty, SkeletonRows } from "./SpaceOccupationPanel";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function SpaceDocumentsPanel({ space }: { space: ShelterSpace }) {
  const { data: docs = [], isLoading } = useSpaceDocuments(space.id);
  const { create, remove } = useDocumentMutations();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", file_url: "", document_type: "", file_type: "" });

  const submit = async () => {
    if (!form.title.trim() || !form.file_url.trim()) return toast.error("Titre et URL requis");
    try {
      await create.mutateAsync({
        space_id: space.id,
        shelter_user_id: space.shelter_user_id,
        title: form.title.trim(),
        file_url: form.file_url.trim(),
        document_type: form.document_type || null,
        file_type: form.file_type || null,
      });
      toast.success("Document ajouté");
      setOpen(false);
      setForm({ title: "", file_url: "", document_type: "", file_type: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Section
      title={`Documents (${docs.length})`}
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 gap-1"><Plus className="h-3.5 w-3.5" /> Ajouter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau document</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <Field label="Titre *"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
              <Field label="URL *"><Input value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} placeholder="https://..." /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Type document"><Input value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })} placeholder="Protocole, plan..." /></Field>
                <Field label="Type fichier"><Input value={form.file_type} onChange={(e) => setForm({ ...form, file_type: e.target.value })} placeholder="pdf, image..." /></Field>
              </div>
              <Button className="w-full" onClick={submit} disabled={create.isPending}>{create.isPending ? "..." : "Ajouter"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      {isLoading ? <SkeletonRows /> : docs.length === 0 ? <Empty>Aucun document.</Empty> : docs.map((d) => (
        <DocRow key={d.id} d={d} onDelete={() => remove.mutate(d.id, { onSuccess: () => toast.success("Document supprimé") })} />
      ))}
    </Section>
  );
}

function DocRow({ d, onDelete }: { d: SpaceDocument; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-md border border-border/60 bg-card/40">
      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{d.title || "Document"}</p>
        <p className="text-[10px] text-muted-foreground">
          {d.document_type || "—"}{d.file_type && ` · ${d.file_type}`} · {format(new Date(d.created_at), "dd MMM yyyy", { locale: fr })}
        </p>
      </div>
      {d.file_url && (
        <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
          <a href={d.file_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /></a>
        </Button>
      )}
      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onDelete}><Trash2 className="h-3 w-3" /></Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
