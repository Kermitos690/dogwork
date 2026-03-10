import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { saveSettings } from "@/lib/storage";
import { Dog, Shield, ChevronRight, PartyPopper } from "lucide-react";

interface Props {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [dogName, setDogName] = useState("");
  const [accepted, setAccepted] = useState(false);

  const finish = () => {
    saveSettings({
      dogName: dogName.trim() || "Mon chien",
      startDate: new Date().toISOString().split("T")[0],
      currentDay: 1,
      theme: "light",
      safetyAcknowledged: true,
    });
    onComplete();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-6 animate-slide-up">
        {step === 1 && (
          <>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Dog className="h-10 w-10 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Défi Canin 28 Jours</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Un programme structuré pour développer la neutralité, le contrôle et l'obéissance fonctionnelle de votre chien.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Comment s'appelle votre chien(ne) ?</label>
              <input
                type="text"
                value={dogName}
                onChange={(e) => setDogName(e.target.value)}
                placeholder="Ex: Luna, Rex, Bella..."
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>

            <Button size="xl" className="w-full" onClick={() => setStep(2)}>
              Continuer <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}

        {step === 2 && (
          <div className="animate-slide-up">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-warning/10">
                <Shield className="h-10 w-10 text-warning" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Règles de sécurité</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ce programme est conçu pour les chiens réactifs. La sécurité est la priorité absolue.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {[
                "Muselière obligatoire en public",
                "Aucune rencontre improvisée avec d'autres chiens",
                "Toujours travailler sous le seuil de réactivité",
                "Si le chien est en zone rouge : quitter la situation immédiatement",
                "Ne jamais chercher l'échec, progresser par micro-étapes",
              ].map((rule, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
                  <span className="mt-0.5 text-warning">⚠️</span>
                  <p className="text-sm text-foreground">{rule}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-start gap-3">
              <Checkbox
                id="accept"
                checked={accepted}
                onCheckedChange={(v) => setAccepted(v === true)}
                className="mt-0.5"
              />
              <label htmlFor="accept" className="text-sm text-foreground cursor-pointer leading-relaxed">
                Je comprends et j'accepte ces règles de sécurité. Je m'engage à les respecter tout au long du programme.
              </label>
            </div>

            <Button size="xl" className="mt-6 w-full" onClick={() => setStep(3)} disabled={!accepted}>
              Continuer <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="animate-slide-up flex flex-col items-center text-center space-y-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
              <PartyPopper className="h-10 w-10 text-success" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">Tout est prêt !</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {dogName.trim() || "Votre chien"} et vous êtes prêts à commencer le défi de 28 jours. Courage, cohérence et patience !
              </p>
            </div>

            <div className="w-full rounded-xl border border-border bg-card p-4 text-left space-y-2">
              <p className="text-sm font-medium">Ce qui vous attend :</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>📅 Semaine 1 — Fondations et contrôle</li>
                <li>🐾 Semaine 2 — Auto-contrôle et politesse</li>
                <li>🐕 Semaine 3 — Réactivité congénères</li>
                <li>🌍 Semaine 4 — Généralisation</li>
              </ul>
            </div>

            <Button size="xl" className="w-full animate-pulse-glow" onClick={finish}>
              Commencer le défi 🚀
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
