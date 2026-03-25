import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CoachLayout } from "@/components/CoachLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, PawPrint, Save, ClipboardCheck, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const sliderLabels: Record<string, [string, string]> = {
  sociability_dogs: ["Très craintif", "Très sociable"],
  sociability_humans: ["Très craintif", "Très sociable"],
  reactivity_level: ["Calme", "Très réactif"],
  fear_level: ["Aucune peur", "Très peureux"],
  energy_level: ["Très calme", "Hyperactif"],
};

export default function CoachShelterAnimalEval() {
  const { animalId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  // Get animal details
  const { data: animal } = useQuery({
    queryKey: ["shelter-animal-for-eval", animalId],
    queryFn: async () => {
      const { data } = await supabase
        .from("shelter_animals" as any)
        .select("*")
        .eq("id", animalId!)
        .single();
      return data as any;
    },
    enabled: !!animalId,
  });

  // Get existing evaluation
  const { data: existingEval, isLoading } = useQuery({
    queryKey: ["shelter-animal-eval", animalId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("shelter_animal_evaluations" as any)
        .select("*")
        .eq("animal_id", animalId!)
        .eq("coach_user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as any;
    },
    enabled: !!animalId && !!user,
  });

  const [form, setForm] = useState<any>(null);

  // Initialize form when data loads
  const evalData = form || existingEval || {
    sociability_dogs: 5,
    sociability_humans: 5,
    reactivity_level: 5,
    fear_level: 5,
    energy_level: 5,
    bite_risk: "faible",
    leash_behavior: "",
    obedience_basics: "",
    resource_guarding: "aucun",
    separation_anxiety: "non évalué",
    adoption_ready: false,
    recommended_profile: "",
    special_needs: "",
    training_notes: "",
    general_notes: "",
  };

  const updateField = (key: string, value: any) => {
    setForm({ ...evalData, [key]: value });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user || !animal) throw new Error("Données manquantes");
      const payload = {
        animal_id: animalId,
        shelter_user_id: animal.user_id,
        coach_user_id: user.id,
        sociability_dogs: evalData.sociability_dogs,
        sociability_humans: evalData.sociability_humans,
        reactivity_level: evalData.reactivity_level,
        fear_level: evalData.fear_level,
        energy_level: evalData.energy_level,
        bite_risk: evalData.bite_risk,
        leash_behavior: evalData.leash_behavior,
        obedience_basics: evalData.obedience_basics,
        resource_guarding: evalData.resource_guarding,
        separation_anxiety: evalData.separation_anxiety,
        adoption_ready: evalData.adoption_ready,
        recommended_profile: evalData.recommended_profile,
        special_needs: evalData.special_needs,
        training_notes: evalData.training_notes,
        general_notes: evalData.general_notes,
      };

      if (existingEval?.id) {
        const { error } = await supabase
          .from("shelter_animal_evaluations" as any)
          .update(payload as any)
          .eq("id", existingEval.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("shelter_animal_evaluations" as any)
          .insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shelter-animal-eval"] });
      queryClient.invalidateQueries({ queryKey: ["coach-shelter-eval-counts"] });
      toast.success("Évaluation enregistrée");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!existingEval?.id) return;
      const { error } = await supabase
        .from("shelter_animal_evaluations" as any)
        .delete()
        .eq("id", existingEval.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shelter-animal-eval"] });
      queryClient.invalidateQueries({ queryKey: ["coach-shelter-eval-counts"] });
      toast.success("Évaluation supprimée");
      navigate(-1);
    },
  });

  if (isLoading) {
    return <CoachLayout><div className="p-4 text-center text-muted-foreground">Chargement...</div></CoachLayout>;
  }

  return (
    <CoachLayout>
      <div className="p-4 pb-24 space-y-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-3 gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Button>

          {animal && (
            <div className="flex items-center gap-3 mb-4">
              {animal.photo_url ? (
                <img src={animal.photo_url} alt={animal.name} className="h-14 w-14 rounded-xl object-cover" />
              ) : (
                <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center">
                  <PawPrint className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <h1 className="text-lg font-bold text-foreground">{animal.name}</h1>
                <p className="text-xs text-muted-foreground">
                  {animal.breed || animal.species} • {animal.sex || ""} • {animal.estimated_age || ""}
                </p>
              </div>
            </div>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-primary" />
                Évaluation comportementale pré-adoption
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Behavioral sliders */}
              {Object.entries(sliderLabels).map(([key, [minLabel, maxLabel]]) => (
                <div key={key} className="space-y-2">
                  <Label className="text-sm capitalize">{key.replace(/_/g, " ")}</Label>
                  <Slider
                    min={1}
                    max={10}
                    step={1}
                    value={[evalData[key] || 5]}
                    onValueChange={([v]) => updateField(key, v)}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{minLabel}</span>
                    <span className="font-medium text-foreground">{evalData[key]}/10</span>
                    <span>{maxLabel}</span>
                  </div>
                </div>
              ))}

              {/* Select fields */}
              <div className="space-y-2">
                <Label>Risque de morsure</Label>
                <Select value={evalData.bite_risk} onValueChange={(v) => updateField("bite_risk", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="faible">Faible</SelectItem>
                    <SelectItem value="modéré">Modéré</SelectItem>
                    <SelectItem value="élevé">Élevé</SelectItem>
                    <SelectItem value="non évalué">Non évalué</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Protection de ressources</Label>
                <Select value={evalData.resource_guarding} onValueChange={(v) => updateField("resource_guarding", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aucun">Aucun</SelectItem>
                    <SelectItem value="léger">Léger</SelectItem>
                    <SelectItem value="modéré">Modéré</SelectItem>
                    <SelectItem value="sévère">Sévère</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Anxiété de séparation</Label>
                <Select value={evalData.separation_anxiety} onValueChange={(v) => updateField("separation_anxiety", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="non évalué">Non évalué</SelectItem>
                    <SelectItem value="aucune">Aucune</SelectItem>
                    <SelectItem value="légère">Légère</SelectItem>
                    <SelectItem value="modérée">Modérée</SelectItem>
                    <SelectItem value="sévère">Sévère</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Text fields */}
              <div className="space-y-2">
                <Label>Comportement en laisse</Label>
                <Textarea
                  placeholder="Tire, marche au pied, réactif aux stimuli..."
                  value={evalData.leash_behavior}
                  onChange={(e) => updateField("leash_behavior", e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Bases d'obéissance</Label>
                <Textarea
                  placeholder="Assis, couché, rappel, reste..."
                  value={evalData.obedience_basics}
                  onChange={(e) => updateField("obedience_basics", e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes d'entraînement</Label>
                <Textarea
                  placeholder="Recommandations de travail pour l'adoptant..."
                  value={evalData.training_notes}
                  onChange={(e) => updateField("training_notes", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Besoins spéciaux</Label>
                <Textarea
                  placeholder="Régime particulier, traitement, environnement requis..."
                  value={evalData.special_needs}
                  onChange={(e) => updateField("special_needs", e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Profil d'adoptant recommandé</Label>
                <Input
                  placeholder="Ex: famille avec jardin, personne expérimentée..."
                  value={evalData.recommended_profile}
                  onChange={(e) => updateField("recommended_profile", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes générales</Label>
                <Textarea
                  placeholder="Observations complémentaires..."
                  value={evalData.general_notes}
                  onChange={(e) => updateField("general_notes", e.target.value)}
                  rows={3}
                />
              </div>

              {/* Adoption readiness */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <Label className="text-sm font-medium">Prêt pour l'adoption</Label>
                  <p className="text-xs text-muted-foreground">L'animal est jugé apte à l'adoption</p>
                </div>
                <Switch
                  checked={evalData.adoption_ready}
                  onCheckedChange={(v) => updateField("adoption_ready", v)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-1.5"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                >
                  <Save className="h-4 w-4" />
                  {saveMutation.isPending ? "Enregistrement..." : existingEval ? "Mettre à jour" : "Enregistrer"}
                </Button>
                {existingEval && (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </CoachLayout>
  );
}
