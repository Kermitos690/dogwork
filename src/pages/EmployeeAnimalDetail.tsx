import { useParams, useNavigate } from "react-router-dom";
import { useShelterEmployeeInfo } from "@/hooks/useCoach";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmployeeLayout } from "@/components/EmployeeLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, PawPrint, Stethoscope, Eye, User, ClipboardCheck, ImageIcon } from "lucide-react";
import { motion } from "framer-motion";

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

export default function EmployeeAnimalDetail() {
  const { animalId } = useParams();
  const navigate = useNavigate();
  const { data: empInfo } = useShelterEmployeeInfo();
  const shelterId = empInfo?.shelter_user_id;

  const { data: animal, isLoading } = useQuery({
    queryKey: ["employee-animal-detail", animalId],
    queryFn: async () => {
      const { data } = await supabase
        .from("shelter_animals")
        .select("*")
        .eq("id", animalId!)
        .eq("user_id", shelterId!)
        .maybeSingle();
      return data as any;
    },
    enabled: !!animalId && !!shelterId,
  });

  const { data: observations = [] } = useQuery({
    queryKey: ["employee-animal-obs", animalId],
    queryFn: async () => {
      const { data } = await supabase
        .from("shelter_observations")
        .select("*")
        .eq("animal_id", animalId!)
        .order("observation_date", { ascending: false });
      return (data as any[]) || [];
    },
    enabled: !!animalId,
  });

  const { data: photos = [] } = useQuery({
    queryKey: ["employee-animal-photos", animalId, shelterId],
    queryFn: async () => {
      const folder = `${shelterId}/${animalId}`;
      const { data, error } = await supabase.storage.from(BUCKET).list(folder, { sortBy: { column: "created_at", order: "desc" } });
      if (error || !data) return [];
      return data
        .filter(f => f.name !== ".emptyFolderPlaceholder")
        .map(f => ({
          name: f.name,
          url: supabase.storage.from(BUCKET).getPublicUrl(`${folder}/${f.name}`).data.publicUrl,
        }));
    },
    enabled: !!animalId && !!shelterId,
  });

  const { data: evaluations = [] } = useQuery({
    queryKey: ["employee-animal-evals", animalId],
    queryFn: async () => {
      const { data } = await supabase
        .from("shelter_animal_evaluations")
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

  if (isLoading) return <EmployeeLayout><div className="pt-14 text-center animate-pulse text-muted-foreground">Chargement...</div></EmployeeLayout>;
  if (!animal) return <EmployeeLayout><div className="pt-14 text-center text-muted-foreground">Animal non trouvé</div></EmployeeLayout>;

  const obsTypeIcon: Record<string, React.ElementType> = { "médical": Stethoscope, "comportement": Eye, "général": PawPrint };

  return (
    <EmployeeLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pt-14 pb-8 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/employee/animals")} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
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
        {photos.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> Photos ({photos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo: any) => (
                  <div key={photo.name} className="rounded-lg overflow-hidden aspect-square bg-secondary">
                    <img src={photo.url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">Sexe :</span> <span className="text-foreground font-medium">{animal.sex || "?"}</span></div>
              <div><span className="text-muted-foreground">Âge :</span> <span className="text-foreground font-medium">{animal.estimated_age || "?"}</span></div>
              <div><span className="text-muted-foreground">Poids :</span> <span className="text-foreground font-medium">{animal.weight_kg ? `${animal.weight_kg} kg` : "?"}</span></div>
              <div><span className="text-muted-foreground">Puce :</span> <span className="text-foreground font-medium">{animal.chip_id || "—"}</span></div>
              <div><span className="text-muted-foreground">Stérilisé :</span> <span className="text-foreground font-medium">{animal.is_sterilized ? "Oui" : "Non"}</span></div>
              <div className="col-span-2"><span className="text-muted-foreground">Arrivé le :</span> <span className="text-foreground font-medium">{new Date(animal.arrival_date).toLocaleDateString("fr-FR")}</span></div>
              {animal.departure_date && (
                <div className="col-span-2"><span className="text-muted-foreground">Départ le :</span> <span className="text-foreground font-medium">{new Date(animal.departure_date).toLocaleDateString("fr-FR")} ({animal.departure_reason})</span></div>
              )}
            </div>
            {animal.description && <p className="text-xs text-muted-foreground mt-2">{animal.description}</p>}
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

        {/* Pre-adoption evaluations */}
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
                  {ev.general_notes && (
                    <p className="text-[11px]"><span className="text-muted-foreground">Notes générales :</span> <span className="text-foreground">{ev.general_notes}</span></p>
                  )}
                  {ev.special_needs && (
                    <p className="text-[11px]"><span className="text-muted-foreground">Besoins spéciaux :</span> <span className="text-foreground">{ev.special_needs}</span></p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Observations (read-only) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Observations ({observations.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
    </EmployeeLayout>
  );
}
