import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { useActiveDog } from "@/hooks/useDogs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

function ToggleGroup({ label, value, options, onChange }: {
  label: string; value: string; options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
              value === o.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BoolToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex gap-2">
        {[{ v: false, l: "Non" }, { v: true, l: "Oui" }].map((o) => (
          <button
            key={String(o.v)}
            onClick={() => onChange(o.v)}
            className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
              value === o.v
                ? o.v ? "border-destructive bg-destructive text-destructive-foreground" : "border-success bg-success text-success-foreground"
                : "border-border bg-card text-foreground"
            }`}
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );
}

function SliderInput({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm font-bold text-primary">{value}/{max}</span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`flex-1 rounded-lg border py-3 text-sm font-bold transition-all ${
              n <= value
                ? n <= 2 ? "bg-success border-success text-success-foreground"
                  : n <= 3 ? "bg-warning border-warning text-warning-foreground"
                  : "bg-destructive border-destructive text-destructive-foreground"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

type LogData = {
  jump_on_human: boolean;
  barking: boolean;
  stop_response: string;
  no_response: string;
  focus_quality: string;
  leash_walk_quality: string;
  tension_level: number;
  dog_reaction_level: number;
  comfort_distance_meters: number;
  recovery_after_trigger: string;
  comments: string;
};

const defaultLog: LogData = {
  jump_on_human: false, barking: false,
  stop_response: "moyen", no_response: "moyen", focus_quality: "moyen",
  leash_walk_quality: "moyenne", tension_level: 3, dog_reaction_level: 3,
  comfort_distance_meters: 20, recovery_after_trigger: "moyenne", comments: "",
};

export default function BehaviorLogPage() {
  const { dayId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeDog = useActiveDog();
  const id = Number(dayId);
  const [log, setLog] = useState<LogData>(defaultLog);
  const [saved, setSaved] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    if (activeDog) {
      supabase.from("behavior_logs").select("*").eq("dog_id", activeDog.id).eq("day_id", id).single().then(({ data }) => {
        if (data) {
          setExistingId(data.id);
          setLog({
            jump_on_human: data.jump_on_human || false,
            barking: data.barking || false,
            stop_response: data.stop_response || "moyen",
            no_response: data.no_response || "moyen",
            focus_quality: data.focus_quality || "moyen",
            leash_walk_quality: data.leash_walk_quality || "moyenne",
            tension_level: data.tension_level || 3,
            dog_reaction_level: data.dog_reaction_level || 3,
            comfort_distance_meters: data.comfort_distance_meters || 20,
            recovery_after_trigger: data.recovery_after_trigger || "moyenne",
            comments: data.comments || "",
          });
        }
      });
    }
  }, [activeDog, id]);

  const update = (key: keyof LogData, value: any) => {
    setLog((l) => ({ ...l, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    if (!activeDog || !user) return;
    if (existingId) {
      await supabase.from("behavior_logs").update(log).eq("id", existingId);
    } else {
      const { data } = await supabase.from("behavior_logs").insert({
        ...log, dog_id: activeDog.id, user_id: user.id, day_id: id,
      }).select().single();
      if (data) setExistingId(data.id);
    }
    setSaved(true);
    toast({ title: "✓ Suivi enregistré", description: `Jour ${id} — ${activeDog.name}` });
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-5 pt-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>

        <div>
          <h1 className="text-xl font-bold text-foreground">Suivi comportemental</h1>
          <p className="text-sm text-muted-foreground">Jour {id}{activeDog ? ` — ${activeDog.name}` : ""}</p>
        </div>

        <div className="space-y-5">
          {/* Boolean toggles */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Comportements observés</p>
            <BoolToggle label="Saut sur humain" value={log.jump_on_human} onChange={(v) => update("jump_on_human", v)} />
            <BoolToggle label="Aboiement" value={log.barking} onChange={(v) => update("barking", v)} />
          </div>

          {/* Quality toggles */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Réponses aux signaux</p>
            <ToggleGroup label="Écoute du stop" value={log.stop_response}
              options={[{ value: "oui", label: "Oui" }, { value: "moyen", label: "Moyen" }, { value: "non", label: "Non" }]}
              onChange={(v) => update("stop_response", v)} />
            <ToggleGroup label="Écoute du non" value={log.no_response}
              options={[{ value: "oui", label: "Oui" }, { value: "moyen", label: "Moyen" }, { value: "non", label: "Non" }]}
              onChange={(v) => update("no_response", v)} />
            <ToggleGroup label="Focus sur moi" value={log.focus_quality}
              options={[{ value: "bon", label: "Bon" }, { value: "moyen", label: "Moyen" }, { value: "faible", label: "Faible" }]}
              onChange={(v) => update("focus_quality", v)} />
            <ToggleGroup label="Marche en laisse" value={log.leash_walk_quality}
              options={[{ value: "bonne", label: "Bonne" }, { value: "moyenne", label: "Moyenne" }, { value: "difficile", label: "Difficile" }]}
              onChange={(v) => update("leash_walk_quality", v)} />
          </div>

          {/* Scales */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Niveaux</p>
            <SliderInput label="Niveau de tension" value={log.tension_level} min={1} max={5} onChange={(v) => update("tension_level", v)} />
            <SliderInput label="Réaction aux chiens" value={log.dog_reaction_level} min={1} max={5} onChange={(v) => update("dog_reaction_level", v)} />
          </div>

          {/* Distance */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <label className="text-sm font-medium text-foreground">Distance de confort (mètres)</label>
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={() => update("comfort_distance_meters", Math.max(1, log.comfort_distance_meters - 5))}>
                <span className="text-lg">−</span>
              </Button>
              <span className="text-3xl font-bold tabular-nums text-foreground w-20 text-center">{log.comfort_distance_meters}m</span>
              <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={() => update("comfort_distance_meters", log.comfort_distance_meters + 5)}>
                <span className="text-lg">+</span>
              </Button>
            </div>
          </div>

          {/* Recovery */}
          <div className="rounded-xl border border-border bg-card p-4">
            <ToggleGroup label="Récupération après déclencheur" value={log.recovery_after_trigger}
              options={[{ value: "rapide", label: "Rapide" }, { value: "moyenne", label: "Moyenne" }, { value: "lente", label: "Lente" }]}
              onChange={(v) => update("recovery_after_trigger", v)} />
          </div>

          {/* Comments */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Commentaires</label>
            <textarea
              value={log.comments}
              onChange={(e) => update("comments", e.target.value)}
              placeholder="Observations, contexte, incidents, déclencheurs rencontrés..."
              className="w-full rounded-xl border border-border bg-card p-3 text-sm min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            />
          </div>
        </div>

        <Button className="w-full h-14 text-base font-semibold" onClick={save}>
          {saved ? <><CheckCircle2 className="h-5 w-5" /> Enregistré !</> : <><Save className="h-5 w-5" /> Enregistrer</>}
        </Button>
      </div>
    </AppLayout>
  );
}
