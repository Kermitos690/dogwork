// Minimal stub — the app now uses personalized plans from the database.
// This provides fallback data for the "Standard 28 days" tab in Plan.tsx.

export interface ProgramDay {
  id: number;
  week: number;
  title: string;
  objective: string;
  duration: string;
  difficulty: string;
  exercises: { id: string; name: string; repetitionsTarget: number; timerSuggested?: number; dayId: number }[];
  vigilance?: string;
  validationCriteria?: string;
  functions?: string[];
}

export const WEEK_TITLES = [
  "Fondations — Calme & focus",
  "Contrôle — Gestion des déclencheurs",
  "Consolidation — Généralisation",
  "Autonomie — Maintien & progrès",
];

const WEEK_THEMES: Record<number, string[]> = {
  1: ["Capture du calme", "Regard volontaire", "Assis-attente", "Marche en laisse détendue", "Retour au calme", "Tapis de détente", "Focus en mouvement"],
  2: ["Seuil de distance", "Non-réaction renforcée", "Demi-tour fluide", "Rappel d'urgence", "Observation passive", "Désensibilisation sonore", "Frustration contrôlée"],
  3: ["Croisement à distance", "Marche en ville calme", "Attente en extérieur", "Focus parmi distractions", "Renforcement différentiel", "Passage de stimulus", "Auto-contrôle"],
  4: ["Routine complète", "Scénario réel encadré", "Généralisation lieux", "Maintien du focus long", "Gestion d'imprévu", "Bilan & ajustements", "Consolidation finale"],
};

function buildDays(): ProgramDay[] {
  const days: ProgramDay[] = [];
  for (let w = 1; w <= 4; w++) {
    const themes = WEEK_THEMES[w];
    for (let d = 0; d < 7; d++) {
      const id = (w - 1) * 7 + d + 1;
      days.push({
        id,
        week: w,
        title: themes[d],
        objective: `Objectif jour ${id} — ${WEEK_TITLES[w - 1]}`,
        duration: "15-20 min",
        difficulty: w <= 2 ? "Facile" : "Intermédiaire",
        exercises: [
          { id: `std-${id}-1`, name: themes[d], repetitionsTarget: 5, timerSuggested: 120, dayId: id },
        ],
        vigilance: "Restez sous le seuil de réactivité.",
        validationCriteria: "Exercice réalisé calmement.",
      });
    }
  }
  return days;
}

export const PROGRAM: ProgramDay[] = buildDays();

export function getDayById(id: number): ProgramDay | undefined {
  return PROGRAM.find(d => d.id === id);
}

export function getWeekDays(week: number): ProgramDay[] {
  return PROGRAM.filter(d => d.week === week);
}
