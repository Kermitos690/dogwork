import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCreateDog, useUpdateDog, type Dog } from "@/hooks/useDogs";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type FormData = Partial<Dog>;

function SliderField({ label, value, onChange, max = 5 }: { label: string; value: number | null; onChange: (v: number) => void; max?: number }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <Label className="text-sm">{label}</Label>
        <span className="text-sm font-medium text-foreground">{value || 0}/{max}</span>
      </div>
      <Slider value={[value || 0]} onValueChange={([v]) => onChange(v)} min={0} max={max} step={1} />
    </div>
  );
}

export default function DogProfile() {
  const { dogId } = useParams();
  const isNew = dogId === "new";
  const navigate = useNavigate();
  const { user } = useAuth();
  const createDog = useCreateDog();
  const updateDog = useUpdateDog();
  const { toast } = useToast();
  const [form, setForm] = useState<FormData>({ name: "", is_active: true });
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    if (!isNew && dogId) {
      supabase.from("dogs").select("*").eq("id", dogId).single().then(({ data }) => {
        if (data) setForm(data);
        setLoading(false);
      });
    }
  }, [dogId, isNew]);

  const update = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    if (!form.name?.trim()) {
      toast({ title: "Le nom est requis", variant: "destructive" });
      return;
    }
    try {
      if (isNew) {
        await createDog.mutateAsync(form);
        toast({ title: "Chien ajouté" });
      } else {
        await updateDog.mutateAsync({ id: dogId!, ...form });
        toast({ title: "Profil mis à jour" });
      }
      navigate("/dogs");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  if (loading) return <AppLayout><p className="pt-12 text-center text-muted-foreground">Chargement...</p></AppLayout>;

  return (
    <AppLayout>
      <div className="pt-6 pb-8 space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dogs")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">{isNew ? "Ajouter un chien" : "Profil du chien"}</h1>
        </div>

        {/* Identity */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Identité</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Nom *</Label>
              <Input value={form.name || ""} onChange={(e) => update("name", e.target.value)} placeholder="Nom du chien" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Race</Label>
                <Input value={form.breed || ""} onChange={(e) => update("breed", e.target.value)} placeholder="Race" />
              </div>
              <div className="space-y-1">
                <Label>Sexe</Label>
                <Select value={form.sex || ""} onValueChange={(v) => update("sex", v)}>
                  <SelectTrigger><SelectValue placeholder="Sexe" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Mâle</SelectItem>
                    <SelectItem value="femelle">Femelle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Croisé</Label>
              <Switch checked={form.is_mixed || false} onCheckedChange={(v) => update("is_mixed", v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Stérilisé</Label>
              <Switch checked={form.is_neutered || false} onCheckedChange={(v) => update("is_neutered", v)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Date de naissance</Label>
                <Input type="date" value={form.birth_date || ""} onChange={(e) => update("birth_date", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Poids (kg)</Label>
                <Input type="number" value={form.weight_kg || ""} onChange={(e) => update("weight_kg", parseFloat(e.target.value) || null)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Taille</Label>
                <Select value={form.size || ""} onValueChange={(v) => update("size", v)}>
                  <SelectTrigger><SelectValue placeholder="Taille" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="petit">Petit</SelectItem>
                    <SelectItem value="moyen">Moyen</SelectItem>
                    <SelectItem value="grand">Grand</SelectItem>
                    <SelectItem value="très grand">Très grand</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Niveau d'activité</Label>
                <Select value={form.activity_level || ""} onValueChange={(v) => update("activity_level", v)}>
                  <SelectTrigger><SelectValue placeholder="Activité" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="faible">Faible</SelectItem>
                    <SelectItem value="moyen">Moyen</SelectItem>
                    <SelectItem value="élevé">Élevé</SelectItem>
                    <SelectItem value="très élevé">Très élevé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Context */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Origine et contexte</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Provenance</Label>
                <Select value={form.origin || ""} onValueChange={(v) => update("origin", v)}>
                  <SelectTrigger><SelectValue placeholder="Provenance" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="refuge">Refuge</SelectItem>
                    <SelectItem value="élevage">Élevage</SelectItem>
                    <SelectItem value="particulier">Particulier</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Environnement</Label>
                <Select value={form.environment || ""} onValueChange={(v) => update("environment", v)}>
                  <SelectTrigger><SelectValue placeholder="Lieu" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="appartement">Appartement</SelectItem>
                    <SelectItem value="maison">Maison</SelectItem>
                    <SelectItem value="jardin">Jardin</SelectItem>
                    <SelectItem value="campagne">Campagne</SelectItem>
                    <SelectItem value="ville">Ville</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Date d'adoption</Label>
              <Input type="date" value={form.adoption_date || ""} onChange={(e) => update("adoption_date", e.target.value)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Présence d'enfants</Label>
              <Switch checked={form.has_children || false} onCheckedChange={(v) => update("has_children", v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Présence d'autres animaux</Label>
              <Switch checked={form.has_other_animals || false} onCheckedChange={(v) => update("has_other_animals", v)} />
            </div>
            <div className="space-y-1">
              <Label>Heures seul par jour</Label>
              <Input type="number" value={form.alone_hours_per_day || ""} onChange={(e) => update("alone_hours_per_day", parseFloat(e.target.value) || null)} />
            </div>
          </CardContent>
        </Card>

        {/* Health */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Santé et contraintes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Maladies connues</Label>
              <Input value={form.known_diseases || ""} onChange={(e) => update("known_diseases", e.target.value)} />
            </div>
            {[
              ["joint_pain", "Douleurs articulaires"],
              ["heart_problems", "Problèmes cardiaques"],
              ["epilepsy", "Épilepsie"],
              ["overweight", "Surpoids"],
              ["muzzle_required", "Port de muselière obligatoire"],
              ["bite_history", "Antécédents de morsure"],
            ].map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <Label>{label}</Label>
                <Switch checked={(form as any)[key] || false} onCheckedChange={(v) => update(key, v)} />
              </div>
            ))}
            <div className="space-y-1">
              <Label>Allergies</Label>
              <Input value={form.allergies || ""} onChange={(e) => update("allergies", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Traitements en cours</Label>
              <Input value={form.current_treatments || ""} onChange={(e) => update("current_treatments", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Restrictions vétérinaires</Label>
              <Input value={form.vet_restrictions || ""} onChange={(e) => update("vet_restrictions", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Limitations physiques</Label>
              <Input value={form.physical_limitations || ""} onChange={(e) => update("physical_limitations", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Remarques santé</Label>
              <Textarea value={form.health_notes || ""} onChange={(e) => update("health_notes", e.target.value)} rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Behavior */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Comportement général</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <SliderField label="Niveau d'obéissance" value={form.obedience_level ?? null} onChange={(v) => update("obedience_level", v)} />
            <SliderField label="Sociabilité congénères" value={form.sociability_dogs ?? null} onChange={(v) => update("sociability_dogs", v)} />
            <SliderField label="Sociabilité humains" value={form.sociability_humans ?? null} onChange={(v) => update("sociability_humans", v)} />
            <SliderField label="Niveau d'excitation" value={form.excitement_level ?? null} onChange={(v) => update("excitement_level", v)} />
            <SliderField label="Niveau de frustration" value={form.frustration_level ?? null} onChange={(v) => update("frustration_level", v)} />
            <SliderField label="Capacité de récupération" value={form.recovery_capacity ?? null} onChange={(v) => update("recovery_capacity", v)} />
            <SliderField label="Sensibilité au bruit" value={form.noise_sensitivity ?? null} onChange={(v) => update("noise_sensitivity", v)} />
            <SliderField label="Sensibilité à la solitude" value={form.separation_sensitivity ?? null} onChange={(v) => update("separation_sensitivity", v)} />
          </CardContent>
        </Card>

        <Button onClick={handleSave} className="w-full h-12 text-base gap-2">
          <Save className="h-5 w-5" /> Enregistrer
        </Button>
      </div>
    </AppLayout>
  );
}
