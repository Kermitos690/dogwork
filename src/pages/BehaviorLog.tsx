import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";
import { getBehaviorLog, saveBehaviorLog } from "@/lib/storage";
import type { BehaviorLog as BLog, ResponseLevel, QualityLevel, WalkQuality, RecoverySpeed } from "@/types";

function ToggleGroup({ label, value, options, onChange }: {
  label: string; value: string; options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
              value === o.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground"
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
      <span className="text-sm font-medium">{label}</span>
      <div className="flex gap-2">
        {[{ v: false, l: "Non" }, { v: true, l: "Oui" }].map((o) => (
          <button
            key={String(o.v)}
            onClick={() => onChange(o.v)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
              value === o.v
                ? o.v ? "border-zone-red bg-destructive text-destructive-foreground" : "border-success bg-success text-success-foreground"
                : "border-border bg-card"
            }`}
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );
}

function SliderInput({ label, value, min, max, onChange, labels }: {
  label: string; value: number; min: number; max: number;
  onChange: (v: number) => void; labels?: string[];
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-bold text-primary">{value}/{max}</span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`flex-1 rounded-lg border py-2.5 text-sm font-bold transition-all ${
              n <= value
                ? n <= 2 ? "bg-success border-success text-success-foreground"
                  : n <= 3 ? "bg-warning border-warning text-warning-foreground"
                  : "bg-destructive border-destructive text-destructive-foreground"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            {labels?.[n - min] || n}
          </button>
        ))}
      </div>
    </div>
  );
}

const defaultLog = (dayId: number): BLog => ({
  dayId, jumpOnHuman: false, barking: false,
  stopResponse: "moyen", noResponse: "moyen", focusQuality: "moyen",
  leashWalkQuality: "moyenne", tensionLevel: 3, dogReactionLevel: 3,
  comfortDistanceMeters: 20, recoveryAfterTrigger: "moyenne",
  comments: "", createdAt: new Date().toISOString(),
});

export default function BehaviorLogPage() {
  const { dayId } = useParams();
  const navigate = useNavigate();
  const id = Number(dayId);
  const [log, setLog] = useState<BLog>(defaultLog(id));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const existing = getBehaviorLog(id);
    if (existing) setLog(existing);
  }, [id]);

  const update = <K extends keyof BLog>(key: K, value: BLog[K]) => {
    const updated = { ...log, [key]: value };
    setLog(updated);
    saveBehaviorLog(updated);
    setSaved(false);
  };

  const save = () => {
    saveBehaviorLog(log);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Layout>
      <div className="animate-fade-in space-y-5 pt-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>

        <div>
          <h1 className="text-xl font-bold">Suivi comportemental</h1>
          <p className="text-sm text-muted-foreground">Jour {id}</p>
        </div>

        <div className="space-y-5">
          <BoolToggle label="Saut sur humain" value={log.jumpOnHuman} onChange={(v) => update("jumpOnHuman", v)} />
          <BoolToggle label="Aboiement" value={log.barking} onChange={(v) => update("barking", v)} />

          <ToggleGroup label="Écoute du Stop" value={log.stopResponse}
            options={[{ value: "oui", label: "Oui" }, { value: "moyen", label: "Moyen" }, { value: "non", label: "Non" }]}
            onChange={(v) => update("stopResponse", v as ResponseLevel)} />

          <ToggleGroup label="Écoute du Non" value={log.noResponse}
            options={[{ value: "oui", label: "Oui" }, { value: "moyen", label: "Moyen" }, { value: "non", label: "Non" }]}
            onChange={(v) => update("noResponse", v as ResponseLevel)} />

          <ToggleGroup label="Focus sur moi" value={log.focusQuality}
            options={[{ value: "bon", label: "Bon" }, { value: "moyen", label: "Moyen" }, { value: "faible", label: "Faible" }]}
            onChange={(v) => update("focusQuality", v as QualityLevel)} />

          <ToggleGroup label="Marche en laisse" value={log.leashWalkQuality}
            options={[{ value: "bonne", label: "Bonne" }, { value: "moyenne", label: "Moyenne" }, { value: "difficile", label: "Difficile" }]}
            onChange={(v) => update("leashWalkQuality", v as WalkQuality)} />

          <SliderInput label="Niveau de tension" value={log.tensionLevel} min={1} max={5} onChange={(v) => update("tensionLevel", v)} />
          <SliderInput label="Réaction aux chiens" value={log.dogReactionLevel} min={1} max={5} onChange={(v) => update("dogReactionLevel", v)} />

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Distance de confort (mètres)</label>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => update("comfortDistanceMeters", Math.max(1, log.comfortDistanceMeters - 5))}>
                <span className="text-lg">−</span>
              </Button>
              <span className="text-2xl font-bold tabular-nums w-16 text-center">{log.comfortDistanceMeters}m</span>
              <Button variant="outline" size="icon" onClick={() => update("comfortDistanceMeters", log.comfortDistanceMeters + 5)}>
                <span className="text-lg">+</span>
              </Button>
            </div>
          </div>

          <ToggleGroup label="Récupération après déclencheur" value={log.recoveryAfterTrigger}
            options={[{ value: "rapide", label: "Rapide" }, { value: "moyenne", label: "Moyenne" }, { value: "lente", label: "Lente" }]}
            onChange={(v) => update("recoveryAfterTrigger", v as RecoverySpeed)} />

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Commentaires</label>
            <textarea
              value={log.comments}
              onChange={(e) => update("comments", e.target.value)}
              placeholder="Observations, contexte, incidents..."
              className="w-full rounded-xl border border-border bg-card p-3 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <Button size="xl" className="w-full" onClick={save}>
          <Save className="h-5 w-5" />
          {saved ? "✓ Enregistré !" : "Enregistrer"}
        </Button>
      </div>
    </Layout>
  );
}
