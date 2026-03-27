import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useActiveDog } from "@/hooks/useDogs";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type EvalForm = Record<string, any>;

const STEPS = [
  {
    title: "Obéissance de base",
    subtitle: "Évaluons les fondations",
    questions: [
      { key: "responds_to_name", label: "Répond-il à son nom ?" },
      { key: "holds_sit", label: "Tient-il un assis ?" },
      { key: "holds_down", label: "Tient-il un couché ?" },
    ],
  },
  {
    title: "Vie quotidienne",
    subtitle: "Comportement au quotidien",
    questions: [
      { key: "walks_without_pulling", label: "Marche-t-il sans tirer ?" },
      { key: "stays_calm_on_mat", label: "Reste-t-il calme sur un tapis ?" },
      { key: "tolerates_frustration", label: "Supporte-t-il la frustration ?" },
      { key: "tolerates_solitude", label: "Supporte-t-il la solitude ?" },
    ],
  },
  {
    title: "Réactivité",
    subtitle: "Face aux stimuli extérieurs",
    questions: [
      { key: "reacts_to_dogs", label: "Réagit-il aux autres chiens ?" },
      { key: "reacts_to_humans", label: "Réagit-il aux humains inconnus ?" },
      { key: "barks_frequently", label: "Aboie-t-il fréquemment ?" },
      { key: "jumps_on_people", label: "Saute-t-il sur les gens ?" },
    ],
  },
  {
    title: "Sécurité",
    subtitle: "Points critiques",
    fields: [
      { key: "has_bitten", type: "yesno", label: "A-t-il déjà mordu ?" },
      { key: "main_trigger", type: "text", label: "Déclencheur principal", placeholder: "Ex: autres chiens, vélos..." },
    ],
  },
  {
    title: "Intensité",
    subtitle: "Niveau des problèmes",
    fields: [
      { key: "problem_intensity", type: "slider", label: "Intensité des problèmes", min: 0, max: 5 },
      { key: "problem_frequency", type: "select", label: "Fréquence", options: ["rarement", "parfois", "souvent", "toujours"] },
      { key: "comfort_distance_meters", type: "number", label: "Distance de confort (m)" },
      { key: "recovery_time", type: "select", label: "Récupération", options: ["rapide", "moyenne", "lente", "très lente"] },
    ],
  },
];

function TriSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      {[
        { v: "oui", label: "Oui", color: "bg-success border-success text-success-foreground" },
        { v: "parfois", label: "Parfois", color: "bg-warning border-warning text-warning-foreground" },
        { v: "non", label: "Non", color: "bg-muted border-border text-foreground" },
      ].map((opt) => (
        <button
          key={opt.v}
          onClick={() => onChange(opt.v)}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 border ${
            value === opt.v ? opt.color : "bg-card text-muted-foreground border-border"
          }`}
        >
          {opt.label}
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
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeDog) {
      supabase.from("dog_evaluations").select("*").eq("dog_id", activeDog.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle()
        .then(({ data }) => {
          if (data) { setForm(data); setExisting(true); }
        });
    }
  }, [activeDog]);

  const update = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));
  const totalSteps = STEPS.length;
  const progressPct = Math.round(((step + 1) / totalSteps) * 100);
  const isLast = step === totalSteps - 1;

  const handleSave = async () => {
    if (!activeDog || !user) return;
    setSaving(true);
    try {
      if (existing && form.id) {
        const { id, created_at, ...updates } = form;
        await supabase.from("dog_evaluations").update(updates).eq("id", id);
      } else {
        await supabase.from("dog_evaluations").insert({ ...form, dog_id: activeDog.id, user_id: user.id });
      }
      toast({ title: "✓ Évaluation enregistrée" });
      navigate("/plan");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!activeDog) {
    return <AppLayout><p className="pt-12 text-center text-muted-foreground">Ajoutez d'abord un chien.</p></AppLayout>;
  }

  const currentStep = STEPS[step];

  return (
    <AppLayout>
      <div className="pb-8 space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => step > 0 ? setStep(step - 1) : navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold text-foreground">Évaluation</h1>
              <span className="text-xs text-muted-foreground">{step + 1}/{totalSteps}</span>
            </div>
            <Progress value={progressPct} className="h-1.5 mt-1.5" />
          </div>
        </div>

        {/* Step content */}
        <div className="space-y-2 animate-fade-in" key={step}>
          <h2 className="text-xl font-bold text-foreground">{currentStep.title}</h2>
          <p className="text-sm text-muted-foreground">{currentStep.subtitle}</p>
        </div>

        {/* Questions (tri-select) */}
        {currentStep.questions && (
          <div className="space-y-5">
            {currentStep.questions.map((q) => (
              <Card key={q.key}>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">{q.label}</p>
                  <TriSelect value={form[q.key] || ""} onChange={(v) => update(q.key, v)} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Custom fields */}
        {currentStep.fields && (
          <div className="space-y-4">
            {currentStep.fields.map((field: any) => (
              <Card key={field.key}>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">{field.label}</p>
                  {field.type === "yesno" && (
                    <div className="flex gap-2">
                      {["oui", "non"].map((opt) => (
                        <button key={opt} onClick={() => update(field.key, opt)}
                          className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-all active:scale-95 ${
                            form[field.key] === opt
                              ? opt === "oui" ? "bg-destructive border-destructive text-destructive-foreground" : "bg-success border-success text-success-foreground"
                              : "bg-card text-muted-foreground border-border"
                          }`}
                        >
                          {opt === "oui" ? "Oui" : "Non"}
                        </button>
                      ))}
                    </div>
                  )}
                  {field.type === "text" && (
                    <Input value={form[field.key] || ""} onChange={(e) => update(field.key, e.target.value)} placeholder={field.placeholder} className="rounded-xl" />
                  )}
                  {field.type === "number" && (
                    <Input type="number" value={form[field.key] || ""} onChange={(e) => update(field.key, parseFloat(e.target.value) || null)} className="rounded-xl" />
                  )}
                  {field.type === "slider" && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{field.min}</span>
                        <span className="font-bold text-primary text-base">{form[field.key] || 0}</span>
                        <span>{field.max}</span>
                      </div>
                      <Slider value={[form[field.key] || 0]} onValueChange={([v]) => update(field.key, v)} min={field.min} max={field.max} step={1} />
                    </div>
                  )}
                  {field.type === "select" && (
                    <Select value={form[field.key] || ""} onValueChange={(v) => update(field.key, v)}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Choisir" /></SelectTrigger>
                      <SelectContent>
                        {field.options.map((o: string) => (
                          <SelectItem key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="h-4 w-4" /> Précédent
            </Button>
          )}
          {!isLast ? (
            <Button className="flex-1 h-12 rounded-xl" onClick={() => setStep(step + 1)}>
              Suivant <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button className="flex-1 h-12 rounded-xl" onClick={handleSave} disabled={saving}>
              <CheckCircle2 className="h-5 w-5" /> {saving ? "Enregistrement..." : "Terminer"}
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
