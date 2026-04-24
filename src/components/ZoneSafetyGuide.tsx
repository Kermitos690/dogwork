import { useState } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";
import { ZONE_META, ZONE_CLASSES, type Zone } from "@/lib/zones";

/**
 * Pedagogical safety guide explaining the 3 behavioral zones (green / orange / red)
 * with concrete reading cues and recommended actions for each.
 *
 * Purely presentational — no DB writes, no AI calls, no credit consumption.
 * Used in DayDetail and Training to make the threshold framework explicit
 * for owners before they start a session.
 */

const ZONE_GUIDE: Record<
  Zone,
  { signals: string[]; action: string; safety: string }
> = {
  green: {
    signals: [
      "Respiration calme, oreilles neutres",
      "Capable de revenir vers vous spontanément",
      "Réagit aux récompenses sans s'agiter",
    ],
    action:
      "Continuez la séance comme prévu. Vous pouvez augmenter légèrement la difficulté si la réussite est nette.",
    safety: "Restez court et positif — finissez sur un succès.",
  },
  orange: {
    signals: [
      "Tension visible, fixation, bâillements répétés",
      "Difficulté à revenir au calme entre les répétitions",
      "Aboiements modérés ou traction laisse",
    ],
    action:
      "Réduisez la difficulté : augmentez la distance, baissez le niveau de stimulation, récompensez les retours au calme.",
    safety: "Pas de punition. Faites une pause respiration de 30 secondes.",
  },
  red: {
    signals: [
      "Aboiements intenses, lunge, panique ou figement",
      "Impossible de capter l'attention du chien",
      "Risque de morsure, fuite ou blocage total",
    ],
    action:
      "Arrêtez la séance immédiatement. Éloignez-vous du déclencheur jusqu'à retrouver le calme, puis reprenez plus tard sur un exercice très simple.",
    safety:
      "Sécurité d'abord : ne forcez pas. Notez l'incident dans le journal pour ajuster les prochains jours.",
  },
};

interface Props {
  defaultOpen?: boolean;
}

export function ZoneSafetyGuide({ defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className="rounded-2xl border border-border bg-card overflow-hidden"
      aria-label="Guide des zones d'apprentissage"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
        aria-expanded={open}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary flex-shrink-0">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Lire l'état de votre chien
          </p>
          <p className="text-xs text-muted-foreground">
            Vert / Orange / Rouge — quoi faire selon la zone
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 animate-fade-in">
          {(["green", "orange", "red"] as const).map((zone) => {
            const meta = ZONE_META[zone];
            const guide = ZONE_GUIDE[zone];
            return (
              <article
                key={zone}
                className={`rounded-xl border p-3 space-y-2 ${ZONE_CLASSES[zone]}`}
              >
                <header className="flex items-center gap-2">
                  <span aria-hidden>{meta.emoji}</span>
                  <h3 className="text-sm font-bold">{meta.label}</h3>
                </header>
                <p className="text-xs leading-relaxed text-foreground/90">
                  {meta.description}
                </p>

                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/70">
                    Signaux à observer
                  </p>
                  <ul className="space-y-0.5 text-xs text-foreground/85">
                    {guide.signals.map((s) => (
                      <li key={s} className="flex gap-1.5">
                        <span aria-hidden>•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1 pt-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/70">
                    Que faire
                  </p>
                  <p className="text-xs text-foreground/90 leading-relaxed">
                    {guide.action}
                  </p>
                </div>

                <p className="text-[11px] italic text-foreground/75 pt-1 border-t border-current/15">
                  🛡 {guide.safety}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
