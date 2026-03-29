import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCreateDog, useUpdateDog, type Dog } from "@/hooks/useDogs";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Save, ChevronDown, ChevronUp, Camera, Search, Building2, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BreedCombobox } from "@/components/BreedCombobox";
import { motion, AnimatePresence } from "framer-motion";

type FormData = Partial<Dog>;

function SliderField({ label, value, onChange, max = 5 }: { label: string; value: number | null; onChange: (v: number) => void; max?: number }) {
  const pct = ((value || 0) / max) * 100;
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <Label className="text-sm text-muted-foreground">{label}</Label>
        <span className="text-sm font-semibold text-foreground">{value || 1}/{max}</span>
      </div>
      <Slider value={[value || 1]} onValueChange={([v]) => onChange(v)} min={1} max={max} step={1} />
    </div>
  );
}

function Section({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="glass-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <CardContent className="space-y-3 pt-0 pb-4 px-4">
              {children}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Shelter adoption flow (only for new dogs)
  const [adoptedFromShelter, setAdoptedFromShelter] = useState(false);
  const [selectedShelterId, setSelectedShelterId] = useState("");
  const [shelterList, setShelterList] = useState<{ user_id: string; name: string }[]>([]);
  const [matchedAnimal, setMatchedAnimal] = useState<any>(null);
  const [chipSearching, setChipSearching] = useState(false);
  const [chipError, setChipError] = useState("");

  useEffect(() => {
    if (!isNew && dogId) {
      supabase.from("dogs").select("*").eq("id", dogId).maybeSingle().then(({ data }) => {
        if (data) {
          setForm(data);
          if (data.photo_url) setPhotoPreview(data.photo_url);
        }
        setLoading(false);
      });
    }
  }, [dogId, isNew]);

  const update = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!form.name?.trim()) {
      toast({ title: "Le nom est requis", variant: "destructive" });
      return;
    }
    try {
      let photo_url = form.photo_url;
      if (photoFile && user) {
        const { uploadDogPhoto } = await import("@/lib/photoUrl");
        const uploadedUrl = await uploadDogPhoto(photoFile, user.id, dogId || Date.now().toString());
        if (uploadedUrl) photo_url = uploadedUrl;
      }

      if (isNew) {
        await createDog.mutateAsync({ ...form, photo_url });
        toast({ title: "Chien ajouté ✓" });
      } else {
        await updateDog.mutateAsync({ id: dogId!, ...form, photo_url });
        toast({ title: "Profil mis à jour ✓" });
      }
      navigate("/dogs");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  if (loading) return <AppLayout><p className="pt-4 text-center text-muted-foreground">Chargement…</p></AppLayout>;

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="pb-8 space-y-4"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dogs")} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">{isNew ? "Nouveau compagnon" : form.name || "Profil"}</h1>
        </div>

        {/* Photo */}
        <div className="flex justify-center">
          <label className="relative cursor-pointer group">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-border bg-card flex items-center justify-center transition-all group-hover:border-primary/40">
              {photoPreview ? (
                <img src={photoPreview} alt="Photo" className="w-full h-full object-cover" />
              ) : (
                <Camera className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <Camera className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </label>
        </div>

        {/* Identity */}
        <Section title="Identité" defaultOpen={true}>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nom *</Label>
            <Input value={form.name || ""} onChange={(e) => update("name", e.target.value)} placeholder="Nom du chien" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">N° puce AMICUS</Label>
            <Input value={form.chip_id || ""} onChange={(e) => {
              const raw = e.target.value.replace(/[^\d\s]/g, "");
              update("chip_id", raw.replace(/\s/g, "").trim() || null);
            }} placeholder="756 0000 0000 000" maxLength={18} className="font-mono tracking-wider" />
            {form.chip_id && !String(form.chip_id).match(/^\d{15}$/) && (
              <p className="text-[11px] text-warning">Format ISO : 15 chiffres exactement.</p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Race</Label>
            <BreedCombobox value={form.breed || ""} onChange={(v) => update("breed", v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Croisé</Label>
            <Switch checked={form.is_mixed || false} onCheckedChange={(v) => update("is_mixed", v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Sexe</Label>
              <Select value={form.sex || ""} onValueChange={(v) => update("sex", v)}>
                <SelectTrigger><SelectValue placeholder="Sexe" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Mâle</SelectItem>
                  <SelectItem value="femelle">Femelle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Taille</Label>
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
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Naissance</Label>
              <Input type="date" value={form.birth_date || ""} onChange={(e) => update("birth_date", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Poids (kg)</Label>
              <Input type="number" value={form.weight_kg || ""} onChange={(e) => update("weight_kg", parseFloat(e.target.value) || null)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Stérilisé</Label>
              <div className="flex items-center h-10">
                <Switch checked={form.is_neutered || false} onCheckedChange={(v) => update("is_neutered", v)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Activité</Label>
              <Select value={form.activity_level || ""} onValueChange={(v) => update("activity_level", v)}>
                <SelectTrigger><SelectValue placeholder="Niveau" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="faible">Faible</SelectItem>
                  <SelectItem value="moyen">Moyen</SelectItem>
                  <SelectItem value="élevé">Élevé</SelectItem>
                  <SelectItem value="très élevé">Très élevé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Section>

        {/* Context */}
        <Section title="Origine et contexte">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Provenance</Label>
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
              <Label className="text-xs text-muted-foreground">Environnement</Label>
              <Select value={form.environment || ""} onValueChange={(v) => update("environment", v)}>
                <SelectTrigger><SelectValue placeholder="Lieu" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="appartement">Appartement</SelectItem>
                  <SelectItem value="maison_jardin">Maison + Jardin</SelectItem>
                  <SelectItem value="rural">Rural</SelectItem>
                  <SelectItem value="urbain">Urbain</SelectItem>
                  <SelectItem value="maison">Maison</SelectItem>
                  <SelectItem value="jardin">Jardin</SelectItem>
                  <SelectItem value="campagne">Campagne</SelectItem>
                  <SelectItem value="ville">Ville</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Date d'adoption</Label>
            <Input type="date" value={form.adoption_date || ""} onChange={(e) => update("adoption_date", e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Présence d'enfants</Label>
            <Switch checked={form.has_children || false} onCheckedChange={(v) => update("has_children", v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Autres animaux</Label>
            <Switch checked={form.has_other_animals || false} onCheckedChange={(v) => update("has_other_animals", v)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Heures seul / jour</Label>
            <Input type="number" value={form.alone_hours_per_day || ""} onChange={(e) => update("alone_hours_per_day", parseFloat(e.target.value) || null)} />
          </div>
        </Section>

        {/* Health */}
        <Section title="Santé et contraintes">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Maladies connues</Label>
            <Input value={form.known_diseases || ""} onChange={(e) => update("known_diseases", e.target.value)} />
          </div>
          {[
            ["joint_pain", "Douleurs articulaires"],
            ["heart_problems", "Problèmes cardiaques"],
            ["epilepsy", "Épilepsie"],
            ["overweight", "Surpoids"],
            ["muzzle_required", "Port de muselière"],
            ["bite_history", "Antécédents de morsure"],
          ].map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <Label className="text-sm">{label}</Label>
              <Switch checked={(form as any)[key] || false} onCheckedChange={(v) => update(key, v)} />
            </div>
          ))}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Allergies</Label>
            <Input value={form.allergies || ""} onChange={(e) => update("allergies", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Traitements en cours</Label>
            <Input value={form.current_treatments || ""} onChange={(e) => update("current_treatments", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Restrictions vétérinaires</Label>
            <Input value={form.vet_restrictions || ""} onChange={(e) => update("vet_restrictions", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Remarques</Label>
            <Textarea value={form.health_notes || ""} onChange={(e) => update("health_notes", e.target.value)} rows={2} />
          </div>
        </Section>

        {/* Behavior */}
        <Section title="Comportement">
          <SliderField label="Obéissance" value={form.obedience_level ?? null} onChange={(v) => update("obedience_level", v)} />
          <SliderField label="Sociabilité congénères" value={form.sociability_dogs ?? null} onChange={(v) => update("sociability_dogs", v)} />
          <SliderField label="Sociabilité humains" value={form.sociability_humans ?? null} onChange={(v) => update("sociability_humans", v)} />
          <SliderField label="Excitation" value={form.excitement_level ?? null} onChange={(v) => update("excitement_level", v)} />
          <SliderField label="Frustration" value={form.frustration_level ?? null} onChange={(v) => update("frustration_level", v)} />
          <SliderField label="Récupération" value={form.recovery_capacity ?? null} onChange={(v) => update("recovery_capacity", v)} />
          <SliderField label="Sensibilité au bruit" value={form.noise_sensitivity ?? null} onChange={(v) => update("noise_sensitivity", v)} />
          <SliderField label="Sensibilité solitude" value={form.separation_sensitivity ?? null} onChange={(v) => update("separation_sensitivity", v)} />
        </Section>

        <motion.div whileTap={{ scale: 0.97 }}>
          <Button onClick={handleSave} className="w-full h-12 text-base gap-2 rounded-xl neon-glow">
            <Save className="h-5 w-5" /> Enregistrer
          </Button>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}
