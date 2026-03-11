import type { Dog } from "@/hooks/useDogs";
import { EXERCISE_LIBRARY, type LibraryExercise } from "@/data/exerciseLibrary";

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
  severity?: "critical" | "warning" | "info";
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
  contextualTips?: string[];
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
  prerequisitesMissing?: string[];
  priorityExplanation?: string;
}

export interface DogProfile {
  dog: Dog;
  problems: { problem_key: string; intensity: number | null; frequency: string | null }[];
  objectives: { objective_key: string; is_priority: boolean }[];
  evaluation: Record<string, any> | null;
}

export interface AdaptiveSignals {
  avgTension: number;
  avgDogReaction: number;
  avgHumanReaction: number;
  stopScore: number;
  focusScore: number;
  recoveryRate: number;
  incidentCount: number;
  daysCompleted: number;
}

// ===== LEVEL 1 — SECURITY =====
function calculateSecurityLevel(profile: DogProfile): "standard" | "élevé" | "critique" {
  const { dog, problems } = profile;
  const pk = problems.map(p => p.problem_key);

  // Critique: bite history, muzzle required, aggression with intensity >= 3
  if (dog.bite_history) return "critique";
  if (dog.muzzle_required) return "critique";
  if (pk.includes("agressivite") && (problems.find(p => p.problem_key === "agressivite")?.intensity || 0) >= 3) return "critique";
  if (pk.includes("morsure_anterieure")) return "critique";

  // Élevé: high reactivity (>= 4), poor recovery, senior with health issues
  const highReact = problems.some(p =>
    (p.problem_key === "reactivite_chiens" || p.problem_key === "reactivite_humains") && (p.intensity || 0) >= 4
  );
  if (highReact) return "élevé";
  if (dog.recovery_capacity !== null && dog.recovery_capacity <= 2 && pk.some(k => k.includes("reactivite"))) return "élevé";

  const age = getAge(dog);
  if (age !== null && age >= 10 && (dog.joint_pain || dog.heart_problems)) return "élevé";

  return "standard";
}

function getAge(dog: Dog): number | null {
  if (!dog.birth_date) return null;
  return Math.floor((Date.now() - new Date(dog.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function getAgeLabel(age: number | null): string {
  if (age === null) return "adulte";
  if (age < 1) return "chiot";
  if (age >= 8) return "senior";
  return "adulte";
}

// ===== LEVEL 2 — PRIORITY AXES with proper hierarchy =====
function determineAxes(profile: DogProfile): PlanAxis[] {
  const { dog, problems, evaluation } = profile;
  const axes: PlanAxis[] = [];
  const pk = problems.map(p => p.problem_key);

  // Helper to get problem intensity
  const intensity = (key: string) => problems.find(p => p.problem_key === key)?.intensity || 0;
  const freq = (key: string) => problems.find(p => p.problem_key === key)?.frequency;

  // Scoring system for prioritization
  const problemScores: { key: string; axisKey: string; label: string; score: number; reason: string }[] = [];

  // Tier 1: Security / Aggression / Bite — always first if present
  if (dog.bite_history || dog.muzzle_required || pk.includes("agressivite") || pk.includes("morsure_anterieure")) {
    axes.push({
      key: "securite",
      label: "Sécurité et prévention",
      priority: 1,
      reason: dog.bite_history
        ? "Antécédent de morsure. Priorité absolue : focus, stop, demi-tour d'urgence, distance de sécurité. Aucun contact direct."
        : dog.muzzle_required
          ? "Port de muselière requis. Plan conservateur axé sécurité, focus et gestion de distance."
          : "Profil à risque détecté. Cadre de sécurité renforcé avant tout travail exposant.",
    });
  }

  // Tier 2: Reactivity (scored by intensity × frequency weight)
  if (pk.includes("reactivite_chiens")) {
    const i = intensity("reactivite_chiens");
    const fWeight = freq("reactivite_chiens") === "toujours" ? 1.5 : freq("reactivite_chiens") === "souvent" ? 1.2 : 1;
    problemScores.push({
      key: "reactivite_chiens", axisKey: "reactivite_chiens",
      label: "Réactivité aux chiens",
      score: i * fWeight * 10, // high weight for reactivity
      reason: `Réactivité congénères (intensité ${i}/5). Travail sous seuil, désensibilisation progressive, focus et demi-tour d'urgence.`,
    });
  }
  if (pk.includes("reactivite_humains") || pk.includes("peur_inconnus")) {
    const i = Math.max(intensity("reactivite_humains"), intensity("peur_inconnus"));
    problemScores.push({
      key: "reactivite_humains", axisKey: "reactivite_humains",
      label: "Réactivité aux humains",
      score: i * 9,
      reason: `Réactivité humains détectée (intensité ${i}/5). Distance, désensibilisation, aucun contact forcé.`,
    });
  }

  // Tier 3: Leash / Outdoor control
  if (pk.includes("tire_en_laisse")) {
    problemScores.push({
      key: "tire_en_laisse", axisKey: "marche",
      label: "Marche en laisse",
      score: intensity("tire_en_laisse") * 7,
      reason: "Traction en laisse. Marche connectée, changements de direction, récompense laisse souple.",
    });
  }

  // Tier 4: Jumping / Barking / Frustration
  if (pk.includes("saute_sur_gens")) {
    problemScores.push({
      key: "saute_sur_gens", axisKey: "accueil",
      label: "Accueil sans saut",
      score: intensity("saute_sur_gens") * 5,
      reason: "Saut sur humains. 4 pattes au sol, assis avant interaction, retrait de l'attention.",
    });
  }
  if (pk.includes("aboiements")) {
    problemScores.push({
      key: "aboiements", axisKey: "aboiements",
      label: "Gestion des aboiements",
      score: intensity("aboiements") * 5,
      reason: "Aboiements fréquents. Identification des déclencheurs, redirection, focus préventif.",
    });
  }
  if (pk.includes("frustration") || pk.includes("hyperactivite")) {
    const i = Math.max(intensity("frustration"), intensity("hyperactivite"));
    problemScores.push({
      key: "frustration", axisKey: "autocontrole",
      label: "Auto-contrôle et calme",
      score: i * 5,
      reason: "Frustration/hyperactivité. Tapis, attente, renoncement, exercices de calme.",
    });
  }

  // Tier 5: Recall / Politeness / Secondary
  if (pk.includes("rappel_faible")) {
    problemScores.push({
      key: "rappel_faible", axisKey: "rappel",
      label: "Rappel",
      score: intensity("rappel_faible") * 4,
      reason: "Rappel faible. Travail progressif en environnement sécurisé.",
    });
  }
  if (pk.includes("anxiete_separation")) {
    problemScores.push({
      key: "anxiete_separation", axisKey: "solitude",
      label: "Gestion de la solitude",
      score: intensity("anxiete_separation") * 6,
      reason: "Anxiété de séparation. Module spécifique séparé du travail de réactivité.",
    });
  }
  if (pk.includes("ignore_stop")) {
    problemScores.push({
      key: "ignore_stop", axisKey: "stop",
      label: "Travail du stop",
      score: intensity("ignore_stop") * 4,
      reason: "Le chien n'écoute pas le stop. Travail d'arrêt net progressif.",
    });
  }
  if (pk.includes("ignore_non")) {
    problemScores.push({
      key: "ignore_non", axisKey: "non",
      label: "Travail du non",
      score: intensity("ignore_non") * 4,
      reason: "Le chien ignore le non. Renoncement progressif.",
    });
  }
  if (pk.includes("difficulte_museliere") || dog.muzzle_required) {
    problemScores.push({
      key: "museliere", axisKey: "museliere",
      label: "Muselière positive",
      score: dog.muzzle_required ? 30 : 10,
      reason: "Habituation à la muselière nécessaire. Programme positif progressif.",
    });
  }

  // Sort by score descending
  problemScores.sort((a, b) => b.score - a.score);

  // Focus always needed as foundation
  const focusPriority = axes.length + 1;
  axes.push({
    key: "focus",
    label: "Focus et fondations",
    priority: focusPriority,
    reason: "Le focus est la base de tout apprentissage. Sans attention, aucun exercice ne peut fonctionner.",
  });

  // Add problem-based axes
  problemScores.forEach((ps) => {
    if (!axes.some(a => a.key === ps.axisKey)) {
      axes.push({
        key: ps.axisKey,
        label: ps.label,
        priority: axes.length + 1,
        reason: ps.reason,
      });
    }
  });

  // Re-sort by priority
  return axes.sort((a, b) => a.priority - b.priority);
}

// ===== LEVEL 3 — PROFILE ADAPTATION =====
function getProfileModifiers(profile: DogProfile) {
  const { dog } = profile;
  const age = getAge(dog);
  const ageLabel = getAgeLabel(age);
  const isSenior = ageLabel === "senior";
  const isPuppy = ageLabel === "chiot";
  const hasHealth = dog.joint_pain || dog.heart_problems || dog.epilepsy || dog.overweight;
  const isRecentAdoption = dog.origin === "refuge" || (dog.adoption_date && (Date.now() - new Date(dog.adoption_date).getTime()) < 90 * 24 * 60 * 60 * 1000);
  const isHighEnergy = dog.activity_level === "très actif" || dog.activity_level === "actif" || (dog.excitement_level !== null && dog.excitement_level >= 4);
  const isApartment = dog.environment === "appartement";
  const hasPain = dog.joint_pain || !!dog.physical_limitations;

  return { age, ageLabel, isSenior, isPuppy, hasHealth, isRecentAdoption, isHighEnergy, isApartment, hasPain };
}

// ===== LEVEL 4 — PREREQUISITES =====
function checkPrerequisites(profile: DogProfile): string[] {
  const { evaluation, problems } = profile;
  const missing: string[] = [];
  const pk = problems.map(p => p.problem_key);

  if (!evaluation) return ["Évaluation initiale non remplie. Les recommandations seront approximatives."];

  // Before reactivity work: need basic focus
  if (pk.includes("reactivite_chiens") || pk.includes("reactivite_humains")) {
    if (evaluation.responds_to_name === "non") {
      missing.push("Prérequis manquant : le chien ne répond pas à son nom. Le focus de base doit être travaillé avant la désensibilisation.");
    }
  }

  // Before advanced recall: need name response
  if (pk.includes("rappel_faible")) {
    if (evaluation.responds_to_name === "non") {
      missing.push("Prérequis manquant : réponse au nom insuffisante. Travailler d'abord le focus avant le rappel avancé.");
    }
  }

  // Before human management: need basic sit
  if (pk.includes("saute_sur_gens")) {
    if (evaluation.holds_sit === "non") {
      missing.push("Prérequis manquant : l'assis n'est pas acquis. Travailler l'assis avant l'accueil sans saut.");
    }
  }

  // Recovery capacity check for reactivity
  if (pk.includes("reactivite_chiens") && evaluation.recovery_time === "très lente") {
    missing.push("Attention : récupération très lente. Le plan commencera avec des fondations renforcées avant toute exposition.");
  }

  return missing;
}

// ===== PRECAUTIONS =====
function determinePrecautions(profile: DogProfile): PlanPrecaution[] {
  const { dog, problems } = profile;
  const mods = getProfileModifiers(profile);
  const precautions: PlanPrecaution[] = [];

  // Critical safety
  if (dog.bite_history) {
    precautions.push({ type: "safety", severity: "critical", text: "⚠️ Antécédent de morsure : aucune mise en contact direct. Distance minimale 10m. Demi-tour d'urgence maîtrisé obligatoire." });
  }
  if (dog.muzzle_required) {
    precautions.push({ type: "safety", severity: "critical", text: "🔒 Muselière obligatoire en extérieur et en présence d'autres chiens ou humains." });
  }

  // Health
  if (dog.joint_pain) {
    precautions.push({ type: "health", severity: "warning", text: "Douleurs articulaires : exercices physiques réduits, sessions ≤ 10 min, exercices statiques privilégiés." });
  }
  if (dog.heart_problems) {
    precautions.push({ type: "health", severity: "warning", text: "Problèmes cardiaques : éviter l'intensité, surveiller l'essoufflement, sessions courtes." });
  }
  if (dog.epilepsy) {
    precautions.push({ type: "health", severity: "warning", text: "Épilepsie : éviter la surstimulation, environnements calmes, horaires de médication respectés." });
  }
  if (dog.overweight) {
    precautions.push({ type: "health", severity: "info", text: "Surpoids : sessions modérées, friandises allégées, activité physique progressive." });
  }
  if (mods.isSenior) {
    precautions.push({ type: "health", severity: "warning", text: "Chien senior : durée et intensité adaptées. Exercices mentaux privilégiés." });
  }
  if (mods.isPuppy) {
    precautions.push({ type: "health", severity: "info", text: "Chiot : sessions ≤ 5 min. Socialisation positive et fondations uniquement." });
  }

  // Context
  if (mods.isRecentAdoption) {
    precautions.push({ type: "method", severity: "info", text: "Adoption récente : phase d'observation, attentes réduites, construction progressive de la confiance." });
  }

  // High reactivity
  const highReact = problems.some(p =>
    (p.problem_key === "reactivite_chiens" || p.problem_key === "reactivite_humains") && (p.intensity || 0) >= 4
  );
  if (highReact) {
    precautions.push({ type: "safety", severity: "warning", text: "Réactivité élevée : toujours sous seuil. Augmenter la distance au moindre signe de tension." });
  }

  // Always
  precautions.push({ type: "method", severity: "info", text: "Toujours travailler sous seuil. Sessions courtes et fréquentes. Terminer sur une note positive." });

  return precautions;
}

// ===== DURATION =====
function determineDuration(profile: DogProfile): { frequency: string; avgDuration: string } {
  const mods = getProfileModifiers(profile);
  if (mods.isPuppy) return { frequency: "2 à 3 courtes sessions par jour", avgDuration: "5 à 8 min" };
  if (mods.isSenior || mods.hasHealth) return { frequency: "1 à 2 sessions par jour", avgDuration: "8 à 12 min" };
  if (mods.isHighEnergy) return { frequency: "2 sessions par jour", avgDuration: "15 à 20 min" };
  return { frequency: "1 à 2 sessions par jour", avgDuration: "10 à 20 min" };
}

// ===== EXERCISE BUILDER with profile adaptation =====
function buildExercisesForAxis(axisKey: string, week: number, mods: ReturnType<typeof getProfileModifiers>): PlanExercise[] {
  const exercises: PlanExercise[] = [];
  const baseDuration = mods.isSenior || mods.hasPain ? 60 : mods.isPuppy ? 45 : 90;

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

  // For puppies / seniors / painful dogs: fewer reps
  const maxReps = mods.isPuppy ? 8 : mods.isSenior || mods.hasPain ? 10 : 20;

  refs.forEach((ref, i) => {
    const lib = EXERCISE_LIBRARY.find(e => e.id === ref);
    if (!lib) return;

    // Skip physically demanding exercises for painful dogs
    if (mods.hasPain && lib.contraindications.some(c => c.toLowerCase().includes("douleur") || c.toLowerCase().includes("articulaire"))) {
      return;
    }

    const reps = Math.min(8 + weekMultiplier * 3, maxReps);
    const stepsToShow = Math.min(2 + week, lib.steps.length);
    exercises.push({
      id: `plan-${axisKey}-w${week}-${i}`,
      name: lib.name,
      instructions: lib.steps.slice(0, stepsToShow).join(" "),
      repetitions: reps,
      timerSeconds: baseDuration,
      libraryRef: ref,
    });
  });

  return exercises;
}

// ===== CONTEXTUAL TIPS =====
function generateContextualTips(profile: DogProfile, day: PlanDay): string[] {
  const tips: string[] = [];
  const mods = getProfileModifiers(profile);

  if (mods.isSenior) tips.push("Attention à la fatigue physique liée à l'âge. Séance courte recommandée.");
  if (mods.hasPain) tips.push("Douleurs signalées : réduisez l'intensité si votre chien montre des signes d'inconfort.");
  if (profile.dog.muzzle_required) tips.push("N'oubliez pas la muselière avant de sortir.");
  if (profile.dog.bite_history) tips.push("Aucun contact direct. Gardez une grande distance de sécurité.");

  if (day.title.toLowerCase().includes("réactivité") || day.title.toLowerCase().includes("désensibilisation")) {
    tips.push("Aujourd'hui, gardez une grande distance avec les autres chiens.");
    if (profile.dog.recovery_capacity !== null && profile.dog.recovery_capacity <= 2) {
      tips.push("Votre chien récupère lentement : séance courte recommandée.");
    }
  }

  if (mods.isRecentAdoption && day.week <= 1) {
    tips.push("Adoption récente : soyez patient, votre chien a besoin de temps pour s'adapter.");
  }

  return tips.slice(0, 3);
}

// ===== DAY GENERATION =====
function generateDays(axes: PlanAxis[], profile: DogProfile): PlanDay[] {
  const mods = getProfileModifiers(profile);
  const days: PlanDay[] = [];

  // For recent adoptions / very fragile dogs: first week is all foundations
  const foundationWeeks = mods.isRecentAdoption ? 2 : 1;

  for (let week = 1; week <= 4; week++) {
    for (let dayInWeek = 1; dayInWeek <= 7; dayInWeek++) {
      const dayNumber = (week - 1) * 7 + dayInWeek;
      const isReview = dayInWeek === 7;

      // During foundation weeks, focus on basics
      let mainAxis: PlanAxis;
      if (week <= foundationWeeks && !isReview) {
        // Alternate between security (if present) and focus
        const safeAxes = axes.filter(a => a.key === "securite" || a.key === "focus");
        mainAxis = safeAxes[(dayInWeek - 1) % safeAxes.length] || axes[0];
      } else {
        const axisIndex = (dayInWeek - 1) % axes.length;
        mainAxis = axes[axisIndex];
      }

      const exercises = isReview
        ? axes.slice(0, 3).flatMap(a => buildExercisesForAxis(a.key, week, mods).slice(0, 1))
        : buildExercisesForAxis(mainAxis.key, week, mods);

      const duration = mods.isPuppy ? "5 à 8 min"
        : mods.isSenior || mods.hasPain ? "8 à 12 min"
        : week <= 2 ? "10 à 15 min" : "15 à 20 min";

      // Difficulty progression is slower for fragile profiles
      let difficulty: string;
      if (mods.isSenior || mods.hasPain || mods.isRecentAdoption) {
        difficulty = week <= 2 ? "facile" : week <= 3 ? "facile à moyenne" : "moyenne";
      } else {
        difficulty = week <= 1 ? "facile" : week <= 2 ? "facile à moyenne" : week <= 3 ? "moyenne" : "moyenne à élevée";
      }

      const day: PlanDay = {
        dayNumber,
        week,
        title: isReview ? `Bilan semaine ${week}` : mainAxis.label,
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
        contextualTips: [],
      };

      day.contextualTips = generateContextualTips(profile, day);
      days.push(day);
    }
  }

  return days;
}

// ===== PRIORITY EXPLANATION =====
function buildPriorityExplanation(axes: PlanAxis[], profile: DogProfile): string {
  if (axes.length === 0) return "";
  const parts: string[] = [];

  if (axes[0].key === "securite") {
    parts.push("La sécurité est prioritaire car le profil présente des risques (morsure, muselière ou agressivité).");
  }

  const mainAxis = axes.find(a => a.key !== "securite" && a.key !== "focus");
  if (mainAxis) {
    parts.push(`L'axe principal est "${mainAxis.label}" car c'est la problématique la plus impactante au quotidien.`);
  }

  parts.push("Le focus est intégré en permanence car c'est le prérequis de base pour tout apprentissage.");

  return parts.join(" ");
}

// ===== LEVEL 5 — ADAPTIVE SUGGESTIONS =====
export function getAdaptiveSuggestions(signals: AdaptiveSignals): {
  shouldSimplify: boolean;
  shouldProgress: boolean;
  message: string;
  type: "warning" | "success" | "info";
} {
  // Check for difficulty signals
  if (signals.daysCompleted >= 3) {
    if (signals.avgTension >= 4 || signals.avgDogReaction >= 4) {
      return {
        shouldSimplify: true,
        shouldProgress: false,
        message: "Le plan semble trop difficile actuellement. Revenir à une étape plus simple ?",
        type: "warning",
      };
    }
    if (signals.stopScore < 30 && signals.focusScore < 30) {
      return {
        shouldSimplify: true,
        shouldProgress: false,
        message: "Les fondations (stop, focus) sont encore fragiles. Renforcer les bases avant de progresser.",
        type: "warning",
      };
    }
    if (signals.incidentCount >= 3) {
      return {
        shouldSimplify: true,
        shouldProgress: false,
        message: "Plusieurs incidents récents. Augmentez la distance et simplifiez les exercices.",
        type: "warning",
      };
    }
    if (signals.recoveryRate < 40) {
      return {
        shouldSimplify: true,
        shouldProgress: false,
        message: "Récupération lente observée. Réduisez la difficulté et les temps d'exposition.",
        type: "warning",
      };
    }
  }

  // Check for progression signals
  if (signals.daysCompleted >= 5) {
    if (signals.avgTension <= 2 && signals.stopScore >= 70 && signals.focusScore >= 70) {
      return {
        shouldSimplify: false,
        shouldProgress: true,
        message: "Progression stable. Prêt pour l'étape suivante ?",
        type: "success",
      };
    }
    if (signals.avgTension <= 2.5 && signals.avgDogReaction <= 2.5) {
      return {
        shouldSimplify: false,
        shouldProgress: true,
        message: "Bonne évolution ! La tension et la réactivité diminuent.",
        type: "success",
      };
    }
  }

  return {
    shouldSimplify: false,
    shouldProgress: false,
    message: "Continuez le travail en cours. Les données s'accumulent.",
    type: "info",
  };
}

// ===== MAIN GENERATOR =====
export function generatePersonalizedPlan(profile: DogProfile): PersonalizedPlan {
  const securityLevel = calculateSecurityLevel(profile);
  const axes = determineAxes(profile);
  const precautions = determinePrecautions(profile);
  const { frequency, avgDuration } = determineDuration(profile);
  const prerequisitesMissing = checkPrerequisites(profile);
  const days = generateDays(axes, profile);
  const priorityExplanation = buildPriorityExplanation(axes, profile);

  const topAxes = axes.slice(0, 3).map(a => a.label.toLowerCase()).join(", ");
  const summary = securityLevel === "critique"
    ? `Plan sécurisé pour ${profile.dog.name}. Priorité absolue à la sécurité, au focus et à la gestion de distance. Aucune exposition hasardeuse. Axes : ${topAxes}.`
    : securityLevel === "élevé"
      ? `Plan adapté pour ${profile.dog.name} avec précautions renforcées. Progression prudente axée sur ${topAxes}.`
      : `Plan personnalisé pour ${profile.dog.name} axé sur ${topAxes}. Progression sur 4 semaines avec adaptation au profil.`;

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
    prerequisitesMissing,
    priorityExplanation,
  };
}
