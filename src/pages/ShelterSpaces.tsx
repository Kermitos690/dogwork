import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShelterLayout } from "@/components/ShelterLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Grid3X3, Plus, Pencil, Trash2, PawPrint } from "lucide-react";
import { motion } from "framer-motion";

const SPACE_TYPES = [
  { value: "box", label: "Box" },
  { value: "enclos", label: "Enclos" },
  { value: "infirmerie", label: "Infirmerie" },
  { value: "quarantaine", label: "Quarantaine" },
  { value: "promenade", label: "Zone de promenade" },
  { value: "accueil", label: "Accueil" },
];

const SPACE_COLORS: Record<string, string> = {
  box: "bg-blue-500/20 border-blue-500/40",
  enclos: "bg-emerald-500/20 border-emerald-500/40",
  infirmerie: "bg-red-500/20 border-red-500/40",
  quarantaine: "bg-amber-500/20 border-amber-500/40",
  promenade: "bg-green-500/20 border-green-500/40",
  accueil: "bg-purple-500/20 border-purple-500/40",
};

interface SpaceForm {
  name: string;
  space_type: string;
  capacity: number;
  notes: string;
}

const emptyForm: SpaceForm = { name: "", space_type: "box", capacity: 1, notes: "" };

export default function ShelterSpaces() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<SpaceForm>(emptyForm);
  const [assignDialog, setAssignDialog] = useState<string | null>(null);

  const { data: spaces = [], isLoading } = useQuery({
    queryKey: ["shelter-spaces", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("shelter_spaces" as any)
        .select("*")
        .eq("shelter_user_id", user!.id)
        .order("name");
      return (data as any[]) || [];
    },
    enabled: !!user,
  });

  const { data: animals = [] } = useQuery({
    queryKey: ["shelter-animals-for-spaces", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("shelter_animals" as any)
        .select("id, name, species, status")
        .eq("user_id", user!.id)
        .not("status", "in", '("adopté","décédé","transféré")');
      return (data as any[]) || [];
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Nom requis");
      if (editId) {
        const { error } = await (supabase.from("shelter_spaces" as any) as any)
          .update({ name: form.name, space_type: form.space_type, capacity: form.capacity, notes: form.notes })
          .eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("shelter_spaces" as any) as any)
          .insert({ shelter_user_id: user!.id, name: form.name, space_type: form.space_type, capacity: form.capacity, notes: form.notes });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shelter-spaces"] });
      setDialogOpen(false);
      setEditId(null);
      setForm(emptyForm);
      toast({ title: editId ? "Espace mis à jour" : "Espace créé" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("shelter_spaces" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shelter-spaces"] });
      toast({ title: "Espace supprimé" });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ spaceId, animalId }: { spaceId: string; animalId: string | null }) => {
      const { error } = await (supabase.from("shelter_spaces" as any) as any)
        .update({ current_animal_id: animalId })
        .eq("id", spaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shelter-spaces"] });
      setAssignDialog(null);
      toast({ title: "Animal assigné ✅" });
    },
  });

  const openEdit = (space: any) => {
    setEditId(space.id);
    setForm({ name: space.name, space_type: space.space_type, capacity: space.capacity || 1, notes: space.notes || "" });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const getAnimalName = (animalId: string | null) => {
    if (!animalId) return null;
    const animal = animals.find((a: any) => a.id === animalId);
    return animal ? animal.name : null;
  };

  return (
    <ShelterLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pt-14 pb-8 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-primary" />
            Espaces
          </h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1" onClick={openNew}><Plus className="h-4 w-4" /> Ajouter</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editId ? "Modifier l'espace" : "Nouvel espace"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Nom *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Box 1, Enclos A..." />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.space_type} onValueChange={(v) => setForm({ ...form, space_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SPACE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Capacité</Label>
                  <Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 1 })} />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Remarques..." />
                </div>
                <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Sauvegarde..." : "Enregistrer"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="animate-pulse text-muted-foreground text-center py-8">Chargement...</div>
        ) : spaces.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Grid3X3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aucun espace créé</p>
              <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={openNew}>
                <Plus className="h-4 w-4" /> Créer un espace
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {spaces.map((space: any) => {
              const animalName = getAnimalName(space.current_animal_id);
              const colorClass = SPACE_COLORS[space.space_type] || "bg-muted border-border";
              return (
                <Card key={space.id} className={`border ${colorClass} overflow-hidden`}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-foreground truncate">{space.name}</p>
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(space)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteMutation.mutate(space.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground capitalize">{SPACE_TYPES.find(t => t.value === space.space_type)?.label || space.space_type}</p>
                    
                    {animalName ? (
                      <div className="flex items-center gap-1 p-1.5 rounded bg-primary/10">
                        <PawPrint className="h-3 w-3 text-primary" />
                        <span className="text-xs font-medium text-primary truncate">{animalName}</span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground italic">Libre</p>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-[10px] h-7"
                      onClick={() => setAssignDialog(space.id)}
                    >
                      {animalName ? "Changer" : "Assigner"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Assign animal dialog */}
        <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assigner un animal</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <Button variant="outline" className="w-full justify-start text-xs" onClick={() => assignMutation.mutate({ spaceId: assignDialog!, animalId: null })}>
                Libérer l'espace
              </Button>
              {animals.map((a: any) => (
                <Button
                  key={a.id}
                  variant="outline"
                  className="w-full justify-start text-xs gap-2"
                  onClick={() => assignMutation.mutate({ spaceId: assignDialog!, animalId: a.id })}
                >
                  <PawPrint className="h-3 w-3" />
                  {a.name} ({a.species})
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </ShelterLayout>
  );
}
