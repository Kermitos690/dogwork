import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CoachLayout } from "@/components/CoachLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, FileText, Search, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useCoachNotes, useCoachDogs } from "@/hooks/useCoach";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const noteTypes = [
  { value: "observation", label: "Observation" },
  { value: "recommendation", label: "Recommandation" },
  { value: "alert", label: "Alerte sécurité" },
  { value: "adjustment", label: "Ajustement plan" },
  { value: "health", label: "Santé / Prudence" },
  { value: "session", label: "Séance présentiel" },
  { value: "homework", label: "Travail à domicile" },
  { value: "hypothesis", label: "Hypothèse de travail" },
];

const priorityColors: Record<string, string> = {
  high: "bg-destructive/20 text-destructive border-destructive/30",
  normal: "bg-primary/20 text-primary border-primary/30",
  low: "bg-muted text-muted-foreground border-border/30",
};

export default function CoachNotes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: notes = [] } = useCoachNotes();
  const { data: dogs = [] } = useCoachDogs();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newNote, setNewNote] = useState({ title: "", content: "", note_type: "observation", priority_level: "normal", dog_id: "" });
  const [saving, setSaving] = useState(false);

  const filtered = notes.filter((n) =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (!user || !newNote.title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("coach_notes").insert({
      coach_user_id: user.id,
      title: newNote.title,
      content: newNote.content,
      note_type: newNote.note_type,
      priority_level: newNote.priority_level,
      dog_id: newNote.dog_id || null,
      client_user_id: newNote.dog_id ? dogs.find((d) => d.id === newNote.dog_id)?.user_id || null : null,
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Note ajoutée ✓" });
      queryClient.invalidateQueries({ queryKey: ["coach-notes"] });
      setAddOpen(false);
      setNewNote({ title: "", content: "", note_type: "observation", priority_level: "normal", dog_id: "" });
    }
    setSaving(false);
  };

  return (
    <CoachLayout>
      <div className="space-y-4 pb-24">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/coach")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Notes professionnelles</h1>
            <p className="text-xs text-muted-foreground">{notes.length} note{notes.length !== 1 ? "s" : ""}</p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Note</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nouvelle note</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <Input placeholder="Titre..." value={newNote.title} onChange={(e) => setNewNote({ ...newNote, title: e.target.value })} />
                <Select value={newNote.note_type} onValueChange={(v) => setNewNote({ ...newNote, note_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {noteTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={newNote.priority_level} onValueChange={(v) => setNewNote({ ...newNote, priority_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Basse</SelectItem>
                    <SelectItem value="normal">Normale</SelectItem>
                    <SelectItem value="high">Haute</SelectItem>
                  </SelectContent>
                </Select>
                {dogs.length > 0 && (
                  <Select value={newNote.dog_id} onValueChange={(v) => setNewNote({ ...newNote, dog_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Chien (optionnel)" /></SelectTrigger>
                    <SelectContent>
                      {dogs.map((d) => <SelectItem key={d.id} value={d.id}>{d.name} — {d.clientName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <Textarea placeholder="Contenu de la note..." rows={4} value={newNote.content} onChange={(e) => setNewNote({ ...newNote, content: e.target.value })} />
                <Button className="w-full" onClick={handleSave} disabled={saving || !newNote.title.trim()}>
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." className="pl-10 bg-card/50 border-border/50" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="space-y-2">
          {filtered.map((note, i) => (
            <motion.div key={note.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="bg-card/70 border-border/40">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-[10px]">
                      {noteTypes.find((t) => t.value === note.note_type)?.label || note.note_type}
                    </Badge>
                    <Badge className={`text-[10px] px-1.5 py-0 border ${priorityColors[note.priority_level] || priorityColors.normal}`}>
                      {note.priority_level === "high" ? "Prioritaire" : note.priority_level === "low" ? "Basse" : "Normal"}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-foreground">{note.title}</p>
                  {note.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{note.content}</p>}
                  <div className="flex items-center gap-1 mt-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(note.created_at), "d MMM yyyy HH:mm", { locale: fr })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <Card className="bg-card/50 border-border/40">
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Aucune note</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
