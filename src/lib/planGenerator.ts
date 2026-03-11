import type { Dog } from "@/hooks/useDogs";
import { EXERCISE_LIBRARY, type LibraryExercise } from "@/data/exerciseLibrary";

// ===== Problem key mappings (aligned with Problems.tsx keys) =====
const PROBLEM_KEYS_MAP: Record<string, string> = {
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
};

// ===== Types =====
export interface PlanAxis {
  key: string;
  label: string;
  priority: number;
  reason: string;
}

export interface PlanPrecaution {
  type: "safety" | "health" | "method";
  text: string;
}

export interface PlanDay {
  dayNumber: number;
  week: number;
  title: string;
  objective: string;
  duration: string;
  difficulty: string;
  exercises: PlanExercise[];
  vigilance: string;
  validationCriteria: string;
}

export interface PlanExercise {
  id: string;
  name: string;
  instructions: string;
  repetitions: number;
  timerSeconds: number | null;
  libraryRef?: string;
}

export interface PersonalizedPlan {
  id: string;
  dogName: string;
  summary: string;
  axes: PlanAxis[];
  precautions: PlanPrecaution[];
  frequency: string;
  averageDuration: string;
  totalDays: number;
  securityLevel: "standard" | "élevé" | "critique";
  days: PlanDay[];
}

// ===== Plan generation engine =====

export interface DogProfile {
  dog: Dog;
  problems: { problem_key: string; intensity: number | null; frequency: string | null }[];
  objectives: { objective_key: string; is_priority: boolean }[];
  evaluation: Record<string, any> | null;
}

function calculateSecurityLevel(profile: DogProfile): "standard" | "élevé" | "critique" {
  const { dog, problems } = profile;
  if (dog.bite_history) return "critique";
  if (dog.muzzle_required) return "critique";
  const hasAggression = problems.some(p =>
    (p.problem_key === "agressivite" || p.problem_key === "morsure_anterieure") && (p.intensity || 0) >= 3
  );
  if (hasAggression) return "critique";
  const hasHighReactivity = problems.some(p =>
    (p.problem_key === "reactivite_chiens" || p.problem_key === "reactivite_humains") && (p.intensity || 0) >= 4
  );
  if (hasHighReactivity) return "élevé";
  return "standard";
}

function determineAxes(profile: DogProfile): PlanAxis[] {
  const { dog, problems } = profile;
  const axes: PlanAxis[] = [];
  const problemKeys = problems.map(p => p.problem_key);

  // Security first
  if (dog.bite_history || dog.muzzle_required || problemKeys.includes("agressivite") || problemKeys.includes("morsure_anterieure")) {
    axes.push({
      key: "securite",
      label: "Sécurité et prévention",
      priority: 1,
      reason: dog.bite_history
        ? "Antécédent de morsure détecté. Priorité absolue à la sécurité."
        : "Profil nécessitant un cadre de sécurité renforcé.",
    });
  }

  // Focus/base always needed
  axes.push({
    key: "focus",
    label: "Focus et fondations",
    priority: axes.length + 1,
    reason: "Le focus est la base de tout apprentissage. Sans attention, aucun exercice ne peut fonctionner.",
  });

  // Reactivity to dogs
  if (problemKeys.includes("reactivite_chiens")) {
    const intensity = problems.find(p => p.problem_key === "reactivite_chiens")?.intensity || 3;
    axes.push({
      key: "reactivite_chiens",
      label: "Gestion de la réactivité aux chiens",
      priority: intensity >= 4 ? 2 : axes.length + 1,
      reason: `Réactivité congénères détectée (intensité ${intensity}/5). Travail de désensibilisation et gestion de distance.`,
    });
  }

  // Reactivity to humans
  if (problemKeys.includes("reactivite_humains") || problemKeys.includes("peur_inconnus")) {
    axes.push({
      key: "reactivite_humains",
      label: "Gestion de la réactivité aux humains",
      priority: axes.length + 1,
      reason: "Réactivité aux humains détectée. Travail de distance et désensibilisation progressive.",
    });
  }

  // Leash
  if (problemKeys.includes("tire_en_laisse")) {
    axes.push({
      key: "marche",
      label: "Marche en laisse",
      priority: axes.length + 1,
      reason: "Traction en laisse signalée. Travail de marche connectée et changements de direction.",
    });
  }

  // Jumping
  if (problemKeys.includes("saute_sur_gens")) {
    axes.push({
      key: "accueil",
      label: "Accueil sans saut",
      priority: axes.length + 1,
      reason: "Le chien saute sur les gens. Travail de 4 pattes au sol et assis avant interaction.",
    });
  }

  // Separation anxiety
  if (problemKeys.includes("anxiete_separation")) {
    axes.push({
      key: "solitude",
      label: "Gestion de la solitude",
      priority: axes.length + 1,
      reason: "Anxiété de séparation détectée. Module spécifique recommandé, distinct du travail de réactivité.",
    });
  }

  // Barking
  if (problemKeys.includes("aboiements")) {
    axes.push({
      key: "aboiements",
      label: "Gestion des aboiements",
      priority: axes.length + 1,
      reason: "Aboiements signalés. Travail de redirection et gestion des déclencheurs.",
    });
  }

  // Auto-control
  if (problemKeys.includes("frustration") || problemKeys.includes("hyperactivite")) {
    axes.push({
      key: "autocontrole",
      label: "Auto-contrôle et calme",
      priority: axes.length + 1,
      reason: "Besoin d'auto-contrôle identifié. Travail sur tapis, attente, renoncement.",
    });
  }

  // Recall
  if (problemKeys.includes("rappel_faible")) {
    axes.push({
      key: "rappel",
      label: "Rappel",
      priority: axes.length + 1,
      reason: "Rappel faible signalé. Travail de rappel progressif.",
    });
  }

  // Muzzle
  if (problemKeys.includes("difficulte_museliere") || dog.muzzle_required) {
    axes.push({
      key: "museliere",
      label: "Habituation à la muselière",
      priority: axes.length + 1,
      reason: "Port de muselière nécessaire. Programme d'habituation positive.",
    });
  }

  // Stop / Non
  if (problemKeys.includes("ignore_stop")) {
    axes.push({
      key: "stop",
      label: "Travail du stop",
      priority: axes.length + 1,
      reason: "Le chien n'écoute pas le stop. Travail d'arrêt net en marche.",
    });
  }
  if (problemKeys.includes("ignore_non")) {
    axes.push({
      key: "non",
      label: "Travail du non / renoncement",
      priority: axes.length + 1,
      reason: "Le chien ignore le non. Travail de renoncement progressif.",
    });
  }

  return axes.sort((a, b) => a.priority - b.priority);
}

function determinePrecautions(profile: DogProfile): PlanPrecaution[] {
  const { dog, problems } = profile;
  const precautions: PlanPrecaution[] = [];

  // Health precautions
  if (dog.joint_pain) {
    precautions.push({ type: "health", text: "Douleurs articulaires : réduire les exercices physiques, privilégier les exercices statiques, limiter les sessions à 10 minutes." });
  }
  if (dog.heart_problems) {
    precautions.push({ type: "health", text: "Problèmes cardiaques : éviter les exercices intenses, surveiller l'essoufflement, sessions courtes." });
  }
  if (dog.epilepsy) {
    precautions.push({ type: "health", text: "Épilepsie : éviter la surstimulation, préférer les environnements calmes, respecter les horaires de médication." });
  }
  if (dog.overweight) {
    precautions.push({ type: "health", text: "Surpoids : sessions modérées, friandises allégées, intégrer une activité physique progressive." });
  }

  const age = dog.birth_date ? Math.floor((Date.now() - new Date(dog.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;
  if (age && age >= 8) {
    precautions.push({ type: "health", text: "Chien senior : adapter la durée et l'intensité. Privilégier les exercices mentaux aux exercices physiques." });
  }
  if (age && age < 1) {
    precautions.push({ type: "health", text: "Chiot : sessions très courtes (5 minutes max). Focus sur la socialisation positive et les fondations." });
  }

  // Safety precautions
  if (dog.muzzle_required) {
    precautions.push({ type: "safety", text: "Muselière obligatoire lors de tout exercice en extérieur et en présence d'autres chiens ou humains." });
  }
  if (dog.bite_history) {
    precautions.push({ type: "safety", text: "Antécédent de morsure : aucune mise en contact direct. Distance de sécurité minimale 10 mètres. Demi-tour d'urgence maîtrisé." });
  }

  const hasHighReactivity = problems.some(p =>
    (p.problem_key === "reactivite_chiens" || p.problem_key === "reactivite_humains") && (p.intensity || 0) >= 4
  );
  if (hasHighReactivity) {
    precautions.push({ type: "safety", text: "Réactivité élevée : travailler toujours sous seuil. Augmenter la distance au moindre signe de tension." });
  }

  // Method precautions
  precautions.push({ type: "method", text: "Toujours travailler sous seuil de réactivité. Si le chien ne peut plus répondre, augmenter la distance." });
  precautions.push({ type: "method", text: "Sessions courtes et fréquentes plutôt que longues et rares. Toujours terminer sur une note positive." });

  return precautions;
}

function determineDuration(profile: DogProfile): { frequency: string; avgDuration: string } {
  const { dog } = profile;
  const age = dog.birth_date ? Math.floor((Date.now() - new Date(dog.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;

  const hasHealth = dog.joint_pain || dog.heart_problems || dog.epilepsy;
  const isSenior = age ? age >= 8 : false;
  const isPuppy = age ? age < 1 : false;

  if (isPuppy) return { frequency: "2 à 3 courtes sessions par jour", avgDuration: "5 à 8 min" };
  if (isSenior || hasHealth) return { frequency: "1 à 2 sessions par jour", avgDuration: "8 à 12 min" };
  return { frequency: "1 à 2 sessions par jour", avgDuration: "10 à 20 min" };
}

function buildExercisesForAxis(axisKey: string, week: number, isSenior: boolean): PlanExercise[] {
  const exercises: PlanExercise[] = [];
  const duration = isSenior ? 60 : 90;

  const mappings: Record<string, string[]> = {
    securite: ["lib-stop-1", "lib-demitour-1", "lib-focus-1"],
    focus: ["lib-focus-1", "lib-focus-2"],
    reactivite_chiens: ["lib-desens-chiens-1", "lib-focus-1", "lib-demitour-1"],
    reactivite_humains: ["lib-desens-humains-1", "lib-focus-1"],
    marche: ["lib-marche-1", "lib-stop-1"],
    accueil: ["lib-accueil-1", "lib-assis-1"],
    solitude: ["lib-solitude-1", "lib-tapis-1"],
    aboiements: ["lib-aboiement-1", "lib-focus-1"],
    autocontrole: ["lib-auto-1", "lib-tapis-1", "lib-non-1"],
    rappel: ["lib-rappel-1", "lib-focus-1"],
    museliere: ["lib-museliere-1"],
    stop: ["lib-stop-1", "lib-focus-1"],
    non: ["lib-non-1", "lib-auto-1"],
  };

  const refs = mappings[axisKey] || ["lib-focus-1"];
  const weekMultiplier = Math.min(week, 3);

  refs.forEach((ref, i) => {
    const lib = EXERCISE_LIBRARY.find(e => e.id === ref);
    if (!lib) return;
    const reps = Math.min(10 + weekMultiplier * 3, isSenior ? 10 : 20);
    exercises.push({
      id: `plan-${axisKey}-w${week}-${i}`,
      name: lib.name,
      instructions: lib.steps.slice(0, 2 + week).join(" "),
      repetitions: reps,
      timerSeconds: duration,
      libraryRef: ref,
    });
  });

  return exercises;
}

function generateDays(axes: PlanAxis[], profile: DogProfile): PlanDay[] {
  const { dog } = profile;
  const age = dog.birth_date ? Math.floor((Date.now() - new Date(dog.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;
  const isSenior = age ? age >= 8 : false;
  const days: PlanDay[] = [];

  for (let week = 1; week <= 4; week++) {
    for (let dayInWeek = 1; dayInWeek <= 7; dayInWeek++) {
      const dayNumber = (week - 1) * 7 + dayInWeek;

      // Cycle through axes
      const axisIndex = (dayInWeek - 1) % axes.length;
      const mainAxis = axes[axisIndex];

      // Day 7 = review
      const isReview = dayInWeek === 7;

      const exercises = isReview
        ? axes.slice(0, 3).flatMap(a => buildExercisesForAxis(a.key, week, isSenior).slice(0, 1))
        : buildExercisesForAxis(mainAxis.key, week, isSenior);

      const duration = isSenior ? "8 à 12 min" : week <= 2 ? "10 à 15 min" : "15 à 20 min";
      const difficulty = week <= 1 ? "facile" : week <= 2 ? "facile à moyenne" : week <= 3 ? "moyenne" : "moyenne à élevée";

      days.push({
        dayNumber,
        week,
        title: isReview ? `Bilan semaine ${week}` : `${mainAxis.label}`,
        objective: isReview
          ? `Réviser les acquis de la semaine ${week} et consolider les fondations.`
          : `Travailler ${mainAxis.label.toLowerCase()} — ${mainAxis.reason.split(".")[0]}.`,
        duration,
        difficulty,
        exercises,
        vigilance: isReview
          ? "Observer les progrès et noter les points à renforcer."
          : mainAxis.key === "securite"
            ? "Toujours rester à distance de sécurité. Demi-tour si zone rouge."
            : "Travailler sous seuil. Récompenser le calme.",
        validationCriteria: isReview
          ? "Les exercices de base sont réalisables avec un taux de réussite supérieur à 70%."
          : "Le chien répond correctement dans la majorité des répétitions.",
      });
    }
  }

  return days;
}

export function generatePersonalizedPlan(profile: DogProfile): PersonalizedPlan {
  const securityLevel = calculateSecurityLevel(profile);
  const axes = determineAxes(profile);
  const precautions = determinePrecautions(profile);
  const { frequency, avgDuration } = determineDuration(profile);
  const days = generateDays(axes, profile);

  const axesSummary = axes.slice(0, 3).map(a => a.label.toLowerCase()).join(", ");
  const summary = securityLevel === "critique"
    ? `Plan sécurisé pour ${profile.dog.name}. Priorité à la sécurité, au focus et à la gestion de distance. Axes principaux : ${axesSummary}.`
    : `Plan personnalisé pour ${profile.dog.name} axé sur ${axesSummary}. Progression sur 4 semaines.`;

  return {
    id: `plan-${profile.dog.id}-${Date.now()}`,
    dogName: profile.dog.name,
    summary,
    axes,
    precautions,
    frequency,
    averageDuration: avgDuration,
    totalDays: 28,
    securityLevel,
    days,
  };
}
