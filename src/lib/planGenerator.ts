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
  slug: string;
  description: string;
  instructions: string;
  repetitions: number;
  timerSeconds: number | null;
  tutorialSteps?: { title: string; description: string; tip?: string }[];
  validationProtocol?: string;
  successCriteria?: string;
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

// ===== AXIS → REAL EXERCISE SLUGS MAPPING =====
// Maps each training axis to real exercise slugs from the database
const AXIS_EXERCISE_SLUGS: Record<string, string[][]> = {
  // [week1 slugs, week2 slugs, week3 slugs, week4 slugs]
  securite: [
    ["stop-urgence", "demi-tour", "regarde-moi"],
    ["stop-urgence", "u-turn", "regarde-moi", "distance-confort"],
    ["stop-urgence", "u-turn", "zone-tampon", "pas-bouger"],
    ["stop-urgence", "u-turn", "zone-tampon", "passage-en-arc"],
  ],
  focus: [
    ["regarde-moi", "reponse-au-nom", "touche-main"],
    ["regarde-moi", "reponse-au-nom", "touche-main", "capturing-calme"],
    ["regarde-moi", "focus-pres-stimulus", "touche-main", "engage-disengage"],
    ["focus-pres-stimulus", "engage-disengage", "regarde-moi", "lat-look-at-that"],
  ],
  reactivite_chiens: [
    ["distance-confort", "regarde-moi", "u-turn"],
    ["counter-conditioning", "engage-disengage", "u-turn", "zone-tampon"],
    ["lat-look-at-that", "marche-parallele", "bat-training", "passage-en-arc"],
    ["bat-training", "marche-parallele", "focus-pres-stimulus", "pattern-games"],
  ],
  reactivite_humains: [
    ["distance-confort", "regarde-moi", "u-turn"],
    ["counter-conditioning", "engage-disengage", "croisement-pieton"],
    ["lat-look-at-that", "rencontre-humains", "passage-en-arc"],
    ["bat-training", "manipulations-douces", "focus-pres-stimulus"],
  ],
  marche: [
    ["marche-sans-tirer", "demi-tour", "arret-spontane"],
    ["marche-sans-tirer", "changement-rythme", "ignore-nourriture-sol"],
    ["marche-relaxation", "contournement-obstacles", "attente-au-pied"],
    ["marche-en-ville", "marche-foret", "marche-relaxation"],
  ],
  accueil: [
    ["assis-base", "assis-automatique", "regarde-moi"],
    ["assis-automatique", "gerer-visiteurs", "reste-assis"],
    ["gerer-visiteurs", "joie-moderee", "reste-assis"],
    ["gerer-visiteurs", "calme-pendant-activites", "assis-automatique"],
  ],
  solitude: [
    ["solitude-10s", "solitude-1min", "tapis-calme"],
    ["solitude-5min", "porte-fermee", "detachement-piece"],
    ["solitude-15min", "ritual-depart", "occupation-seul"],
    ["solitude-30min", "ignorer-depart", "ritual-retour"],
  ],
  aboiements: [
    ["regarde-moi", "capturing-calme", "reponse-au-nom"],
    ["jeu-interruptible", "renoncement-friandise", "regarde-moi"],
    ["gerer-bruit-soudain", "gestion-fenetre", "tapis-calme"],
    ["aboie-sur-commande", "calme-exterieur", "pattern-games"],
  ],
  autocontrole: [
    ["tapis-calme", "zen-game", "attente-recompense"],
    ["frustration-porte", "renoncement-friandise", "jouet-interdit"],
    ["frustration-barriere", "jeu-interruptible", "calm-apres-jeu"],
    ["excitation-controlée", "transition-energie", "calme-pendant-activites"],
  ],
  rappel: [
    ["rappel-base", "reponse-au-nom", "touche-main"],
    ["rappel-longe", "rappel-jeu", "rappel-entre-2-personnes"],
    ["rappel-distractions", "rappel-course", "rappel-reward-jackpot"],
    ["rappel-avec-chiens", "rappel-sifflet", "rappel-sans-friandise"],
  ],
  museliere: [
    ["desens-museliere", "touche-main", "capturing-calme"],
    ["desens-museliere", "marche-sans-tirer", "regarde-moi"],
    ["desens-museliere", "marche-relaxation", "tapis-calme"],
    ["desens-museliere", "marche-en-ville", "calme-exterieur"],
  ],
  stop: [
    ["stop-urgence", "regarde-moi", "pas-bouger"],
    ["stop-urgence", "stop-en-marche", "reste-assis"],
    ["stop-urgence", "stop-en-marche", "reste-distractions"],
    ["stop-urgence", "stop-en-marche", "couche-a-distance"],
  ],
  non: [
    ["laisse-ca", "renoncement-friandise", "regarde-moi"],
    ["laisse-ca", "jouet-interdit", "pas-toucher-objet"],
    ["laisse-ca", "ignore-nourriture-sol", "zen-game"],
    ["laisse-ca", "jouet-interdit", "resilience-echec"],
  ],
};

// Exercises lookup: DB exercises take priority, fallback to local library
let _dbExercises: Record<string, any> = {};

export function setDbExercises(exercises: { slug: string; name: string; description?: string | null; objective?: string | null; summary?: string | null; steps?: any; tutorial_steps?: any; success_criteria?: string | null; contraindications?: any; id: string; dedication?: string | null; short_instruction?: string | null }[]) {
  _dbExercises = {};
  exercises.forEach(e => { _dbExercises[e.slug] = e; });
}

function findBySlug(slug: string): LibraryExercise | undefined {
  // Try DB exercises first
  const dbEx = _dbExercises[slug];
  if (dbEx) {
    // Convert DB exercise to LibraryExercise-compatible shape
    const steps = Array.isArray(dbEx.steps) ? dbEx.steps.map((s: any) => typeof s === 'string' ? s : s.description || s.text || String(s)) : [];
    const tutorialSteps = Array.isArray(dbEx.tutorial_steps) ? dbEx.tutorial_steps.map((ts: any) => ({
      title: ts.title || '',
      description: ts.description || '',
      tip: ts.tip || '',
    })) : [];
    const contraindications = Array.isArray(dbEx.contraindications) ? dbEx.contraindications.map((c: any) => typeof c === 'string' ? c : c.text || String(c)) : [];

    return {
      id: dbEx.id,
      slug: dbEx.slug,
      name: dbEx.name,
      shortTitle: dbEx.name,
      category: '',
      categoryIcon: '',
      objective: dbEx.objective || '',
      dedication: dbEx.dedication || '',
      targetProblems: [],
      secondaryBenefits: [],
      prerequisites: [],
      level: 'débutant',
      exerciseType: 'fondation',
      duration: '5 min',
      repetitions: '3-5 fois',
      frequency: '1x/jour',
      material: [],
      environment: 'tous',
      intensityLevel: 1,
      cognitiveLoad: 1,
      physicalLoad: 1,
      summary: dbEx.summary || dbEx.description || dbEx.objective || '',
      shortInstruction: dbEx.short_instruction || '',
      steps,
      tutorialSteps,
      mistakes: [],
      vigilance: '',
      successCriteria: dbEx.success_criteria || '',
      stopCriteria: '',
      adaptations: [],
      progressionNext: '',
      regressionSimplified: '',
      ageRecommendation: 'tous',
      suitableProfiles: [],
      contraindications,
      precautions: [],
      healthPrecautions: [],
      compatibleReactivity: false,
      compatibleSenior: false,
      compatiblePuppy: false,
      compatibleMuzzle: false,
    } as LibraryExercise;
  }
  // Fallback to local library
  return EXERCISE_LIBRARY.find(e => e.slug === slug);
}

// ===== LEVEL 1 — SECURITY =====
function calculateSecurityLevel(profile: DogProfile): "standard" | "élevé" | "critique" {
  const { dog, problems } = profile;
  const pk = problems.map(p => p.problem_key);

  if (dog.bite_history) return "critique";
  if (dog.muzzle_required) return "critique";
  if (pk.includes("agressivite") && (problems.find(p => p.problem_key === "agressivite")?.intensity || 0) >= 3) return "critique";
  if (pk.includes("morsure_anterieure")) return "critique";

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

// ===== LEVEL 2 — PRIORITY AXES =====
function determineAxes(profile: DogProfile): PlanAxis[] {
  const { dog, problems, evaluation } = profile;
  const axes: PlanAxis[] = [];
  const pk = problems.map(p => p.problem_key);

  const intensity = (key: string) => problems.find(p => p.problem_key === key)?.intensity || 0;
  const freq = (key: string) => problems.find(p => p.problem_key === key)?.frequency;

  const problemScores: { key: string; axisKey: string; label: string; score: number; reason: string }[] = [];

  if (dog.bite_history || dog.muzzle_required || pk.includes("agressivite") || pk.includes("morsure_anterieure")) {
    axes.push({
      key: "securite", label: "Sécurité et prévention", priority: 1,
      reason: dog.bite_history
        ? "Antécédent de morsure. Priorité absolue : focus, stop, demi-tour d'urgence, distance de sécurité."
        : dog.muzzle_required
          ? "Port de muselière requis. Plan conservateur axé sécurité."
          : "Profil à risque détecté. Cadre de sécurité renforcé.",
    });
  }

  if (pk.includes("reactivite_chiens")) {
    const i = intensity("reactivite_chiens");
    const fWeight = freq("reactivite_chiens") === "toujours" ? 1.5 : freq("reactivite_chiens") === "souvent" ? 1.2 : 1;
    problemScores.push({ key: "reactivite_chiens", axisKey: "reactivite_chiens", label: "Réactivité aux chiens", score: i * fWeight * 10, reason: `Réactivité congénères (intensité ${i}/5). Travail sous seuil, désensibilisation progressive.` });
  }
  if (pk.includes("reactivite_humains") || pk.includes("peur_inconnus")) {
    const i = Math.max(intensity("reactivite_humains"), intensity("peur_inconnus"));
    problemScores.push({ key: "reactivite_humains", axisKey: "reactivite_humains", label: "Réactivité aux humains", score: i * 9, reason: `Réactivité humains (intensité ${i}/5). Distance, désensibilisation.` });
  }
  if (pk.includes("tire_en_laisse")) {
    problemScores.push({ key: "tire_en_laisse", axisKey: "marche", label: "Marche en laisse", score: intensity("tire_en_laisse") * 7, reason: "Traction en laisse. Marche connectée, changements de direction." });
  }
  if (pk.includes("saute_sur_gens")) {
    problemScores.push({ key: "saute_sur_gens", axisKey: "accueil", label: "Accueil sans saut", score: intensity("saute_sur_gens") * 5, reason: "Saut sur humains. 4 pattes au sol, assis avant interaction." });
  }
  if (pk.includes("aboiements")) {
    problemScores.push({ key: "aboiements", axisKey: "aboiements", label: "Gestion des aboiements", score: intensity("aboiements") * 5, reason: "Aboiements fréquents. Redirection, focus préventif." });
  }
  if (pk.includes("frustration") || pk.includes("hyperactivite")) {
    const i = Math.max(intensity("frustration"), intensity("hyperactivite"));
    problemScores.push({ key: "frustration", axisKey: "autocontrole", label: "Auto-contrôle et calme", score: i * 5, reason: "Frustration/hyperactivité. Tapis, attente, renoncement." });
  }
  if (pk.includes("rappel_faible")) {
    problemScores.push({ key: "rappel_faible", axisKey: "rappel", label: "Rappel", score: intensity("rappel_faible") * 4, reason: "Rappel faible. Travail progressif en environnement sécurisé." });
  }
  if (pk.includes("anxiete_separation")) {
    problemScores.push({ key: "anxiete_separation", axisKey: "solitude", label: "Gestion de la solitude", score: intensity("anxiete_separation") * 6, reason: "Anxiété de séparation. Module spécifique progressif." });
  }
  if (pk.includes("ignore_stop")) {
    problemScores.push({ key: "ignore_stop", axisKey: "stop", label: "Travail du stop", score: intensity("ignore_stop") * 4, reason: "Le chien n'écoute pas le stop. Travail d'arrêt net progressif." });
  }
  if (pk.includes("ignore_non")) {
    problemScores.push({ key: "ignore_non", axisKey: "non", label: "Travail du non", score: intensity("ignore_non") * 4, reason: "Le chien ignore le non. Renoncement progressif." });
  }
  if (pk.includes("difficulte_museliere") || dog.muzzle_required) {
    problemScores.push({ key: "museliere", axisKey: "museliere", label: "Muselière positive", score: dog.muzzle_required ? 30 : 10, reason: "Habituation à la muselière nécessaire." });
  }

  problemScores.sort((a, b) => b.score - a.score);

  axes.push({ key: "focus", label: "Focus et fondations", priority: axes.length + 1, reason: "Le focus est la base de tout apprentissage." });

  problemScores.forEach((ps) => {
    if (!axes.some(a => a.key === ps.axisKey)) {
      axes.push({ key: ps.axisKey, label: ps.label, priority: axes.length + 1, reason: ps.reason });
    }
  });

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

  if (pk.includes("reactivite_chiens") || pk.includes("reactivite_humains")) {
    if (evaluation.responds_to_name === "non") {
      missing.push("Prérequis manquant : le chien ne répond pas à son nom. Le focus de base doit être travaillé avant la désensibilisation.");
    }
  }
  if (pk.includes("rappel_faible")) {
    if (evaluation.responds_to_name === "non") {
      missing.push("Prérequis manquant : réponse au nom insuffisante. Travailler d'abord le focus avant le rappel avancé.");
    }
  }
  if (pk.includes("saute_sur_gens")) {
    if (evaluation.holds_sit === "non") {
      missing.push("Prérequis manquant : l'assis n'est pas acquis. Travailler l'assis avant l'accueil sans saut.");
    }
  }
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

  if (dog.bite_history) precautions.push({ type: "safety", severity: "critical", text: "⚠️ Antécédent de morsure : aucune mise en contact direct. Distance minimale 10m." });
  if (dog.muzzle_required) precautions.push({ type: "safety", severity: "critical", text: "🔒 Muselière obligatoire en extérieur et en présence d'autres." });
  if (dog.joint_pain) precautions.push({ type: "health", severity: "warning", text: "Douleurs articulaires : exercices physiques réduits, sessions ≤ 10 min." });
  if (dog.heart_problems) precautions.push({ type: "health", severity: "warning", text: "Problèmes cardiaques : éviter l'intensité, sessions courtes." });
  if (dog.epilepsy) precautions.push({ type: "health", severity: "warning", text: "Épilepsie : éviter la surstimulation, environnements calmes." });
  if (dog.overweight) precautions.push({ type: "health", severity: "info", text: "Surpoids : sessions modérées, friandises allégées." });
  if (mods.isSenior) precautions.push({ type: "health", severity: "warning", text: "Chien senior : durée et intensité adaptées. Exercices mentaux privilégiés." });
  if (mods.isPuppy) precautions.push({ type: "health", severity: "info", text: "Chiot : sessions ≤ 5 min. Socialisation positive et fondations uniquement." });
  if (mods.isRecentAdoption) precautions.push({ type: "method", severity: "info", text: "Adoption récente : attentes réduites, construction progressive de la confiance." });

  const highReact = problems.some(p => (p.problem_key === "reactivite_chiens" || p.problem_key === "reactivite_humains") && (p.intensity || 0) >= 4);
  if (highReact) precautions.push({ type: "safety", severity: "warning", text: "Réactivité élevée : toujours sous seuil. Augmenter la distance au moindre signe de tension." });

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

// ===== EXERCISE BUILDER — uses real slugs =====
function buildExercisesForAxis(axisKey: string, week: number, mods: ReturnType<typeof getProfileModifiers>): PlanExercise[] {
  const exercises: PlanExercise[] = [];
  const baseDuration = mods.isSenior || mods.hasPain ? 60 : mods.isPuppy ? 45 : 90;
  const weekIdx = Math.min(week - 1, 3);

  const axisExercises = AXIS_EXERCISE_SLUGS[axisKey];
  if (!axisExercises) return exercises;

  const slugsForWeek = axisExercises[weekIdx] || axisExercises[0];
  const maxReps = mods.isPuppy ? 8 : mods.isSenior || mods.hasPain ? 10 : 20;
  const weekMultiplier = Math.min(week, 3);

  slugsForWeek.forEach((slug, i) => {
    const lib = findBySlug(slug);
    if (!lib) return;

    // Skip physically demanding exercises for painful dogs
    if (mods.hasPain && lib.contraindications.some(c => c.toLowerCase().includes("douleur") || c.toLowerCase().includes("articulaire"))) {
      return;
    }

    const reps = Math.min(8 + weekMultiplier * 3, maxReps);
    const stepsToShow = Math.min(2 + week, lib.steps.length);

    // Build clear step-by-step instructions from the library
    const instructionSteps = lib.steps.slice(0, stepsToShow).map((s, idx) => `${idx + 1}. ${s}`).join("\n");

    // Build tutorial steps for rich display
    const tutorialSteps = lib.tutorialSteps.slice(0, stepsToShow).map(ts => ({
      title: ts.title,
      description: ts.description,
      tip: ts.tip,
    }));

    exercises.push({
      id: `plan-${axisKey}-w${week}-${i}`,
      name: lib.name,
      slug: lib.slug,
      description: lib.summary || lib.objective || lib.dedication || "",
      instructions: instructionSteps,
      repetitions: reps,
      timerSeconds: baseDuration,
      tutorialSteps,
      validationProtocol: lib.successCriteria || "",
      successCriteria: lib.successCriteria || "",
      libraryRef: lib.id,
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
    tips.push("Aujourd'hui, gardez une grande distance avec les déclencheurs.");
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
  const foundationWeeks = mods.isRecentAdoption ? 2 : 1;

  for (let week = 1; week <= 4; week++) {
    for (let dayInWeek = 1; dayInWeek <= 7; dayInWeek++) {
      const dayNumber = (week - 1) * 7 + dayInWeek;
      const isReview = dayInWeek === 7;

      let mainAxis: PlanAxis;
      if (week <= foundationWeeks && !isReview) {
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

      let difficulty: string;
      if (mods.isSenior || mods.hasPain || mods.isRecentAdoption) {
        difficulty = week <= 2 ? "facile" : week <= 3 ? "facile à moyenne" : "moyenne";
      } else {
        difficulty = week <= 1 ? "facile" : week <= 2 ? "facile à moyenne" : week <= 3 ? "moyenne" : "moyenne à élevée";
      }

      const day: PlanDay = {
        dayNumber, week,
        title: isReview ? `Bilan semaine ${week}` : mainAxis.label,
        objective: isReview
          ? `Réviser les acquis de la semaine ${week} et consolider les fondations.`
          : `Travailler ${mainAxis.label.toLowerCase()} — ${mainAxis.reason.split(".")[0]}.`,
        duration, difficulty, exercises,
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
  if (axes[0].key === "securite") parts.push("La sécurité est prioritaire car le profil présente des risques.");
  const mainAxis = axes.find(a => a.key !== "securite" && a.key !== "focus");
  if (mainAxis) parts.push(`L'axe principal est "${mainAxis.label}" car c'est la problématique la plus impactante.`);
  parts.push("Le focus est intégré en permanence car c'est le prérequis de base.");
  return parts.join(" ");
}

// ===== LEVEL 5 — ADAPTIVE SUGGESTIONS =====
export function getAdaptiveSuggestions(signals: AdaptiveSignals): {
  shouldSimplify: boolean;
  shouldProgress: boolean;
  message: string;
  type: "warning" | "success" | "info";
} {
  if (signals.daysCompleted >= 3) {
    if (signals.avgTension >= 4 || signals.avgDogReaction >= 4) return { shouldSimplify: true, shouldProgress: false, message: "Le plan semble trop difficile. Revenir à une étape plus simple ?", type: "warning" };
    if (signals.stopScore < 30 && signals.focusScore < 30) return { shouldSimplify: true, shouldProgress: false, message: "Les fondations (stop, focus) sont fragiles. Renforcer les bases.", type: "warning" };
    if (signals.incidentCount >= 3) return { shouldSimplify: true, shouldProgress: false, message: "Plusieurs incidents. Augmentez la distance et simplifiez.", type: "warning" };
    if (signals.recoveryRate < 40) return { shouldSimplify: true, shouldProgress: false, message: "Récupération lente. Réduisez la difficulté.", type: "warning" };
  }
  if (signals.daysCompleted >= 5) {
    if (signals.avgTension <= 2 && signals.stopScore >= 70 && signals.focusScore >= 70) return { shouldSimplify: false, shouldProgress: true, message: "Progression stable. Prêt pour l'étape suivante ?", type: "success" };
    if (signals.avgTension <= 2.5 && signals.avgDogReaction <= 2.5) return { shouldSimplify: false, shouldProgress: true, message: "Bonne évolution ! Tension et réactivité diminuent.", type: "success" };
  }
  return { shouldSimplify: false, shouldProgress: false, message: "Continuez le travail en cours.", type: "info" };
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
    ? `Plan sécurisé pour ${profile.dog.name}. Priorité absolue à la sécurité. Axes : ${topAxes}.`
    : securityLevel === "élevé"
      ? `Plan adapté pour ${profile.dog.name} avec précautions renforcées. Axes : ${topAxes}.`
      : `Plan personnalisé pour ${profile.dog.name} axé sur ${topAxes}. Progression sur 4 semaines.`;

  return {
    id: `plan-${profile.dog.id}-${Date.now()}`,
    dogName: profile.dog.name,
    summary, axes, precautions, frequency,
    averageDuration: avgDuration,
    totalDays: 28,
    securityLevel, days,
    prerequisitesMissing,
    priorityExplanation,
  };
}
