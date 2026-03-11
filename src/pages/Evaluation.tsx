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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Save, ClipboardCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const yesNoQuestions = [
  { key: "responds_to_name", label: "Le chien répond-il à son nom ?" },
  { key: "holds_sit", label: "Tient-il un assis ?" },
  { key: "holds_down", label: "Tient-il un couché ?" },
  { key: "walks_without_pulling", label: "Marche-t-il sans tirer ?" },
  { key: "stays_calm_on_mat", label: "Peut-il rester calme sur un tapis ?" },
  { key: "reacts_to_dogs", label: "Réagit-il aux autres chiens ?" },
  { key: "reacts_to_humans", label: "Réagit-il aux humains ?" },
  { key: "barks_frequently", label: "Aboie-t-il fréquemment ?" },
  { key: "jumps_on_people", label: "Saute-t-il sur les gens ?" },
  { key: "tolerates_frustration", label: "Supporte-t-il la frustration ?" },
  { key: "tolerates_solitude", label: "Supporte-t-il la solitude ?" },
];

type EvalForm = Record<string, any>;

function TriSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      {["oui", "parfois", "non"].map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border ${
            value === opt
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border"
          }`}
        >
          {opt.charAt(0).toUpperCase() + opt.slice(1)}
        </button>
      ))}
    </div>
  );
}

export default function Evaluation() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeDog = useActiveDog();
  const { toast } = useToast();
  const [form, setForm] = useState<EvalForm>({});
  const [existing, setExisting] = useState(false);

  useEffect(() => {
    if (activeDog) {
      supabase
        .from("dog_evaluations")
        .select("*")
        .eq("dog_id", activeDog.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()
        .then(({ data }) => {
          if (data) {
            setForm(data);
            setExisting(true);
          }
        });
    }
  }, [activeDog]);

  const update = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    if (!activeDog || !user) return;
    try {
      if (existing && form.id) {
        const { id, created_at, ...updates } = form;
        await supabase.from("dog_evaluations").update(updates).eq("id", id);
      } else {
        await supabase.from("dog_evaluations").insert({
          ...form,
          dog_id: activeDog.id,
          user_id: user.id,
        });
      }
      toast({ title: "Évaluation enregistrée" });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  if (!activeDog) {
    return <AppLayout><p className="pt-12 text-center text-muted-foreground">Ajoutez d'abord un chien.</p></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="pt-6 pb-8 space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Évaluation initiale</h1>
            <p className="text-sm text-muted-foreground">{activeDog.name}</p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" /> Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {yesNoQuestions.map((q) => (
              <div key={q.key} className="space-y-2">
                <Label className="text-sm font-medium">{q.label}</Label>
                <TriSelect value={form[q.key] || ""} onChange={(v) => update(q.key, v)} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Détails supplémentaires</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>A-t-il déjà mordu ?</Label>
              <div className="flex gap-2">
                {["oui", "non"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => update("has_bitten", opt)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.has_bitten === opt ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border"
                    }`}
                  >
                    {opt === "oui" ? "Oui" : "Non"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Déclencheur principal</Label>
              <Input value={form.main_trigger || ""} onChange={(e) => update("main_trigger", e.target.value)} placeholder="Ex: autres chiens, vélos..." />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Intensité des problèmes</Label>
                <span className="text-sm font-medium">{form.problem_intensity || 0}/5</span>
              </div>
              <Slider value={[form.problem_intensity || 0]} onValueChange={([v]) => update("problem_intensity", v)} min={0} max={5} step={1} />
            </div>
            <div className="space-y-1">
              <Label>Fréquence des problèmes</Label>
              <Select value={form.problem_frequency || ""} onValueChange={(v) => update("problem_frequency", v)}>
                <SelectTrigger><SelectValue placeholder="Fréquence" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rarement">Rarement</SelectItem>
                  <SelectItem value="parfois">Parfois</SelectItem>
                  <SelectItem value="souvent">Souvent</SelectItem>
                  <SelectItem value="toujours">Toujours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Distance de confort (mètres)</Label>
              <Input type="number" value={form.comfort_distance_meters || ""} onChange={(e) => update("comfort_distance_meters", parseFloat(e.target.value) || null)} />
            </div>
            <div className="space-y-1">
              <Label>Temps de récupération</Label>
              <Select value={form.recovery_time || ""} onValueChange={(v) => update("recovery_time", v)}>
                <SelectTrigger><SelectValue placeholder="Récupération" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rapide">Rapide</SelectItem>
                  <SelectItem value="moyenne">Moyenne</SelectItem>
                  <SelectItem value="lente">Lente</SelectItem>
                  <SelectItem value="très lente">Très lente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} className="w-full h-12 text-base gap-2">
          <Save className="h-5 w-5" /> Enregistrer
        </Button>
      </div>
    </AppLayout>
  );
}
