import { useState } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useAIDocuments, useUpdateAIDocument, useDeleteAIDocument, AIDocument, AIDocumentType,
} from "@/hooks/useAIDocuments";
import {
  BookMarked, Search, Archive, ArchiveRestore, Pencil, Trash2,
  BookOpen, Brain, ClipboardCheck, Heart, TrendingUp, ImageIcon, FileText, Eye,
} from "lucide-react";
import { AIDocumentViewer } from "@/components/AIDocumentViewer";
import { AIPostGenerationActions } from "@/components/AIPostGenerationActions";

const TYPE_META: Record<AIDocumentType, { label: string; icon: React.ElementType; color: string }> = {
  training_plan: { label: "Plan", icon: BookOpen, color: "bg-blue-500/15 text-blue-600 dark:text-blue-300" },
  behavior_analysis: { label: "Analyse", icon: Brain, color: "bg-purple-500/15 text-purple-600 dark:text-purple-300" },
  evaluation_scoring: { label: "Évaluation", icon: ClipboardCheck, color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
  adoption_plan: { label: "Adoption", icon: Heart, color: "bg-rose-500/15 text-rose-600 dark:text-rose-300" },
  progress_report: { label: "Rapport", icon: TrendingUp, color: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
  image: { label: "Image", icon: ImageIcon, color: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300" },
  other: { label: "Autre", icon: FileText, color: "bg-muted text-muted-foreground" },
};

export default function Documents() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | AIDocumentType>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [viewing, setViewing] = useState<AIDocument | null>(null);
  const [renaming, setRenaming] = useState<AIDocument | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState<AIDocument | null>(null);

  const { data: documents = [], isLoading } = useAIDocuments({
    type: typeFilter === "all" ? undefined : typeFilter,
    includeArchived: showArchived,
  });
  const updateDoc = useUpdateAIDocument();
  const deleteDoc = useDeleteAIDocument();

  const filtered = documents.filter((d) =>
    !search || d.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleRename = async () => {
    if (!renaming) return;
    await updateDoc.mutateAsync({ id: renaming.id, patch: { title: renameValue.trim() || renaming.title } });
    setRenaming(null);
  };

  const handleArchiveToggle = (doc: AIDocument) => {
    updateDoc.mutate({ id: doc.id, patch: { is_archived: !doc.is_archived } });
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await deleteDoc.mutateAsync(deleting.id);
    setDeleting(null);
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <BookMarked className="h-5 w-5 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Mes documents IA</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Toutes tes créations IA sont conservées ici. Tu peux les consulter, renommer, archiver ou supprimer à tout moment.
          </p>
        </motion.div>

        {/* Filters */}
        <Card className="p-3 mb-4 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un document…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
            <SelectTrigger className="sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="training_plan">Plans d'entraînement</SelectItem>
              <SelectItem value="behavior_analysis">Analyses</SelectItem>
              <SelectItem value="evaluation_scoring">Évaluations</SelectItem>
              <SelectItem value="adoption_plan">Plans d'adoption</SelectItem>
              <SelectItem value="progress_report">Rapports</SelectItem>
              <SelectItem value="image">Images</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={showArchived ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowArchived((v) => !v)}
          >
            <Archive className="h-4 w-4 mr-1.5" />
            {showArchived ? "Masquer archivés" : "Afficher archivés"}
          </Button>
        </Card>

        {/* List */}
        {isLoading ? (
          <p className="text-center text-muted-foreground py-12">Chargement…</p>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <BookMarked className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-medium text-foreground mb-1">Aucun document pour le moment</p>
            <p className="text-sm text-muted-foreground">
              Lance une génération depuis les{" "}
              <a href="/outils" className="text-primary underline">Outils IA</a>{" "}
              pour commencer ta bibliothèque.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((doc) => {
              const meta = TYPE_META[doc.document_type] || TYPE_META.other;
              const Icon = meta.icon;
              return (
                <Card
                  key={doc.id}
                  className={`p-4 ${doc.is_archived ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant="outline" className="text-[10px]">{meta.label}</Badge>
                        {doc.is_archived && <Badge variant="secondary" className="text-[10px]">Archivé</Badge>}
                      </div>
                      <h3 className="font-semibold text-foreground truncate">{doc.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(doc.created_at).toLocaleDateString("fr-CH", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                        {doc.credits_spent > 0 && ` · ${doc.credits_spent} crédit${doc.credits_spent > 1 ? "s" : ""}`}
                      </p>
                    </div>
                  </div>
                  {doc.summary && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{doc.summary}</p>
                  )}
                  <div className="flex items-center gap-1 flex-wrap">
                    <Button size="sm" variant="ghost" onClick={() => setViewing(doc)}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> Voir
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setRenaming(doc); setRenameValue(doc.title); }}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Renommer
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleArchiveToggle(doc)}>
                      {doc.is_archived ? (
                        <><ArchiveRestore className="h-3.5 w-3.5 mr-1" /> Restaurer</>
                      ) : (
                        <><Archive className="h-3.5 w-3.5 mr-1" /> Archiver</>
                      )}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleting(doc)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Supprimer
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* View dialog */}
        <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewing?.title}</DialogTitle>
              <DialogDescription>
                {viewing && new Date(viewing.created_at).toLocaleString("fr-CH")}
              </DialogDescription>
            </DialogHeader>
            {viewing?.summary && (
              <p className="text-sm text-muted-foreground italic border-l-2 border-primary/40 pl-3">{viewing.summary}</p>
            )}
            <pre className="text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono">
              {viewing && JSON.stringify(viewing.content, null, 2)}
            </pre>
          </DialogContent>
        </Dialog>

        {/* Rename dialog */}
        <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Renommer le document</DialogTitle>
            </DialogHeader>
            <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRenaming(null)}>Annuler</Button>
              <Button onClick={handleRename} disabled={updateDoc.isPending}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est définitive. « {deleting?.title} » sera supprimé pour toujours.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
