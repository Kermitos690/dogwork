import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useActiveDog } from "@/hooks/useDogs";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Star, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const OBJECTIVES = [
  { key: "marcher_sans_tirer", label: "Marcher sans tirer" },
  { key: "ne_plus_sauter", label: "Ne plus sauter sur les invités" },
  { key: "ignorer_chiens", label: "Ignorer les chiens en promenade" },
  { key: "ecouter_stop", label: "Mieux écouter stop" },
  { key: "ecouter_non", label: "Mieux écouter non" },
  { key: "rappel", label: "Revenir au rappel" },
  { key: "calme_public", label: "Rester calme dans les lieux publics" },
  { key: "gerer_museliere", label: "Mieux gérer la muselière" },
  { key: "diminuer_aboiements", label: "Diminuer les aboiements" },
  { key: "rester_seul", label: "Rester seul plus calmement" },
  { key: "poser_tapis", label: "Se poser sur tapis" },
  { key: "attentif", label: "Être plus attentif à moi" },
];

type ObjState = { selected: boolean; is_priority: boolean };

export default function ObjectivesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeDog = useActiveDog();
  const { toast } = useToast();
  const [objectives, setObjectives] = useState<Record<string, ObjState>>({});

  useEffect(() => {
    const init: Record<string, ObjState> = {};
    OBJECTIVES.forEach((o) => { init[o.key] = { selected: false, is_priority: false }; });

    if (activeDog) {
      supabase.from("dog_objectives").select("*").eq("dog_id", activeDog.id).then(({ data }) => {
        data?.forEach((o) => {
          init[o.objective_key] = { selected: true, is_priority: o.is_priority || false };
        });
        setObjectives(init);
      });
    } else {
      setObjectives(init);
    }
  }, [activeDog]);

  const toggle = (key: string) => {
    setObjectives((o) => ({
      ...o,
      [key]: { ...o[key], selected: !o[key].selected, is_priority: !o[key].selected ? o[key].is_priority : false },
    }));
  };

  const togglePriority = (key: string) => {
    setObjectives((o) => ({ ...o, [key]: { ...o[key], is_priority: !o[key].is_priority } }));
  };

  const handleSave = async () => {
    if (!activeDog || !user) return;
    try {
      await supabase.from("dog_objectives").delete().eq("dog_id", activeDog.id);
      const selected = Object.entries(objectives)
        .filter(([_, v]) => v.selected)
        .map(([key, v]) => ({
          dog_id: activeDog.id,
          user_id: user.id,
          objective_key: key,
          is_priority: v.is_priority,
        }));
      if (selected.length > 0) {
        await supabase.from("dog_objectives").insert(selected);
      }
      toast({ title: "Objectifs enregistrés" });
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
            <h1 className="text-xl font-bold text-foreground">Objectifs</h1>
            <p className="text-sm text-muted-foreground">{activeDog.name}</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Sélectionnez vos objectifs et marquez les plus importants avec ★
        </p>

        <div className="space-y-2">
          {OBJECTIVES.map((obj) => {
            const state = objectives[obj.key];
            if (!state) return null;
            return (
              <Card key={obj.key} className={`card-press ${state.selected ? "ring-1 ring-primary" : ""}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <Checkbox checked={state.selected} onCheckedChange={() => toggle(obj.key)} />
                  <Label className="flex-1 text-sm cursor-pointer" onClick={() => toggle(obj.key)}>
                    {obj.label}
                  </Label>
                  {state.selected && (
                    <button onClick={() => togglePriority(obj.key)} className="p-1">
                      <Star className={`h-4 w-4 ${state.is_priority ? "text-accent fill-accent" : "text-muted-foreground"}`} />
                    </button>
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
