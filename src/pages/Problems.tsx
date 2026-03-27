import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useActiveDog } from "@/hooks/useDogs";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PROBLEMS = [
  "saute_sur_gens", "tire_en_laisse", "rappel_faible", "ignore_non", "ignore_stop",
  "manque_focus", "aboiements", "reactivite_chiens", "reactivite_humains",
  "protection_ressources", "anxiete_separation", "destruction", "peur_bruits",
  "peur_inconnus", "hyperactivite", "frustration", "proprete",
  "difficulte_museliere", "agressivite", "morsure_anterieure", "autres",
];

const PROBLEM_LABELS: Record<string, string> = {
  saute_sur_gens: "Saute sur les gens",
  tire_en_laisse: "Tire en laisse",
  rappel_faible: "Rappel faible",
  ignore_non: "Ignore le non",
  ignore_stop: "Ignore le stop",
  manque_focus: "Manque de focus",
  aboiements: "Aboiements",
  reactivite_chiens: "Réactivité aux chiens",
  reactivite_humains: "Réactivité aux humains",
  protection_ressources: "Protection de ressources",
  anxiete_separation: "Anxiété de séparation",
  destruction: "Destruction",
  peur_bruits: "Peur des bruits",
  peur_inconnus: "Peur des inconnus",
  hyperactivite: "Hyperactivité",
  frustration: "Frustration",
  proprete: "Propreté",
  difficulte_museliere: "Difficulté avec la muselière",
  agressivite: "Agressivité",
  morsure_anterieure: "Morsure antérieure",
  autres: "Autres",
};

type ProblemEntry = {
  problem_key: string;
  intensity: number;
  frequency: string;
  comment: string;
  selected: boolean;
};

export default function Problems() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeDog = useActiveDog();
  const { toast } = useToast();
  const [problems, setProblems] = useState<Record<string, ProblemEntry>>({});

  useEffect(() => {
    const init: Record<string, ProblemEntry> = {};
    PROBLEMS.forEach((key) => {
      init[key] = { problem_key: key, intensity: 0, frequency: "", comment: "", selected: false };
    });

    if (activeDog) {
      supabase.from("dog_problems").select("*").eq("dog_id", activeDog.id).then(({ data }) => {
        if (data) {
          data.forEach((p) => {
            init[p.problem_key] = {
              problem_key: p.problem_key,
              intensity: p.intensity || 0,
              frequency: p.frequency || "",
              comment: p.comment || "",
              selected: true,
            };
          });
        }
        setProblems(init);
      });
    } else {
      setProblems(init);
    }
  }, [activeDog]);

  const toggle = (key: string) => {
    setProblems((p) => ({ ...p, [key]: { ...p[key], selected: !p[key].selected } }));
  };

  const updateProblem = (key: string, field: string, value: any) => {
    setProblems((p) => ({ ...p, [key]: { ...p[key], [field]: value } }));
  };

  const handleSave = async () => {
    if (!activeDog || !user) return;
    try {
      // Delete existing
      await supabase.from("dog_problems").delete().eq("dog_id", activeDog.id);
      // Insert selected
      const selected = Object.values(problems).filter((p) => p.selected);
      if (selected.length > 0) {
        await supabase.from("dog_problems").insert(
          selected.map((p) => ({
            dog_id: activeDog.id,
            user_id: user.id,
            problem_key: p.problem_key,
            intensity: p.intensity || 1,
            frequency: p.frequency || "parfois",
            comment: p.comment,
          }))
        );
      }
      toast({ title: "Problématiques enregistrées" });
      navigate(-1);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  if (!activeDog) return <AppLayout><p className="pt-12 text-center text-muted-foreground">Ajoutez d'abord un chien.</p></AppLayout>;

  return (
    <AppLayout>
      <div className="pb-8 space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Problématiques</h1>
            <p className="text-sm text-muted-foreground">{activeDog.name}</p>
          </div>
        </div>

        <div className="space-y-3">
          {PROBLEMS.map((key) => {
            const p = problems[key];
            if (!p) return null;
            return (
              <Card key={key} className={p.selected ? "ring-1 ring-primary" : ""}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={p.selected} onCheckedChange={() => toggle(key)} />
                    <Label className="text-sm font-medium cursor-pointer" onClick={() => toggle(key)}>
                      {PROBLEM_LABELS[key]}
                    </Label>
                  </div>
                  {p.selected && (
                    <div className="pl-7 space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Intensité</span>
                          <span className="font-medium">{p.intensity}/5</span>
                        </div>
                        <Slider value={[p.intensity]} onValueChange={([v]) => updateProblem(key, "intensity", v)} min={1} max={5} step={1} />
                      </div>
                      <Select value={p.frequency} onValueChange={(v) => updateProblem(key, "frequency", v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Fréquence" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rarement">Rarement</SelectItem>
                          <SelectItem value="parfois">Parfois</SelectItem>
                          <SelectItem value="souvent">Souvent</SelectItem>
                          <SelectItem value="toujours">Toujours</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Commentaire (optionnel)"
                        value={p.comment}
                        onChange={(e) => updateProblem(key, "comment", e.target.value)}
                        className="h-9"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Button onClick={handleSave} className="w-full h-12 text-base gap-2">
          <Save className="h-5 w-5" /> Enregistrer
        </Button>
      </div>
    </AppLayout>
  );
}
