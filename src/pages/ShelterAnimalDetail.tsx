import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShelterLayout } from "@/components/ShelterLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, PawPrint, Plus, Stethoscope, Eye, User, Camera, Trash2, ImageIcon, Heart, ClipboardCheck } from "lucide-react";
import { motion } from "framer-motion";

const statusOptions = ["arrivée", "quarantaine", "soins", "adoptable", "adopté", "décédé", "transféré"];
const observationTypes = ["médical", "comportement", "général"];
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

const BUCKET = "shelter-photos";

export default function ShelterAnimalDetail() {
  const { animalId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newObs, setNewObs] = useState({ type: "général", content: "", employeeId: "" });
  const [uploading, setUploading] = useState(false);
  const [adoptionDialog, setAdoptionDialog] = useState(false);
  const [adopterInfo, setAdopterInfo] = useState({ name: "", email: "" });

  const { data: animal, isLoading } = useQuery({
    queryKey: ["shelter-animal", animalId],
    queryFn: async () => {
      const { data } = await supabase.from("shelter_animals" as any).select("*").eq("id", animalId!).maybeSingle();
      return data as any;
    },
    enabled: !!animalId,
  });

  const { data: observations = [] } = useQuery({
    queryKey: ["shelter-observations", animalId],
    queryFn: async () => {
      const { data } = await supabase
        .from("shelter_observations" as any)
        .select("*")
        .eq("animal_id", animalId!)
        .order("observation_date", { ascending: false });
      return (data as any[]) || [];
    },
    enabled: !!animalId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["shelter-employees-for-obs", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("shelter_employees" as any)
        .select("id, name, role")
        .eq("shelter_user_id", user!.id)
        .eq("is_active", true)
        .order("name");
      return (data as any[]) || [];
    },
    enabled: !!user,
  });

  const { data: photos = [], refetch: refetchPhotos } = useQuery({
    queryKey: ["shelter-animal-photos", animalId],
    queryFn: async () => {
      const folder = `${user!.id}/${animalId}`;
      const { data, error } = await supabase.storage.from(BUCKET).list(folder, { sortBy: { column: "created_at", order: "desc" } });
      if (error || !data) return [];
      return data
        .filter(f => f.name !== ".emptyFolderPlaceholder")
        .map(f => ({
          name: f.name,
          url: supabase.storage.from(BUCKET).getPublicUrl(`${folder}/${f.name}`).data.publicUrl,
        }));
    },
    enabled: !!animalId && !!user,
  });

  // Get pre-adoption evaluations from linked coaches
  const { data: evaluations = [] } = useQuery({
    queryKey: ["shelter-animal-evaluations", animalId],
    queryFn: async () => {
      const { data } = await supabase
        .from("shelter_animal_evaluations" as any)
        .select("*")
        .eq("animal_id", animalId!)
        .order("created_at", { ascending: false });
      if (!data?.length) return [];
      const coachIds = [...new Set((data as any[]).map((e: any) => e.coach_user_id))];
      const { data: profiles } = await supabase
        .from("coach_profiles")
        .select("user_id, display_name")
        .in("user_id", coachIds);
      return (data as any[]).map((e: any) => ({
        ...e,
        coachName: (profiles as any[])?.find((p: any) => p.user_id === e.coach_user_id)?.display_name || "Éducateur",
      }));
    },
    enabled: !!animalId,
  });

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !user || !animalId) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${animalId}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
        if (error) throw error;
      }
      toast({ title: "Photo(s) ajoutée(s) ✅" });
      refetchPhotos();
    } catch (err: any) {
      toast({ title: "Erreur upload", description: err.message, variant: "destructive" });
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSetMainPhoto = async (url: string) => {
    const { error } = await supabase.from("shelter_animals" as any).update({ photo_url: url } as any).eq("id", animalId!);
    if (!error) {
      toast({ title: "Photo principale définie ✅" });
      queryClient.invalidateQueries({ queryKey: ["shelter-animal", animalId] });
    }
  };

  const handleDeletePhoto = async (name: string) => {
    const path = `${user!.id}/${animalId}/${name}`;
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (!error) {
      toast({ title: "Photo supprimée" });
      refetchPhotos();
    }
  };

  const addObservation = useMutation({
    mutationFn: async () => {
      const selectedEmployee = employees.find((e: any) => e.id === newObs.employeeId);
      const { error } = await supabase.from("shelter_observations" as any).insert({
        animal_id: animalId,
        author_id: user!.id,
        observation_type: newObs.type,
        content: newObs.content,
        employee_id: newObs.employeeId || null,
        employee_name: selectedEmployee?.name || "",
      } as any);
      if (error) throw error;
      if (selectedEmployee) {
        await supabase.from("shelter_activity_log" as any).insert({
          shelter_user_id: user!.id,
          employee_id: selectedEmployee.id,
          animal_id: animalId,
          action_type: "observation",
          description: `Observation (${newObs.type}) : ${newObs.content.substring(0, 100)}`,
          employee_name: selectedEmployee.name,
          employee_role: selectedEmployee.role,
        } as any);
      }
    },
    onSuccess: () => {
      toast({ title: "Observation ajoutée ✅" });
      queryClient.invalidateQueries({ queryKey: ["shelter-observations", animalId] });
      setNewObs({ type: "général", content: "", employeeId: newObs.employeeId });
    },
    onError: (err: any) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
  });

  const handleStatusChange = (status: string) => {
    if (status === "adopté") {
      setAdoptionDialog(true);
      return;
    }
    updateStatus.mutate({ status, adopterName: "", adopterEmail: "" });
  };

  const updateStatus = useMutation({
    mutationFn: async ({ status, adopterName, adopterEmail }: { status: string; adopterName: string; adopterEmail: string }) => {
      const update: any = { status };
      if (["adopté", "décédé", "transféré"].includes(status)) {
        update.departure_date = new Date().toISOString().split("T")[0];
        update.departure_reason = status;
      }
      if (status === "adopté") {
        update.adopter_name = adopterName;
        update.adopter_email = adopterEmail;
      }
      const { error } = await supabase.from("shelter_animals" as any).update(update).eq("id", animalId!);
      if (error) throw error;

      // Create initial adoption update record + adopter link
      if (status === "adopté") {
        await supabase.from("adoption_updates" as any).insert({
          animal_id: animalId,
          shelter_user_id: user!.id,
          adopter_name: adopterName,
          adopter_email: adopterEmail,
          message: `${animal?.name} a été adopté par ${adopterName || "un adoptant"}.`,
        } as any);

        // Try to link adopter account if email matches a profile
        if (adopterEmail) {
          try {
            const { data: matchingProfiles } = await (supabase as any)
              .from("profiles")
              .select("user_id")
              .eq("email", adopterEmail.toLowerCase().trim());
            
            if (matchingProfiles && matchingProfiles.length > 0) {
              for (const mp of matchingProfiles as any[]) {
                await supabase.from("adopter_links" as any).upsert({
                  adopter_user_id: mp.user_id,
                  shelter_user_id: user!.id,
                  animal_id: animalId,
                  animal_name: animal?.name || "",
                } as any, { onConflict: "adopter_user_id,animal_id" });
              }
            }
          } catch (linkErr) {
            console.warn("Could not auto-link adopter:", linkErr);
          }
        }
      }

      await supabase.from("shelter_activity_log" as any).insert({
        shelter_user_id: user!.id,
        animal_id: animalId,
        action_type: "status_change",
        description: `Statut changé vers "${status}" pour ${animal?.name}${status === "adopté" && adopterName ? ` — Adoptant : ${adopterName}` : ""}`,
        employee_name: "Admin refuge",
        employee_role: "admin",
      } as any);
    },
    onSuccess: () => {
      toast({ title: "Statut mis à jour ✅" });
      queryClient.invalidateQueries({ queryKey: ["shelter-animal", animalId] });
      queryClient.invalidateQueries({ queryKey: ["shelter-animals"] });
      setAdoptionDialog(false);
      setAdopterInfo({ name: "", email: "" });
    },
    onError: (err: any) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
  });

  if (isLoading) return <ShelterLayout><div className="pt-14 text-center animate-pulse text-muted-foreground">Chargement...</div></ShelterLayout>;
  if (!animal) return <ShelterLayout><div className="pt-14 text-center text-muted-foreground">Animal non trouvé</div></ShelterLayout>;

  const obsTypeIcon: Record<string, React.ElementType> = { "médical": Stethoscope, "comportement": Eye, "général": PawPrint };

  return (
    <ShelterLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pt-14 pb-8 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/shelter/animals")} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </motion.button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <span className="text-lg">{speciesEmoji[animal.species] || "🐾"}</span>
              {animal.name}
            </h1>
            <p className="text-[10px] text-muted-foreground">{animal.species} — {animal.breed || "Race inconnue"}</p>
          </div>
          <Badge className={`${statusColors[animal.status] || ""} border-0`}>{animal.status}</Badge>
        </div>

        {/* Main photo */}
        {animal.photo_url && (
          <div className="rounded-xl overflow-hidden aspect-video bg-secondary">
            <img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Photo gallery */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Photos ({photos.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleUploadPhoto} />
            <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Camera className="h-3 w-3" /> {uploading ? "Upload en cours..." : "Ajouter des photos"}
            </Button>
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo) => (
                  <div key={photo.name} className="relative group rounded-lg overflow-hidden aspect-square bg-secondary">
                    <img src={photo.url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <Button size="sm" variant="secondary" className="h-6 text-[9px] px-1.5" onClick={() => handleSetMainPhoto(photo.url)}>
                        Principal
                      </Button>
                      <Button size="sm" variant="destructive" className="h-6 px-1.5" onClick={() => handleDeletePhoto(photo.name)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info card */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">Sexe :</span> <span className="text-foreground font-medium">{animal.sex || "?"}</span></div>
              <div><span className="text-muted-foreground">Âge :</span> <span className="text-foreground font-medium">{animal.estimated_age || "?"}</span></div>
              <div><span className="text-muted-foreground">Puce :</span> <span className="text-foreground font-medium">{animal.chip_id || "—"}</span></div>
              <div><span className="text-muted-foreground">Stérilisé :</span> <span className="text-foreground font-medium">{animal.is_sterilized ? "Oui" : "Non"}</span></div>
              <div className="col-span-2"><span className="text-muted-foreground">Arrivé le :</span> <span className="text-foreground font-medium">{new Date(animal.arrival_date).toLocaleDateString("fr-FR")}</span></div>
            </div>
            {animal.description && <p className="text-xs text-muted-foreground mt-2">{animal.description}</p>}
          </CardContent>
        </Card>

        {/* Adopter info (if adopted) */}
        {animal.status === "adopté" && (animal.adopter_name || animal.adopter_email) && (
          <Card className="border-primary/30">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                <Heart className="h-4 w-4 text-primary" /> Adoptant
              </p>
              <div className="text-xs space-y-1">
                {animal.adopter_name && <p><span className="text-muted-foreground">Nom :</span> <span className="text-foreground font-medium">{animal.adopter_name}</span></p>}
                {animal.adopter_email && <p><span className="text-muted-foreground">Email :</span> <span className="text-foreground font-medium">{animal.adopter_email}</span></p>}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status change */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-foreground mb-2">Changer le statut</p>
            <div className="flex flex-wrap gap-1.5">
              {statusOptions.map(s => (
                <Button key={s} size="sm" variant={animal.status === s ? "default" : "outline"} className="text-xs h-7" disabled={animal.status === s} onClick={() => handleStatusChange(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Health & behavior notes */}
        {(animal.health_notes || animal.behavior_notes) && (
          <div className="grid grid-cols-1 gap-2">
            {animal.health_notes && (
              <Card><CardContent className="p-3">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1 mb-1"><Stethoscope className="h-3 w-3" /> Santé</p>
                <p className="text-xs text-muted-foreground">{animal.health_notes}</p>
              </CardContent></Card>
            )}
            {animal.behavior_notes && (
              <Card><CardContent className="p-3">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1 mb-1"><Eye className="h-3 w-3" /> Comportement</p>
                <p className="text-xs text-muted-foreground">{animal.behavior_notes}</p>
              </CardContent></Card>
            )}
          </div>
        )}

        {/* Pre-adoption evaluations from coaches */}
        {evaluations.length > 0 && (
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-primary" />
                Évaluations pré-adoption ({evaluations.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {evaluations.map((ev: any) => (
                <div key={ev.id} className="p-3 rounded-lg bg-secondary/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">{ev.coachName}</p>
                    <div className="flex items-center gap-2">
                      {ev.adoption_ready && (
                        <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">Prêt adoption</Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(ev.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <div><span className="text-muted-foreground">Sociab. chiens :</span> <span className="text-foreground font-medium">{ev.sociability_dogs}/10</span></div>
                    <div><span className="text-muted-foreground">Sociab. humains :</span> <span className="text-foreground font-medium">{ev.sociability_humans}/10</span></div>
                    <div><span className="text-muted-foreground">Réactivité :</span> <span className="text-foreground font-medium">{ev.reactivity_level}/10</span></div>
                    <div><span className="text-muted-foreground">Peur :</span> <span className="text-foreground font-medium">{ev.fear_level}/10</span></div>
                    <div><span className="text-muted-foreground">Énergie :</span> <span className="text-foreground font-medium">{ev.energy_level}/10</span></div>
                    <div><span className="text-muted-foreground">Morsure :</span> <span className="text-foreground font-medium">{ev.bite_risk}</span></div>
                  </div>
                  {ev.recommended_profile && (
                    <p className="text-[11px]"><span className="text-muted-foreground">Profil recommandé :</span> <span className="text-foreground">{ev.recommended_profile}</span></p>
                  )}
                  {ev.training_notes && (
                    <p className="text-[11px]"><span className="text-muted-foreground">Notes :</span> <span className="text-foreground">{ev.training_notes}</span></p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Observations */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Observations ({observations.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-lg bg-secondary/30 space-y-2">
              <div className="flex gap-2">
                <Select value={newObs.type} onValueChange={v => setNewObs(o => ({ ...o, type: v }))}>
                  <SelectTrigger className="w-28 text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {observationTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                {employees.length > 0 && (
                  <Select value={newObs.employeeId} onValueChange={v => setNewObs(o => ({ ...o, employeeId: v }))}>
                    <SelectTrigger className="flex-1 text-xs h-8">
                      <SelectValue placeholder="Qui observe ?" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Textarea value={newObs.content} onChange={e => setNewObs(o => ({ ...o, content: e.target.value }))} placeholder="Nouvelle observation..." rows={2} className="text-xs" />
              <Button size="sm" className="w-full gap-1" disabled={!newObs.content || addObservation.isPending} onClick={() => addObservation.mutate()}>
                <Plus className="h-3 w-3" /> Ajouter
              </Button>
            </div>

            {observations.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">Aucune observation</p>
            ) : (
              observations.map((obs: any) => {
                const Icon = obsTypeIcon[obs.observation_type] || PawPrint;
                return (
                  <div key={obs.id} className="p-3 rounded-lg bg-card border border-border/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3 w-3 text-primary" />
                        <span className="text-[10px] font-medium text-primary uppercase">{obs.observation_type}</span>
                        {obs.employee_name && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <User className="h-2.5 w-2.5" /> {obs.employee_name}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{new Date(obs.observation_date).toLocaleDateString("fr-FR")}</span>
                    </div>
                    <p className="text-xs text-foreground">{obs.content}</p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Adoption dialog */}
      <Dialog open={adoptionDialog} onOpenChange={setAdoptionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" /> Confirmer l'adoption
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Enregistrez les informations de l'adoptant pour pouvoir recevoir des nouvelles de {animal?.name}.
            </p>
            <div className="space-y-2">
              <Label htmlFor="adopter-name" className="text-xs">Nom de l'adoptant</Label>
              <Input id="adopter-name" value={adopterInfo.name} onChange={e => setAdopterInfo(p => ({ ...p, name: e.target.value }))} placeholder="Nom complet" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adopter-email" className="text-xs">Email de l'adoptant</Label>
              <Input id="adopter-email" type="email" value={adopterInfo.email} onChange={e => setAdopterInfo(p => ({ ...p, email: e.target.value }))} placeholder="email@exemple.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdoptionDialog(false)}>Annuler</Button>
            <Button
              onClick={() => updateStatus.mutate({ status: "adopté", adopterName: adopterInfo.name, adopterEmail: adopterInfo.email })}
              disabled={updateStatus.isPending}
              className="gap-1"
            >
              <Heart className="h-4 w-4" /> Confirmer l'adoption
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ShelterLayout>
  );
}
