import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShelterLayout } from "@/components/ShelterLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Grid3X3, Plus, Pencil, Trash2, PawPrint, LayoutGrid, BarChart3, Box, Move } from "lucide-react";
import { motion } from "framer-motion";
import { Spaces3DView, Space3D } from "@/components/shelter/Spaces3DView";

const SPACE_TYPES = [
  { value: "box", label: "Box" },
  { value: "enclos", label: "Enclos" },
  { value: "infirmerie", label: "Infirmerie" },
  { value: "quarantaine", label: "Quarantaine" },
  { value: "isolement", label: "Isolement" },
  { value: "promenade", label: "Zone de promenade" },
  { value: "accueil", label: "Accueil" },
];

const SPACE_COLORS: Record<string, string> = {
  box: "bg-blue-500/20 border-blue-500/40",
  enclos: "bg-emerald-500/20 border-emerald-500/40",
  infirmerie: "bg-red-500/20 border-red-500/40",
  quarantaine: "bg-amber-500/20 border-amber-500/40",
  isolement: "bg-orange-500/20 border-orange-500/40",
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
  const [view, setView] = useState<"3d" | "2d">("3d");
  const [editingLayout, setEditingLayout] = useState(false);

  // Use the SQL view for grid data
  const { data: spaces = [], isLoading } = useQuery({
    queryKey: ["shelter-spaces-grid", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("v_shelter_spaces_grid" as any).select("*");
      if (error) {
        // Fallback to direct table if view not available yet
        const { data: fallback } = await supabase
          .from("shelter_spaces" as any).select("*").eq("shelter_user_id", user!.id).order("name");
        return (fallback as any[]) || [];
      }
      return (data as any[]) || [];
    },
    enabled: !!user,
  });

  // Occupancy stats
  const { data: occupancy = [] } = useQuery({
    queryKey: ["shelter-spaces-occupancy", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("v_shelter_spaces_occupancy" as any).select("*");
      return (data as any[]) || [];
    },
    enabled: !!user,
  });

  // Global stats
  const { data: stats } = useQuery({
    queryKey: ["shelter-spaces-stats", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("v_shelter_spaces_stats" as any).select("*").single();
      return data as any;
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

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["shelter-spaces-grid"] });
    queryClient.invalidateQueries({ queryKey: ["shelter-spaces-occupancy"] });
    queryClient.invalidateQueries({ queryKey: ["shelter-spaces-stats"] });
  };

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
      invalidateAll();
      setDialogOpen(false); setEditId(null); setForm(emptyForm);
      toast({ title: editId ? "Espace mis à jour" : "Espace créé" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("shelter_spaces" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: "Espace supprimé" }); },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ spaceId, animalId }: { spaceId: string; animalId: string | null }) => {
      if (animalId) {
        await supabase.rpc("assign_animal_to_shelter_space" as any, { _space_id: spaceId, _animal_id: animalId });
      } else {
        await supabase.rpc("end_shelter_space_assignment" as any, { _space_id: spaceId });
      }
    },
    onSuccess: () => {
      invalidateAll(); setAssignDialog(null);
      toast({ title: "Affectation mise à jour ✅" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const openEdit = (space: any) => {
    setEditId(space.id);
    setForm({ name: space.name, space_type: space.space_type, capacity: space.capacity || 1, notes: space.notes || "" });
    setDialogOpen(true);
  };

  const openNew = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };

  return (
    <ShelterLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pb-8 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            Gestion des espaces
          </h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1" onClick={openNew}><Plus className="h-4 w-4" /> Ajouter</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? "Modifier l'espace" : "Nouvel espace"}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Nom *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Box A1, Enclos B..." />
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

        {/* Stats bar */}
        {stats && (
          <div className="grid grid-cols-3 gap-2">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold">{stats.total_spaces}</p>
                <p className="text-[10px] text-muted-foreground">Espaces</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold text-primary">{stats.occupied_spaces}</p>
                <p className="text-[10px] text-muted-foreground">Occupés</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold text-green-600">{stats.free_spaces}</p>
                <p className="text-[10px] text-muted-foreground">Libres</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Occupancy by type */}
        {occupancy.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Occupation par type
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {occupancy.map((o: any) => (
                <div key={o.space_type} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{SPACE_TYPES.find(t => t.value === o.space_type)?.label || o.space_type}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${o.occupancy_pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-16 text-right">{o.occupied}/{o.total} ({o.occupancy_pct}%)</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="animate-pulse text-muted-foreground text-center py-8">Chargement...</div>
        ) : spaces.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Grid3X3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aucun espace créé</p>
              <p className="text-xs text-muted-foreground mt-1">Créez des boxes, enclos et zones pour organiser votre refuge</p>
              <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={openNew}>
                <Plus className="h-4 w-4" /> Créer un espace
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {spaces.map((space: any) => {
              const animalName = space.animal_name || null;
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
                        {space.animal_species && (
                          <Badge variant="secondary" className="text-[8px] ml-auto">{space.animal_species}</Badge>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground italic">Libre</p>
                    )}

                    <Button variant="outline" size="sm" className="w-full text-[10px] h-7"
                      onClick={() => setAssignDialog(space.id)}>
                      {animalName ? "Changer" : "Assigner"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Assign dialog */}
        <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Assigner un animal</DialogTitle></DialogHeader>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <Button variant="outline" className="w-full justify-start text-xs"
                onClick={() => assignMutation.mutate({ spaceId: assignDialog!, animalId: null })}>
                Libérer l'espace
              </Button>
              {animals.map((a: any) => (
                <Button key={a.id} variant="outline" className="w-full justify-start text-xs gap-2"
                  onClick={() => assignMutation.mutate({ spaceId: assignDialog!, animalId: a.id })}>
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
