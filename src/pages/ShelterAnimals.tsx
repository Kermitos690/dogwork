import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShelterLayout } from "@/components/ShelterLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { PawPrint, Plus, Search, ArrowLeft, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import type { Database } from "@/integrations/supabase/types";

type ShelterAnimal = Database["public"]["Tables"]["shelter_animals"]["Row"];

const PAGE_SIZE = 40;
const speciesOptions = ["chien", "chat", "reptile", "oiseau", "NAC", "autre"];
const statusOptions = ["arrivée", "quarantaine", "soins", "adoptable", "adopté", "décédé", "transféré"];
const speciesEmoji: Record<string, string> = { chien: "🐕", chat: "🐱", reptile: "🦎", oiseau: "🐦", NAC: "🐹", autre: "🐾" };

const statusColors: Record<string, string> = {
  "arrivée": "bg-blue-500/20 text-blue-400",
  "quarantaine": "bg-amber-500/20 text-amber-400",
  "soins": "bg-orange-500/20 text-orange-400",
  "adoptable": "bg-emerald-500/20 text-emerald-400",
  "adopté": "bg-primary/20 text-primary",
  "décédé": "bg-muted text-muted-foreground",
  "transféré": "bg-secondary text-secondary-foreground",
};

export default function ShelterAnimals() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterSpecies, setFilterSpecies] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    if (searchParams.get("new") === "1") setShowNew(true);
  }, [searchParams]);

  const [form, setForm] = useState({
    name: "", species: "chien", breed: "", sex: "", estimated_age: "",
    description: "", chip_id: "", health_notes: "", behavior_notes: "",
  });

  const { data: animals = [], isLoading } = useQuery({
    queryKey: ["shelter-animals", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("shelter_animals")
        .select("id, name, species, breed, sex, status, photo_url, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as Pick<ShelterAnimal, "id" | "name" | "species" | "breed" | "sex" | "status" | "photo_url" | "created_at">[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("shelter_animals")
        .insert({ ...form, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Animal enregistré ✅" });
      queryClient.invalidateQueries({ queryKey: ["shelter-animals"] });
      setShowNew(false);
      setForm({ name: "", species: "chien", breed: "", sex: "", estimated_age: "", description: "", chip_id: "", health_notes: "", behavior_notes: "" });
    },
    onError: (err: Error) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const filtered = animals.filter((a) => {
    if (filterSpecies !== "all" && a.species !== filterSpecies) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !(a.breed || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <ShelterLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/shelter")} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </motion.button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <PawPrint className="h-5 w-5 text-primary" /> Animaux
            </h1>
            <p className="text-[10px] text-muted-foreground">{animals.length} enregistrés</p>
          </div>
          <Button size="sm" className="gap-1" onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={search} onChange={e => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }} className="pl-9" />
          </div>
          <div className="flex gap-2">
            <Select value={filterSpecies} onValueChange={v => { setFilterSpecies(v); setVisibleCount(PAGE_SIZE); }}>
              <SelectTrigger className="flex-1 text-xs h-8"><SelectValue placeholder="Espèce" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes espèces</SelectItem>
                {speciesOptions.map(s => <SelectItem key={s} value={s}>{speciesEmoji[s]} {s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setVisibleCount(PAGE_SIZE); }}>
              <SelectTrigger className="flex-1 text-xs h-8"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Animals list */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground animate-pulse">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <PawPrint className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucun animal trouvé</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((animal) => (
              <Card key={animal.id} className="cursor-pointer card-press" onClick={() => navigate(`/shelter/animals/${animal.id}`)}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
                    {speciesEmoji[animal.species] || "🐾"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{animal.name}</p>
                    <p className="text-[10px] text-muted-foreground">{animal.species} — {animal.breed || "Race inconnue"} — {animal.sex || "?"}</p>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${statusColors[animal.status] || "bg-secondary text-secondary-foreground"}`}>
                    {animal.status}
                  </span>
                </CardContent>
              </Card>
            ))}
            {hasMore && (
              <Button variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={() => setVisibleCount(c => c + PAGE_SIZE)}>
                <ChevronDown className="h-4 w-4" /> Voir plus ({filtered.length - visibleCount} restants)
              </Button>
            )}
          </div>
        )}

        {/* New animal dialog */}
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouvel animal</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Nom *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nom de l'animal" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Espèce *</Label>
                  <Select value={form.species} onValueChange={v => setForm(f => ({ ...f, species: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {speciesOptions.map(s => <SelectItem key={s} value={s}>{speciesEmoji[s]} {s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Sexe</Label>
                  <Select value={form.sex} onValueChange={v => setForm(f => ({ ...f, sex: v }))}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mâle">Mâle</SelectItem>
                      <SelectItem value="femelle">Femelle</SelectItem>
                      <SelectItem value="inconnu">Inconnu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Race</Label>
                  <Input value={form.breed} onChange={e => setForm(f => ({ ...f, breed: e.target.value }))} placeholder="Ex: Labrador" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Âge estimé</Label>
                  <Input value={form.estimated_age} onChange={e => setForm(f => ({ ...f, estimated_age: e.target.value }))} placeholder="Ex: 3 ans" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">N° de puce / ID</Label>
                <Input value={form.chip_id} onChange={e => setForm(f => ({ ...f, chip_id: e.target.value }))} placeholder="Numéro d'identification" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description de l'animal..." rows={2} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notes santé</Label>
                <Textarea value={form.health_notes} onChange={e => setForm(f => ({ ...f, health_notes: e.target.value }))} placeholder="État de santé, vaccins..." rows={2} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notes comportement</Label>
                <Textarea value={form.behavior_notes} onChange={e => setForm(f => ({ ...f, behavior_notes: e.target.value }))} placeholder="Comportement observé..." rows={2} />
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={!form.name || createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Enregistrement..." : "Enregistrer l'animal"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </ShelterLayout>
  );
}
