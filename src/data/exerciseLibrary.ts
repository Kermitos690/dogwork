// ═══════════════════════════════════════════════════════════
// PawPlan — Bibliothèque d'exercices professionnelle
// 80+ exercices · 22 catégories · Modèle enrichi
// ═══════════════════════════════════════════════════════════

export interface TutorialStep {
  title: string;
  description: string;
  imageUrl?: string;
  tip?: string;
}

export interface LibraryExercise {
  id: string;
  slug: string;
  name: string;
  shortTitle: string;
  category: string;
  subcategory?: string;
  categoryIcon: string;

  // Pedagogical
  objective: string;
  dedication: string;
  targetProblems: string[];
  secondaryBenefits: string[];
  prerequisites: string[];
  level: "débutant" | "intermédiaire" | "avancé";
  exerciseType: "fondation" | "ciblé" | "bonus" | "trick" | "récupération" | "mental" | "relation" | "routine";

  // Practical
  duration: string;
  repetitions: string;
  frequency: string;
  material: string[];
  environment: "maison" | "extérieur calme" | "extérieur contrôlé" | "tous" | "avancé";
  intensityLevel: number; // 1-5
  cognitiveLoad: number; // 1-5
  physicalLoad: number; // 1-5

  // Tutorial
  summary: string;
  shortInstruction: string;
  steps: string[];
  tutorialSteps: TutorialStep[];
  mistakes: string[];
  vigilance: string;
  successCriteria: string;
  stopCriteria: string;
  adaptations: string[];
  progressionNext: string;
  regressionSimplified: string;

  // Profile & safety
  ageRecommendation: string;
  suitableProfiles: string[];
  contraindications: string[];
  precautions: string[];
  healthPrecautions: string[];
  compatibleReactivity: boolean;
  compatibleSenior: boolean;
  compatiblePuppy: boolean;
  compatibleMuzzle: boolean;

  // Visual
  coverImage?: string;
  galleryImages?: string[];

  // Metadata
  tags: string[];
  priorityAxis: string[];
  difficulty: number; // 1-5
  profileAdaptation?: string;
}

export const EXERCISE_CATEGORIES = [
  { key: "fondations", label: "Fondations", icon: "🏗️", color: "neon-blue" },
  { key: "focus", label: "Focus / Attention", icon: "👁️", color: "neon-cyan" },
  { key: "controle", label: "Contrôle / Auto-contrôle", icon: "🛑", color: "neon-purple" },
  { key: "positions", label: "Assis / Couché / Reste", icon: "🎯", color: "neon-blue" },
  { key: "marche", label: "Marche & Extérieur", icon: "🦮", color: "neon-blue" },
  { key: "reactivite_chiens", label: "Réactivité chiens", icon: "🐕", color: "zone-orange" },
  { key: "reactivite_humains", label: "Réactivité humains", icon: "👤", color: "zone-orange" },
  { key: "aboiements", label: "Aboiements / Redirection", icon: "🔇", color: "zone-orange" },
  { key: "calme", label: "Calme / Tapis / Récupération", icon: "🧘", color: "neon-cyan" },
  { key: "rappel", label: "Rappel", icon: "📢", color: "neon-blue" },
  { key: "accueil", label: "Accueil / Politesse", icon: "🤝", color: "neon-cyan" },
  { key: "museliere", label: "Muselière positive", icon: "🔒", color: "neon-purple" },
  { key: "frustration", label: "Frustration / Renoncement", icon: "⏳", color: "neon-purple" },
  { key: "solitude", label: "Solitude / Séparation", icon: "🏠", color: "neon-purple" },
  { key: "mental", label: "Dépense mentale", icon: "🧩", color: "neon-cyan" },
  { key: "enrichment", label: "Enrichment / Flair", icon: "👃", color: "neon-cyan" },
  { key: "tricks", label: "Tricks / Tours", icon: "🎪", color: "neon-pink" },
  { key: "relation", label: "Relation / Engagement", icon: "💙", color: "neon-blue" },
  { key: "confiance", label: "Confiance / Proprioception", icon: "🌟", color: "neon-blue" },
  { key: "chiot", label: "Modules chiot", icon: "🐶", color: "neon-cyan" },
  { key: "senior", label: "Modules senior", icon: "🐾", color: "neon-purple" },
  { key: "sensible", label: "Profils sensibles / Prudents", icon: "🛡️", color: "zone-orange" },
];

export const CATEGORY_KEYS = EXERCISE_CATEGORIES.map(c => c.key);

// Helper to build exercises with defaults
function ex(partial: Partial<LibraryExercise> & Pick<LibraryExercise, "id" | "slug" | "name" | "category" | "objective" | "dedication" | "steps" | "tutorialSteps">): LibraryExercise {
  return {
    shortTitle: partial.name,
    categoryIcon: EXERCISE_CATEGORIES.find(c => c.key === partial.category)?.icon || "📋",
    targetProblems: [],
    secondaryBenefits: [],
    prerequisites: [],
    level: "débutant",
    exerciseType: "fondation",
    duration: "5 à 10 min",
    repetitions: "10 à 15 répétitions",
    frequency: "Quotidien",
    material: ["Friandises"],
    environment: "tous",
    intensityLevel: 1,
    cognitiveLoad: 2,
    physicalLoad: 1,
    summary: partial.objective,
    shortInstruction: partial.steps[0] || "",
    mistakes: [],
    vigilance: "",
    successCriteria: "",
    stopCriteria: "Arrêter si le chien montre des signes de stress ou de fatigue.",
    adaptations: [],
    progressionNext: "",
    regressionSimplified: "",
    ageRecommendation: "Tous âges",
    suitableProfiles: ["tous"],
    contraindications: [],
    precautions: [],
    healthPrecautions: [],
    compatibleReactivity: true,
    compatibleSenior: true,
    compatiblePuppy: true,
    compatibleMuzzle: true,
    tags: [],
    priorityAxis: [],
    difficulty: 1,
    ...partial,
  };
}

export const EXERCISE_LIBRARY: LibraryExercise[] = [
  // ════════════════════════════════════════
  // FONDATIONS (6 exercices)
  // ════════════════════════════════════════
  ex({
    id: "fond-nom", slug: "repondre-au-nom", name: "Répondre au nom", category: "fondations",
    objective: "Obtenir une orientation fiable quand on prononce le nom du chien.",
    dedication: "Le premier lien de communication : le chien apprend que son nom signifie 'regarde-moi'.",
    targetProblems: ["manque_focus"], secondaryBenefits: ["Pose la base de tous les autres signaux"],
    level: "débutant", exerciseType: "fondation", duration: "5 min", repetitions: "15 à 20 répétitions",
    environment: "maison", intensityLevel: 1, cognitiveLoad: 1, physicalLoad: 1,
    summary: "Dire le nom une seule fois, récompenser le regard.",
    shortInstruction: "Nom → regard → marqueur → récompense.",
    steps: ["Dire le nom une seule fois, d'un ton clair.", "Attendre que le chien vous regarde.", "Marquer immédiatement (\"Oui !\" ou clicker).", "Récompenser.", "Répéter dans un environnement calme."],
    tutorialSteps: [
      { title: "Préparer", description: "Ayez des friandises prêtes dans un environnement calme sans distraction.", tip: "Commencez dans la pièce la plus calme de la maison." },
      { title: "Appeler", description: "Dites le nom UNE seule fois, d'un ton joyeux mais pas surexcité.", tip: "Si le chien ne répond pas, attendez. Ne répétez pas." },
      { title: "Marquer et récompenser", description: "Dès que le chien vous regarde, marquez et récompensez.", tip: "Le timing est tout : marquez dans la demi-seconde." },
    ],
    mistakes: ["Répéter le nom 5 fois.", "Ton menaçant.", "Ne pas récompenser le regard."],
    vigilance: "Ne jamais utiliser le nom en négatif.",
    successCriteria: "Le chien vous regarde dans 80% des essais au premier appel.",
    adaptations: ["Chiot : sessions de 2 min max.", "Senior : ton plus doux."],
    progressionNext: "Ajouter de légères distractions.", regressionSimplified: "Réduire la distance entre vous.",
    tags: ["fondation", "nom", "essentiel", "base"], priorityAxis: ["communication"],
    difficulty: 1, compatibleReactivity: true, compatibleSenior: true, compatiblePuppy: true, compatibleMuzzle: true,
  }),
  ex({
    id: "fond-liberation", slug: "liberation-ok", name: "Libération / OK", category: "fondations",
    objective: "Apprendre le début et la fin d'un exercice.",
    dedication: "Structure chaque exercice : le chien sait quand il travaille et quand il est libre.",
    targetProblems: ["auto_controle"], level: "débutant", exerciseType: "fondation",
    duration: "5 min", repetitions: "10 répétitions", environment: "maison",
    steps: ["Demander assis.", "Attendre 2 secondes.", "Dire 'OK' d'un ton enjoué.", "Encourager le mouvement.", "Répéter en augmentant la durée."],
    tutorialSteps: [
      { title: "Position", description: "Mettez le chien en assis ou couché." },
      { title: "Attente", description: "Attendez 2 secondes en silence." },
      { title: "Libération", description: "Dites 'OK !' avec enthousiasme pour libérer." },
    ],
    mistakes: ["Pas de signal de fin clair.", "Libérer sur agitation."],
    vigilance: "Toujours libérer avant que le chien ne rompe.",
    successCriteria: "Le chien attend le OK avant de bouger.", tags: ["fondation", "structure", "base"],
    difficulty: 1,
  }),
  ex({
    id: "fond-tapis", slug: "entree-tapis", name: "Entrée sur le tapis", category: "fondations",
    objective: "Créer un lieu de calme associé au positif.",
    dedication: "Zone de sécurité émotionnelle : le tapis deviendra le refuge du chien.",
    targetProblems: ["hyperactivite", "anxiete"], level: "débutant", exerciseType: "fondation",
    material: ["Tapis ou couverture", "Friandises"], duration: "10 min", repetitions: "10 à 15 répétitions",
    steps: ["Poser le tapis au sol.", "Récompenser dès qu'une patte touche.", "Progresser vers 4 pattes.", "Récompenser le couché spontané.", "Ajouter le signal 'Tapis'."],
    tutorialSteps: [
      { title: "Introduction", description: "Posez le tapis et laissez le chien l'explorer." },
      { title: "Shaping", description: "Récompensez chaque interaction : 1 patte, 2, puis 4." },
      { title: "Couché", description: "Récompensez le couché spontané, ajoutez le mot 'Tapis'." },
    ],
    mistakes: ["Forcer le chien sur le tapis.", "Utiliser le tapis comme punition."],
    vigilance: "Le tapis = toujours positif.", successCriteria: "Le chien va sur le tapis et s'y couche.",
    tags: ["fondation", "calme", "tapis", "sécurité"], difficulty: 1,
  }),
  ex({
    id: "fond-marqueur", slug: "marqueur-oui", name: "Marqueur verbal / Clicker", category: "fondations",
    objective: "Établir un signal qui prédit la récompense.",
    dedication: "Le pont entre le bon comportement et la récompense : précision et timing.",
    level: "débutant", exerciseType: "fondation", duration: "3 min", repetitions: "20 répétitions",
    steps: ["Dire 'Oui !' (ou cliquer).", "Donner une friandise immédiatement.", "Répéter 20 fois.", "Le chien comprend : marqueur = récompense arrive."],
    tutorialSteps: [
      { title: "Charger le marqueur", description: "Dites 'Oui !' puis donnez une friandise. 20 fois." },
      { title: "Test", description: "Dites 'Oui !' : le chien doit anticiper la récompense." },
      { title: "Utilisation", description: "Utilisez le marqueur pour capturer chaque bon comportement." },
    ],
    tags: ["fondation", "marqueur", "base", "essentiel"], difficulty: 1,
  }),
  ex({
    id: "fond-contact", slug: "suivi-naturel", name: "Suivi naturel / Follow me", category: "fondations",
    objective: "Le chien choisit de vous suivre sans laisse.",
    dedication: "Construire l'envie de rester connecté au maître.",
    level: "débutant", exerciseType: "fondation", environment: "maison",
    duration: "5 min", repetitions: "5 à 10 séquences",
    steps: ["Marcher dans la pièce sans appeler.", "Récompenser le chien quand il vous suit.", "Changer de direction.", "Récompenser chaque choix de vous suivre."],
    tutorialSteps: [
      { title: "Déplacement", description: "Marchez calmement, sans appeler le chien." },
      { title: "Capture", description: "Quand il choisit de vous suivre, marquez et récompensez." },
      { title: "Variations", description: "Changez de direction, de pièce. Récompensez le suivi." },
    ],
    tags: ["fondation", "relation", "suivi", "engagement"], difficulty: 1,
  }),
  ex({
    id: "fond-regard", slug: "contact-visuel", name: "Contact visuel volontaire", category: "fondations",
    objective: "Le chien vous regarde spontanément sans signal.",
    dedication: "Check-in spontané : le signe d'un chien connecté à son maître.",
    level: "débutant", exerciseType: "fondation", duration: "En continu", repetitions: "Capturer au quotidien",
    steps: ["Observer le chien au quotidien.", "Quand il vous regarde spontanément, marquer.", "Récompenser.", "Le chien apprend : me regarder = bonne chose."],
    tutorialSteps: [
      { title: "Observation", description: "Gardez des friandises sur vous au quotidien." },
      { title: "Capture", description: "Chaque regard spontané vers vous = marqueur + récompense." },
      { title: "Renforcement", description: "Le chien va augmenter ses check-ins naturellement." },
    ],
    tags: ["fondation", "focus", "check-in", "relation"], difficulty: 1,
  }),

  // ════════════════════════════════════════
  // FOCUS / ATTENTION (4 exercices)
  // ════════════════════════════════════════
  ex({
    id: "focus-regarde", slug: "regarde-moi", name: "Regarde-moi", category: "focus",
    objective: "Obtenir un contact visuel fiable sur commande.",
    dedication: "Base de toute communication : capter l'attention avant toute consigne.",
    targetProblems: ["manque_focus", "reactivite_chiens", "reactivite_humains"],
    level: "débutant", exerciseType: "fondation", duration: "5 à 10 min", repetitions: "15 à 20 répétitions",
    material: ["Friandises haute valeur", "Pochette"], intensityLevel: 1, cognitiveLoad: 2,
    summary: "Contact visuel sur signal → marqueur → récompense.",
    shortInstruction: "Dire 'Regarde', attendre le regard, marquer, récompenser.",
    steps: ["Dire 'Regarde' une seule fois.", "Attendre le contact visuel.", "Marquer dès que les yeux se croisent.", "Récompenser immédiatement.", "Augmenter progressivement la durée."],
    tutorialSteps: [
      { title: "Signal", description: "Dites 'Regarde' calmement, une seule fois.", tip: "Restez détendu." },
      { title: "Contact", description: "Dès que ses yeux croisent les vôtres, marquez.", tip: "Timing crucial : dans la seconde." },
      { title: "Récompense", description: "Donnez la friandise juste après le marqueur.", tip: "Variez les récompenses." },
    ],
    mistakes: ["Répéter le mot.", "Tenir la friandise devant le visage.", "Récompenser sans vrai contact."],
    vigilance: "Environnement calme au début.",
    successCriteria: "Le chien regarde dans 80% des essais.",
    progressionNext: "Focus en mouvement.", regressionSimplified: "Friandise près du visage pour guider.",
    tags: ["focus", "fondation", "essentiel", "base"], priorityAxis: ["communication", "contrôle"],
    difficulty: 1, compatibleMuzzle: true,
  }),
  ex({
    id: "focus-mvt", slug: "focus-en-mouvement", name: "Focus en mouvement", category: "focus",
    objective: "Maintenir l'attention en marchant.",
    dedication: "Préparer la connexion extérieure : garder le lien en déplacement.",
    targetProblems: ["manque_focus", "tire_laisse"],
    level: "intermédiaire", exerciseType: "ciblé", duration: "10 min", repetitions: "10 séquences",
    material: ["Friandises", "Laisse"], prerequisites: ["focus-regarde"],
    intensityLevel: 2, cognitiveLoad: 3, physicalLoad: 2,
    steps: ["Marcher lentement.", "Dire 'Regarde' en marchant.", "Récompenser le regard sans s'arrêter.", "Allonger les séquences."],
    tutorialSteps: [
      { title: "Démarrage", description: "Marchez lentement dans un endroit calme." },
      { title: "Signal", description: "Dites 'Regarde' en marchant, sans vous arrêter." },
      { title: "Récompense", description: "Récompensez immédiatement le regard en mouvement." },
    ],
    mistakes: ["Aller trop vite.", "Environnement trop stimulant."],
    tags: ["focus", "marche", "connexion"], difficulty: 2,
    compatibleSenior: true, compatiblePuppy: false,
  }),
  ex({
    id: "focus-distraction", slug: "focus-avec-distraction", name: "Focus avec distraction", category: "focus",
    objective: "Maintenir le contact visuel malgré un stimulus.",
    dedication: "Le vrai test du focus : rester connecté quand le monde attire.",
    targetProblems: ["manque_focus", "reactivite_chiens"],
    level: "avancé", exerciseType: "ciblé", duration: "10 min", repetitions: "10 à 15",
    prerequisites: ["focus-mvt"], environment: "extérieur calme",
    intensityLevel: 3, cognitiveLoad: 4, physicalLoad: 1,
    steps: ["Choisir un lieu avec distraction légère.", "Demander 'Regarde'.", "Marquer le regard malgré le stimulus.", "Augmenter progressivement l'intensité des distractions."],
    tutorialSteps: [
      { title: "Environnement", description: "Choisissez un lieu avec une distraction légère au loin." },
      { title: "Focus", description: "Demandez 'Regarde' et récompensez le regard vers vous." },
      { title: "Progression", description: "Augmentez la proximité ou l'intensité de la distraction." },
    ],
    tags: ["focus", "avancé", "distraction", "extérieur"], difficulty: 4,
    compatiblePuppy: false,
  }),
  ex({
    id: "focus-duration", slug: "focus-maintenu", name: "Focus maintenu (durée)", category: "focus",
    objective: "Maintenir le regard pendant 5, 10, 15 secondes.",
    dedication: "Le focus n'est utile que s'il tient dans le temps.",
    targetProblems: ["manque_focus"], level: "intermédiaire", exerciseType: "ciblé",
    duration: "5 min", repetitions: "10 répétitions", prerequisites: ["focus-regarde"],
    steps: ["Demander 'Regarde'.", "Compter mentalement 3, puis 5, puis 10 secondes.", "Marquer à la fin de la durée.", "Progresser par paliers de 2-3 secondes."],
    tutorialSteps: [
      { title: "Début court", description: "Commencez à 2-3 secondes de contact visuel." },
      { title: "Extension", description: "Augmentez par paliers : 5s, 8s, 10s, 15s." },
      { title: "Stabilisation", description: "Consolidez chaque palier avant de progresser." },
    ],
    tags: ["focus", "durée", "patience"], difficulty: 2,
  }),

  // ════════════════════════════════════════
  // CONTRÔLE / AUTO-CONTRÔLE (6 exercices)
  // ════════════════════════════════════════
  ex({
    id: "ctrl-stop", slug: "stop-arret-net", name: "Stop — arrêt net", category: "controle",
    objective: "Interrompre le déplacement instantanément.",
    dedication: "Outil de sécurité essentiel pour prévenir les situations dangereuses.",
    targetProblems: ["rappel_faible", "reactivite_chiens", "tire_laisse", "ignore_stop"],
    level: "débutant", exerciseType: "fondation", duration: "10 min", repetitions: "15 répétitions",
    material: ["Friandises", "Laisse"], intensityLevel: 2, cognitiveLoad: 2, physicalLoad: 2,
    steps: ["Marcher avec le chien.", "S'arrêter net, dire 'Stop'.", "Attendre l'arrêt.", "Marquer et récompenser.", "Reprendre et répéter."],
    tutorialSteps: [
      { title: "Marche", description: "Marchez normalement en laisse." },
      { title: "Arrêt", description: "Arrêtez-vous net, dites 'Stop' fermement mais calmement." },
      { title: "Validation", description: "Dès l'immobilisation, marquez et récompensez." },
    ],
    mistakes: ["Tirer sur la laisse.", "Répéter l'ordre.", "Récompenser un arrêt approximatif."],
    vigilance: "S'arrêter soi-même clairement.", successCriteria: "Le chien s'arrête dans les 2 secondes.",
    tags: ["sécurité", "contrôle", "fondation", "stop"], priorityAxis: ["sécurité"],
    difficulty: 2,
  }),
  ex({
    id: "ctrl-non", slug: "non-renoncement", name: "Non / Renoncement", category: "controle",
    objective: "Apprendre au chien à renoncer volontairement.",
    dedication: "Auto-contrôle face aux tentations : compétence de vie.",
    targetProblems: ["ignore_non", "protection_ressources", "auto_controle"],
    level: "débutant", exerciseType: "fondation", duration: "5 à 10 min", repetitions: "15 répétitions",
    material: ["Friandises (2 types)"],
    steps: ["Fermer une friandise dans le poing.", "Présenter.", "Attendre le recul ou détournement.", "Marquer et récompenser de l'autre main.", "Ajouter 'Non' quand fiable."],
    tutorialSteps: [
      { title: "Présentation", description: "Friandise dans le poing fermé." },
      { title: "Patience", description: "Attendez que le chien recule." },
      { title: "Récompense alternative", description: "Récompensez de l'autre main." },
    ],
    mistakes: ["Ouvrir la main quand il insiste.", "Punir.", "Lenteur de récompense."],
    contraindications: ["Protection de ressources sévère : professionnel."],
    tags: ["auto-contrôle", "renoncement", "fondation"], difficulty: 2,
  }),
  ex({
    id: "ctrl-gamelle", slug: "attente-gamelle", name: "Attendre la gamelle", category: "controle",
    objective: "Le calme ouvre l'accès aux ressources.",
    dedication: "Leçon quotidienne de patience et d'auto-régulation.",
    targetProblems: ["frustration", "hyperactivite", "auto_controle"],
    level: "débutant", exerciseType: "fondation", duration: "5 min", repetitions: "À chaque repas",
    material: ["Gamelle", "Nourriture"], frequency: "À chaque repas",
    steps: ["Tenir la gamelle en hauteur.", "Descendre lentement.", "Si mouvement, remonter.", "Poser quand immobile.", "Libérer avec 'OK'."],
    tutorialSteps: [
      { title: "Préparation", description: "Gamelle à hauteur de poitrine." },
      { title: "Test", description: "Descendez. Mouvement = on remonte." },
      { title: "Libération", description: "Posez et dites 'OK' pour libérer." },
    ],
    contraindications: ["Protection de ressources alimentaire : professionnel."],
    tags: ["auto-contrôle", "patience", "quotidien"], difficulty: 1,
  }),
  ex({
    id: "ctrl-porte", slug: "auto-controle-porte", name: "Auto-contrôle porte", category: "controle",
    objective: "Attendre calmement avant de franchir une porte.",
    dedication: "Gestion de l'excitation liée aux transitions et aux sorties.",
    targetProblems: ["hyperactivite", "tire_laisse"],
    level: "débutant", exerciseType: "fondation", duration: "5 min",
    steps: ["Approcher de la porte.", "Ouvrir légèrement.", "Si rush, refermer.", "Quand calme, ouvrir.", "Libérer avec 'OK'."],
    tutorialSteps: [
      { title: "Approche", description: "Approchez de la porte avec le chien en laisse." },
      { title: "Test", description: "Ouvrez doucement. S'il se précipite, refermez." },
      { title: "Libération", description: "Quand il est calme, ouvrez et dites 'OK'." },
    ],
    tags: ["auto-contrôle", "porte", "quotidien", "patience"], difficulty: 1,
  }),
  ex({
    id: "ctrl-friandise", slug: "renoncement-friandise-visible", name: "Renoncement friandise visible", category: "controle",
    objective: "Le chien renonce à une friandise posée au sol.",
    dedication: "Niveau avancé du renoncement : résister à la tentation visible.",
    targetProblems: ["auto_controle", "protection_ressources"],
    level: "intermédiaire", exerciseType: "ciblé", prerequisites: ["ctrl-non"],
    steps: ["Poser une friandise au sol.", "Couvrir du pied si le chien tente.", "Attendre le détournement.", "Marquer et récompenser de la main."],
    tutorialSteps: [
      { title: "Dépôt", description: "Posez une friandise au sol, devant le chien." },
      { title: "Protection", description: "Couvrez du pied si nécessaire." },
      { title: "Récompense", description: "Quand il détourne le regard, marquez et récompensez." },
    ],
    tags: ["auto-contrôle", "renoncement", "avancé"], difficulty: 3,
  }),
  ex({
    id: "ctrl-attente", slug: "attente-courte", name: "Attente courte", category: "controle",
    objective: "Le chien attend en position sans bouger pendant une action simple.",
    dedication: "Base de la patience dans la vie quotidienne.",
    targetProblems: ["hyperactivite", "frustration"],
    level: "débutant", exerciseType: "fondation",
    steps: ["Demander assis.", "Faire un geste simple (se baisser, poser un objet).", "Si le chien reste, marquer et récompenser.", "Augmenter la complexité du geste."],
    tutorialSteps: [
      { title: "Position", description: "Mettez le chien en assis." },
      { title: "Action", description: "Faites une action simple sans que le chien bouge." },
      { title: "Récompense", description: "S'il reste en place, marquez et récompensez." },
    ],
    tags: ["patience", "contrôle", "quotidien"], difficulty: 1,
  }),

  // ════════════════════════════════════════
  // POSITIONS — Assis / Couché / Reste (4)
  // ════════════════════════════════════════
  ex({
    id: "pos-assis", slug: "assis-tenu", name: "Assis tenu", category: "positions",
    objective: "Obtenir et maintenir un assis fiable.",
    dedication: "Position de base pour l'accueil, le calme et la gestion.",
    targetProblems: ["saute_gens", "auto_controle", "hyperactivite"],
    level: "débutant", exerciseType: "fondation",
    steps: ["Leurrer en montant la friandise au-dessus du nez.", "Marquer dès que les fesses touchent.", "Récompenser.", "Ajouter 'Assis'.", "Augmenter la durée."],
    tutorialSteps: [
      { title: "Leurre", description: "Friandise au-dessus du nez → assis naturel." },
      { title: "Marquage", description: "Marquez dès que les fesses touchent le sol." },
      { title: "Durée", description: "Augmentez : 2s, 5s, 10s avant récompense." },
    ],
    mistakes: ["Appuyer sur le dos.", "Récompenser un assis qui ne tient pas."],
    contraindications: ["Douleurs hanches : vérifier avec le vétérinaire."],
    tags: ["position", "fondation", "calme", "base"], difficulty: 1,
  }),
  ex({
    id: "pos-couche", slug: "couche-tenu", name: "Couché tenu", category: "positions",
    objective: "Obtenir un couché calme et maintenu.",
    dedication: "Position de repos pour le calme, le tapis et les attentes.",
    targetProblems: ["auto_controle", "hyperactivite", "anxiete"],
    level: "débutant", exerciseType: "fondation",
    material: ["Friandises", "Tapis optionnel"],
    steps: ["Depuis l'assis, descendre la friandise vers le sol.", "Guider vers l'avant.", "Marquer quand le ventre touche.", "Augmenter la durée."],
    tutorialSteps: [
      { title: "Du assis au couché", description: "Descendez la friandise lentement vers le sol." },
      { title: "Guidage", description: "Guidez légèrement vers l'avant." },
      { title: "Récompense", description: "Marquez quand le ventre est au sol." },
    ],
    contraindications: ["Douleurs articulaires : adapter."],
    tags: ["position", "fondation", "calme"], difficulty: 1,
  }),
  ex({
    id: "pos-reste", slug: "reste-pas-bouger", name: "Reste / Pas bouger", category: "positions",
    objective: "Maintenir une position malgré les distractions.",
    dedication: "Apprendre la patience et la stabilité.",
    targetProblems: ["auto_controle", "hyperactivite", "frustration"],
    level: "intermédiaire", exerciseType: "ciblé", prerequisites: ["pos-assis", "pos-couche"],
    material: ["Friandises", "Longe optionnelle"],
    steps: ["Demander assis ou couché.", "Dire 'Reste' avec paume.", "Reculer d'un pas.", "Revenir et récompenser.", "Augmenter distance et durée."],
    tutorialSteps: [
      { title: "Position", description: "Mettez le chien en assis ou couché." },
      { title: "Signal", description: "Paume ouverte + 'Reste', reculez d'un pas." },
      { title: "Retour", description: "Revenez vers le chien et récompensez." },
    ],
    mistakes: ["Augmenter trop vite.", "Appeler le chien au lieu de revenir."],
    tags: ["contrôle", "patience", "stabilité"], difficulty: 3,
  }),
  ex({
    id: "pos-reste-distraction", slug: "reste-avec-distractions", name: "Reste avec distractions", category: "positions",
    objective: "Garder la position malgré des mouvements autour.",
    dedication: "Le vrai test : le monde bouge, le chien reste.",
    targetProblems: ["auto_controle", "hyperactivite"],
    level: "avancé", exerciseType: "ciblé", prerequisites: ["pos-reste"],
    steps: ["Installer en position.", "Se déplacer autour.", "Ouvrir une porte.", "Poser un objet.", "Récompenser le maintien."],
    tutorialSteps: [
      { title: "Position stable", description: "Le chien est en reste confirmé." },
      { title: "Distractions douces", description: "Déplacez-vous, posez un objet, bougez." },
      { title: "Renforcement", description: "Récompensez chaque maintien malgré la distraction." },
    ],
    tags: ["contrôle", "avancé", "distraction"], difficulty: 4,
    compatiblePuppy: false,
  }),

  // ════════════════════════════════════════
  // MARCHE & EXTÉRIEUR (6)
  // ════════════════════════════════════════
  ex({
    id: "march-connectee", slug: "marche-connectee", name: "Marche connectée", category: "marche",
    objective: "Marcher avec laisse souple sans traction.",
    dedication: "Transformer la promenade en coopération.",
    targetProblems: ["tire_laisse", "manque_focus"],
    level: "débutant", exerciseType: "fondation", duration: "10 à 15 min", repetitions: "10 séquences",
    material: ["Friandises", "Laisse", "Harnais recommandé"], environment: "maison",
    physicalLoad: 2, intensityLevel: 2,
    steps: ["Lieu calme.", "3-5 pas, récompenser laisse souple.", "Si traction : s'arrêter.", "Récompenser le retour.", "Changer de direction."],
    tutorialSteps: [
      { title: "Démarrage", description: "Endroit calme, laisse détendue." },
      { title: "Récompense", description: "Après 3-5 pas de laisse souple, récompensez." },
      { title: "Gestion traction", description: "Si traction, arrêtez-vous. Attendez le retour." },
    ],
    mistakes: ["Tirer en retour.", "Laisse enrouleur.", "Avancer sous tension."],
    contraindications: ["Douleurs cervicales : harnais."],
    tags: ["marche", "laisse", "connexion", "fondation"], difficulty: 2,
  }),
  ex({
    id: "march-direction", slug: "changement-direction", name: "Changement de direction", category: "marche",
    objective: "Le chien suit les changements sans traction.",
    dedication: "Rester attentif au maître en mouvement.",
    targetProblems: ["tire_laisse", "manque_focus"],
    level: "débutant", exerciseType: "ciblé", duration: "10 min", prerequisites: ["march-connectee"],
    steps: ["Marcher.", "Changer brusquement de direction.", "Récompenser le suivi.", "Varier les directions.", "Augmenter le rythme."],
    tutorialSteps: [
      { title: "Marche", description: "Marchez normalement." },
      { title: "Virage", description: "Changez de direction, ton enjoué." },
      { title: "Suivi", description: "Récompensez chaque ajustement du chien." },
    ],
    tags: ["marche", "direction", "attention"], difficulty: 2,
  }),
  ex({
    id: "march-demitour", slug: "demi-tour-urgence", name: "Demi-tour d'urgence", category: "marche",
    objective: "Changer de direction immédiatement face à un déclencheur.",
    dedication: "Outil de sécurité pour éviter les confrontations.",
    targetProblems: ["reactivite_chiens", "reactivite_humains", "tire_laisse"],
    level: "intermédiaire", exerciseType: "ciblé", duration: "10 min", repetitions: "10 à 15",
    material: ["Friandises très haute valeur", "Laisse courte"],
    intensityLevel: 3, cognitiveLoad: 2, physicalLoad: 2,
    steps: ["Marcher normalement.", "Dire 'On y va !' d'un ton enjoué.", "Faire demi-tour vers l'extérieur.", "Leurrer si nécessaire.", "Récompenser le suivi."],
    tutorialSteps: [
      { title: "Signal joyeux", description: "'On y va !' avec enthousiasme." },
      { title: "Mouvement", description: "Tournez vers l'extérieur, jamais par-dessus le chien." },
      { title: "Récompense", description: "Récompensez généreusement chaque suivi." },
    ],
    mistakes: ["Tirer brusquement.", "Première fois face à un vrai déclencheur."],
    tags: ["sécurité", "urgence", "marche"], priorityAxis: ["sécurité"],
    difficulty: 3,
  }),
  ex({
    id: "march-pause", slug: "pause-calme-dehors", name: "Pause calme dehors", category: "marche",
    objective: "Rester calme en position à l'extérieur.",
    dedication: "Observer le monde sereinement : un objectif pour les chiens réactifs.",
    targetProblems: ["hyperactivite", "anxiete", "reactivite_chiens"],
    level: "intermédiaire", exerciseType: "ciblé", environment: "extérieur calme",
    steps: ["Choisir un lieu calme.", "S'asseoir, installer le chien.", "Récompenser le calme.", "Augmenter la durée.", "Ajouter des distractions légères."],
    tutorialSteps: [
      { title: "Lieu calme", description: "Banc dans un parc calme, loin du passage." },
      { title: "Installation", description: "Installez-vous, le chien à côté." },
      { title: "Calme renforcé", description: "Récompensez chaque moment de sérénité." },
    ],
    tags: ["marche", "calme", "extérieur", "observation"], difficulty: 3,
  }),
  ex({
    id: "march-laisse-souple", slug: "marche-laisse-souple", name: "Marche laisse souple avancée", category: "marche",
    objective: "Marcher en laisse souple dans un environnement modéré.",
    dedication: "Généraliser la marche connectée au monde réel.",
    level: "avancé", exerciseType: "ciblé", prerequisites: ["march-connectee"], environment: "extérieur contrôlé",
    steps: ["Marcher dans un lieu modérément stimulant.", "Maintenir la laisse souple.", "Récompenser fréquemment.", "Gérer les tensions avec des arrêts."],
    tutorialSteps: [
      { title: "Environnement", description: "Choisissez un lieu avec quelques stimuli." },
      { title: "Laisse souple", description: "Récompensez chaque séquence de laisse souple." },
      { title: "Gestion", description: "Arrêt ou demi-tour si la tension monte." },
    ],
    tags: ["marche", "avancé", "laisse souple", "extérieur"], difficulty: 4,
    compatiblePuppy: false,
  }),
  ex({
    id: "march-checkin", slug: "check-in-spontane", name: "Check-in spontané en balade", category: "marche",
    objective: "Le chien vous regarde spontanément pendant la promenade.",
    dedication: "Signe d'une connexion forte : le chien choisit de vérifier avec vous.",
    level: "intermédiaire", exerciseType: "relation",
    steps: ["Ne rien demander pendant la balade.", "Chaque fois que le chien vous regarde spontanément, marquer.", "Récompenser.", "Le chien augmentera ses check-ins."],
    tutorialSteps: [
      { title: "Observation", description: "Marchez sans donner de signal." },
      { title: "Capture", description: "Chaque regard vers vous = marqueur + récompense." },
      { title: "Renforcement", description: "Les check-ins deviendront un réflexe." },
    ],
    tags: ["marche", "focus", "relation", "check-in"], difficulty: 2,
  }),

  // ════════════════════════════════════════
  // RÉACTIVITÉ CHIENS (6)
  // ════════════════════════════════════════
  ex({
    id: "react-chien-loin", slug: "voir-chien-de-loin", name: "Voir un chien de loin", category: "reactivite_chiens",
    objective: "Associer la vue d'un chien au calme et à la récompense.",
    dedication: "Première étape de désensibilisation : observer sans réagir.",
    targetProblems: ["reactivite_chiens"],
    level: "intermédiaire", exerciseType: "ciblé", duration: "10 à 20 min",
    material: ["Friandises très haute valeur", "Laisse"],
    environment: "extérieur contrôlé", intensityLevel: 3, cognitiveLoad: 3,
    steps: ["Identifier la distance de confort.", "Se positionner au-delà.", "Récompenser le calme à la vue.", "Si réaction : augmenter la distance.", "Micro-réductions sur plusieurs séances."],
    tutorialSteps: [
      { title: "Zone verte", description: "Trouvez la distance où le chien reste calme." },
      { title: "Association", description: "Chien calme + vue d'un chien = récompense." },
      { title: "Micro-progression", description: "Réduisez de 1-3m par séance." },
    ],
    mistakes: ["Forcer la proximité.", "Contact nez-à-nez.", "Zone rouge."],
    contraindications: ["Agression sévère : professionnel."],
    tags: ["réactivité", "chiens", "désensibilisation"], priorityAxis: ["réactivité"],
    difficulty: 4, compatiblePuppy: false, compatibleMuzzle: true,
  }),
  ex({
    id: "react-chien-retour", slug: "chien-puis-retour", name: "Chien puis retour sur moi", category: "reactivite_chiens",
    objective: "Créer la boucle 'chien aperçu → focus maître'.",
    dedication: "Réflexe de redirection : le chien voit un déclencheur et revient vers vous.",
    targetProblems: ["reactivite_chiens"], prerequisites: ["react-chien-loin", "focus-regarde"],
    level: "avancé", exerciseType: "ciblé",
    steps: ["Laisser regarder brièvement (1-2s).", "Dire 'Regarde'.", "Récompenser fort le retour.", "Répéter."],
    tutorialSteps: [
      { title: "Bref regard", description: "Laissez regarder 1-2 secondes max." },
      { title: "Redirection", description: "Dites 'Regarde' pour ramener l'attention." },
      { title: "Jackpot", description: "Récompensez très généreusement le retour." },
    ],
    tags: ["réactivité", "focus", "redirection", "chiens"], difficulty: 4,
    compatiblePuppy: false,
  }),
  ex({
    id: "react-chien-stop", slug: "stop-avec-chien", name: "Stop avec chien visible", category: "reactivite_chiens",
    objective: "S'arrêter même en présence d'un chien au loin.",
    dedication: "Obéissance sous pression émotionnelle.",
    targetProblems: ["reactivite_chiens", "ignore_stop"],
    level: "avancé", exerciseType: "ciblé", prerequisites: ["ctrl-stop", "react-chien-loin"],
    steps: ["Marcher avec un chien visible au loin.", "Demander 'Stop'.", "Récompenser l'arrêt.", "Reprendre et répéter."],
    tutorialSteps: [
      { title: "Contexte", description: "Un chien est visible au loin, à distance de confort." },
      { title: "Stop", description: "Demandez 'Stop' en marchant." },
      { title: "Récompense", description: "Le stop réussi en contexte = grande récompense." },
    ],
    tags: ["réactivité", "stop", "chiens", "avancé"], difficulty: 5,
    compatiblePuppy: false,
  }),
  ex({
    id: "react-chien-demitour", slug: "demi-tour-sur-declencheur", name: "Demi-tour sur déclencheur", category: "reactivite_chiens",
    objective: "Faire demi-tour fluidement à la vue d'un chien.",
    dedication: "Sortie de situation propre et sans stress.",
    targetProblems: ["reactivite_chiens"], prerequisites: ["march-demitour"],
    level: "avancé", exerciseType: "ciblé",
    steps: ["Marcher.", "Un chien apparaît.", "Dire 'On y va !'.", "Demi-tour fluide.", "Récompenser le suivi."],
    tutorialSteps: [
      { title: "Détection", description: "Repérez le chien avant votre chien si possible." },
      { title: "Action", description: "'On y va !' + demi-tour fluide." },
      { title: "Renforcement", description: "Récompensez le suivi sans regarder en arrière." },
    ],
    tags: ["réactivité", "demi-tour", "sécurité"], difficulty: 4,
  }),
  ex({
    id: "react-chien-parallele", slug: "marche-parallele", name: "Marche parallèle lointaine", category: "reactivite_chiens",
    objective: "Tolérer la présence d'un chien en marchant dans le même sens.",
    dedication: "Proximité passive : les deux chiens marchent sans interaction.",
    targetProblems: ["reactivite_chiens"],
    level: "avancé", exerciseType: "ciblé", prerequisites: ["react-chien-loin"],
    material: ["Friandises", "Laisse", "Chien neutre à distance"],
    steps: ["Marcher dans le même sens qu'un chien calme.", "Maintenir 30-50m minimum.", "Récompenser le calme.", "Micro-réduction progressive."],
    tutorialSteps: [
      { title: "Même direction", description: "Les deux chiens marchent dans le même sens." },
      { title: "Grande distance", description: "Au moins 30-50 mètres." },
      { title: "Calme renforcé", description: "Récompensez chaque moment serein." },
    ],
    tags: ["réactivité", "parallèle", "désensibilisation", "avancé"], difficulty: 5,
    compatiblePuppy: false,
  }),
  ex({
    id: "react-chien-distance", slug: "reduction-micro-distance", name: "Réduction micro-distance", category: "reactivite_chiens",
    objective: "Progresser sans casser le seuil.",
    dedication: "La patience paie : micro-étapes pour un résultat durable.",
    targetProblems: ["reactivite_chiens"], prerequisites: ["react-chien-loin"],
    level: "avancé", exerciseType: "ciblé",
    steps: ["Reprendre à la distance habituelle.", "Réduire de 1-3 mètres.", "Observer les signaux.", "Revenir en arrière si tension.", "Consolider."],
    tutorialSteps: [
      { title: "Base stable", description: "Refaites le travail à votre distance de confort." },
      { title: "Micro-réduction", description: "Réduisez de 1-3 mètres maximum." },
      { title: "Observation", description: "Signaux de stress = retour à la distance précédente." },
    ],
    tags: ["réactivité", "progression", "micro-étapes"], difficulty: 4,
  }),

  // ════════════════════════════════════════
  // RÉACTIVITÉ HUMAINS (4)
  // ════════════════════════════════════════
  ex({
    id: "react-hum-loin", slug: "voir-humain-focus", name: "Voir un humain et revenir au focus", category: "reactivite_humains",
    objective: "Réduire la réactivité face aux humains inconnus.",
    dedication: "Observer sereinement, pas réagir.",
    targetProblems: ["reactivite_humains", "peur_inconnus"],
    level: "intermédiaire", exerciseType: "ciblé", environment: "extérieur calme",
    steps: ["Observer des humains à grande distance.", "Récompenser le calme.", "Progresser par micro-étapes."],
    tutorialSteps: [
      { title: "Observation", description: "Installez-vous loin d'un lieu passant." },
      { title: "Calme", description: "Regard calme vers un humain = récompense." },
      { title: "Choix du chien", description: "Il choisit de s'approcher ou non." },
    ],
    contraindications: ["Peur extrême : comportementaliste."],
    tags: ["réactivité", "humains", "désensibilisation"], difficulty: 4,
  }),
  ex({
    id: "react-hum-approche", slug: "gestion-approche-humaine", name: "Gestion approche humaine", category: "reactivite_humains",
    objective: "Gérer l'approche d'un humain sans stress.",
    dedication: "Protocole de gestion des interactions non sollicitées.",
    targetProblems: ["reactivite_humains"],
    level: "avancé", exerciseType: "ciblé", prerequisites: ["react-hum-loin"],
    steps: ["Briefer la personne.", "Approche très lente.", "Le chien peut s'éloigner.", "Récompenser le calme.", "Jamais forcer le contact."],
    tutorialSteps: [
      { title: "Briefing", description: "Expliquez le protocole à la personne." },
      { title: "Approche lente", description: "La personne approche lentement, sans contact visuel." },
      { title: "Choix du chien", description: "Le chien choisit. Jamais de contrainte." },
    ],
    tags: ["réactivité", "humains", "approche", "gestion"], difficulty: 4,
  }),
  ex({
    id: "react-hum-neutralite", slug: "neutralite-passage", name: "Neutralité sur passage", category: "reactivite_humains",
    objective: "Le chien ignore les passants.",
    dedication: "L'objectif final : les humains deviennent neutres.",
    targetProblems: ["reactivite_humains"], level: "avancé", exerciseType: "ciblé",
    steps: ["Marcher dans un lieu modéré.", "Récompenser l'indifférence aux passants.", "Ne jamais forcer l'interaction."],
    tutorialSteps: [
      { title: "Lieu modéré", description: "Rue calme avec quelques passants." },
      { title: "Indifférence", description: "Chaque passant ignoré = récompense." },
      { title: "Progression", description: "Augmentez le flux de passants progressivement." },
    ],
    tags: ["réactivité", "humains", "neutralité", "avancé"], difficulty: 4,
  }),
  ex({
    id: "react-hum-politesse", slug: "politesse-distance", name: "Politesse à distance", category: "reactivite_humains",
    objective: "Interaction polie à distance confortable.",
    dedication: "Interactions sociales positives sans stress.",
    targetProblems: ["reactivite_humains", "saute_gens"],
    level: "intermédiaire", exerciseType: "ciblé",
    steps: ["La personne reste à 3-5m.", "Le chien reste assis ou en laisse.", "Échange verbal calme.", "Récompenser le calme du chien."],
    tutorialSteps: [
      { title: "Distance", description: "La personne reste à 3-5 mètres." },
      { title: "Calme", description: "Le chien reste en position." },
      { title: "Échange positif", description: "L'interaction est calme et courte." },
    ],
    tags: ["politesse", "humains", "distance"], difficulty: 3,
  }),

  // ════════════════════════════════════════
  // ABOIEMENTS / REDIRECTION (3)
  // ════════════════════════════════════════
  ex({
    id: "aboie-redirect", slug: "redirection-aboiement", name: "Redirection sur aboiement", category: "aboiements",
    objective: "Rediriger le chien quand il aboie.",
    dedication: "Casser le cycle avant l'escalade.",
    targetProblems: ["aboiements", "reactivite_chiens"],
    level: "intermédiaire", exerciseType: "ciblé", prerequisites: ["focus-regarde"],
    steps: ["Au premier aboiement, ne pas crier.", "Appeler ou utiliser le focus.", "Marquer le retour.", "Augmenter la distance.", "Travailler le focus préventif."],
    tutorialSteps: [
      { title: "Anticipation", description: "Repérez les signes : corps raide, regard fixe." },
      { title: "Intervention", description: "Focus ou nom AVANT le premier aboiement si possible." },
      { title: "Renforcement", description: "Récompensez chaque moment de calme." },
    ],
    mistakes: ["Crier.", "Punir.", "Ignorer les signaux."],
    tags: ["aboiement", "redirection", "focus"], difficulty: 3,
  }),
  ex({
    id: "aboie-silence", slug: "recompense-silence", name: "Récompense du silence retrouvé", category: "aboiements",
    objective: "Récompenser le retour au calme après aboiement.",
    dedication: "Le silence est un comportement précieux à renforcer.",
    targetProblems: ["aboiements"],
    level: "débutant", exerciseType: "ciblé",
    steps: ["Attendre la fin de l'aboiement.", "Dès le silence (même 1 seconde), marquer.", "Récompenser.", "Augmenter la durée de silence avant marquage."],
    tutorialSteps: [
      { title: "Patience", description: "Attendez une pause dans les aboiements." },
      { title: "Marquage rapide", description: "Dès 1 seconde de silence, marquez !" },
      { title: "Progression", description: "Augmentez à 2s, 5s, 10s de silence." },
    ],
    tags: ["aboiement", "silence", "calme"], difficulty: 2,
  }),
  ex({
    id: "aboie-distance", slug: "gestion-declencheur-distance", name: "Gestion déclencheur à distance", category: "aboiements",
    objective: "Gérer le déclencheur d'aboiement par la distance.",
    dedication: "La distance est votre meilleur outil.",
    targetProblems: ["aboiements", "reactivite_chiens"],
    level: "intermédiaire", exerciseType: "ciblé",
    steps: ["Identifier le déclencheur.", "Se positionner à distance suffisante.", "Récompenser le calme.", "Micro-réduction progressive."],
    tutorialSteps: [
      { title: "Identification", description: "Quel stimulus déclenche l'aboiement ?" },
      { title: "Distance sûre", description: "Éloignez-vous jusqu'au calme." },
      { title: "Travail progressif", description: "Réduisez la distance très lentement." },
    ],
    tags: ["aboiement", "distance", "gestion"], difficulty: 3,
  }),

  // ════════════════════════════════════════
  // CALME / TAPIS / RÉCUPÉRATION (5)
  // ════════════════════════════════════════
  ex({
    id: "calme-tapis", slug: "aller-au-tapis", name: "Aller au tapis (renforcé)", category: "calme",
    objective: "Le tapis = lieu de calme et de sécurité.",
    dedication: "Zone de décompression émotionnelle essentielle.",
    targetProblems: ["hyperactivite", "anxiete", "saute_gens"],
    level: "débutant", exerciseType: "fondation",
    material: ["Tapis", "Friandises"],
    steps: ["Poser le tapis.", "Récompenser chaque interaction.", "Progresser vers 4 pattes + couché.", "Ajouter le signal.", "Espacer les récompenses."],
    tutorialSteps: [
      { title: "Introduction", description: "Posez le tapis, laissez explorer." },
      { title: "Shaping", description: "1 patte, 2, 4, couché = récompenses croissantes." },
      { title: "Autonomie", description: "Le chien choisit le tapis spontanément." },
    ],
    tags: ["calme", "tapis", "relaxation", "sécurité"], difficulty: 1,
  }),
  ex({
    id: "calme-respiration", slug: "respiration-environnement", name: "Respiration d'environnement", category: "calme",
    objective: "Le chien observe le monde calmement sans interagir.",
    dedication: "Observer sans réagir : la base de la sérénité extérieure.",
    targetProblems: ["hyperactivite", "anxiete", "reactivite_chiens"],
    level: "intermédiaire", exerciseType: "récupération", environment: "extérieur calme",
    steps: ["S'asseoir dans un endroit calme.", "Laisser le chien observer.", "Récompenser le calme.", "Ne rien demander.", "Augmenter la durée."],
    tutorialSteps: [
      { title: "Lieu calme", description: "Banc, parc tranquille, terrasse calme." },
      { title: "Observation passive", description: "Le chien regarde le monde, vous ne demandez rien." },
      { title: "Calme renforcé", description: "Friandises douces pour le calme observé." },
    ],
    tags: ["calme", "observation", "extérieur", "sérénité"], difficulty: 2,
  }),
  ex({
    id: "calme-retour", slug: "retour-au-calme", name: "Retour au calme après séance", category: "calme",
    objective: "Redescendre après l'effort ou l'excitation.",
    dedication: "Apprendre à se calmer : compétence de vie.",
    targetProblems: ["hyperactivite"],
    level: "débutant", exerciseType: "récupération",
    steps: ["Fin de séance.", "Aller sur le tapis.", "Récompenser le calme progressif.", "Attendre les signaux de détente.", "Libérer."],
    tutorialSteps: [
      { title: "Transition", description: "Après l'exercice, guidez vers le tapis." },
      { title: "Silence", description: "Ne plus parler, laisser la descente se faire." },
      { title: "Détente", description: "Récompensez les soupirs, le relâchement musculaire." },
    ],
    tags: ["calme", "récupération", "routine", "fin de séance"], difficulty: 1,
  }),
  ex({
    id: "calme-pause", slug: "pause-guidee", name: "Pause guidée", category: "calme",
    objective: "Mini pause structurée pendant la journée.",
    dedication: "Intégrer des moments de calme dans le quotidien.",
    exerciseType: "routine", duration: "3 à 5 min",
    steps: ["Guider vers le tapis.", "S'asseoir à côté.", "Respirer calmement.", "Récompenser le calme.", "Libérer après 3-5 min."],
    tutorialSteps: [
      { title: "Installation", description: "Guidez le chien vers son tapis." },
      { title: "Calme partagé", description: "Asseyez-vous à côté, respirez calmement." },
      { title: "Récompense", description: "Friandises calmes, caresses lentes." },
    ],
    tags: ["calme", "routine", "quotidien", "pause"], difficulty: 1,
  }),
  ex({
    id: "calme-fin-seance", slug: "routine-fin-seance", name: "Routine de fin de séance", category: "calme",
    objective: "Créer un rituel de clôture pour chaque séance.",
    dedication: "Structure et prévisibilité = sécurité pour le chien.",
    exerciseType: "routine", duration: "2 min",
    steps: ["Signal de fin ('C'est fini').", "Dernière récompense calme.", "Tapis ou couché.", "Attente 30s-1min.", "Libérer."],
    tutorialSteps: [
      { title: "Signal", description: "Dites 'C'est fini' d'un ton calme." },
      { title: "Dernière récompense", description: "Une friandise calme, pas excitante." },
      { title: "Transition", description: "Le chien comprend : la séance est terminée." },
    ],
    tags: ["calme", "routine", "structure"], difficulty: 1,
  }),

  // ════════════════════════════════════════
  // RAPPEL (4)
  // ════════════════════════════════════════
  ex({
    id: "rappel-base", slug: "rappel-base", name: "Rappel de base", category: "rappel",
    objective: "Retour fiable vers le maître.",
    dedication: "Sécurité fondamentale : pouvoir rappeler en toute situation.",
    targetProblems: ["rappel_faible"],
    level: "débutant", exerciseType: "fondation",
    material: ["Friandises très haute valeur", "Longe 5m"],
    steps: ["Intérieur.", "Nom + 'Viens !' joyeux.", "Reculer.", "Récompenser à l'arrivée.", "Augmenter distance."],
    tutorialSteps: [
      { title: "Intérieur", description: "Pièce sans distraction." },
      { title: "Ton joyeux", description: "Enthousiasme + reculer pour attirer." },
      { title: "Jackpot", description: "La meilleure récompense possible." },
    ],
    mistakes: ["Courir après.", "Punir à l'arrivée.", "Rappel = fin de jeu."],
    tags: ["rappel", "sécurité", "fondation"], priorityAxis: ["sécurité"],
    difficulty: 2,
  }),
  ex({
    id: "rappel-court", slug: "rappel-court-interieur", name: "Rappel court en intérieur", category: "rappel",
    objective: "Rappel fiable à courte distance.", dedication: "Consolider avant de complexifier.",
    level: "débutant", exerciseType: "fondation", environment: "maison",
    steps: ["Appeler à 2-3m.", "Récompenser.", "Varier les moments.", "Rendre imprévisible."],
    tutorialSteps: [
      { title: "Courte distance", description: "2-3 mètres en intérieur." },
      { title: "Moments variés", description: "Appelez à des moments inattendus." },
      { title: "Récompense forte", description: "Chaque rappel réussi = jackpot." },
    ],
    tags: ["rappel", "intérieur", "base"], difficulty: 1,
  }),
  ex({
    id: "rappel-distraction", slug: "rappel-faible-distraction", name: "Rappel à faible distraction", category: "rappel",
    objective: "Rappel avec des distractions légères.", dedication: "Étape intermédiaire vers le rappel fiable.",
    level: "intermédiaire", exerciseType: "ciblé", prerequisites: ["rappel-base"],
    environment: "extérieur calme", material: ["Friandises", "Longe 10m"],
    steps: ["Extérieur calme avec longe.", "Attendre une légère distraction.", "Appeler.", "Récompenser le retour."],
    tutorialSteps: [
      { title: "Extérieur", description: "Jardin ou parc calme, longe de 10m." },
      { title: "Distraction légère", description: "Odeur, bruit léger au loin." },
      { title: "Rappel", description: "Appelez et récompensez généreusement." },
    ],
    tags: ["rappel", "distraction", "extérieur"], difficulty: 3,
  }),
  ex({
    id: "rappel-jackpot", slug: "jackpot-rappel", name: "Jackpot rappel", category: "rappel",
    objective: "Créer un rappel ultra motivant.", dedication: "Le rappel = la meilleure chose au monde.",
    level: "débutant", exerciseType: "relation",
    steps: ["Rappeler de manière imprévisible.", "Récompenser avec 5-10 friandises d'affilée.", "Jeu, caresses, excitation.", "Le rappel devient la meilleure chose."],
    tutorialSteps: [
      { title: "Imprévisibilité", description: "Rappelez à des moments inattendus." },
      { title: "Jackpot", description: "5-10 friandises, jeu, fête !" },
      { title: "Association", description: "Rappel = moment le plus génial de la journée." },
    ],
    tags: ["rappel", "jackpot", "motivation", "relation"], difficulty: 1,
  }),

  // ════════════════════════════════════════
  // ACCUEIL / POLITESSE (3)
  // ════════════════════════════════════════
  ex({
    id: "accueil-4pattes", slug: "quatre-pattes-au-sol", name: "4 pattes au sol", category: "accueil",
    objective: "Accueillir sans sauter.",
    dedication: "Remplacer le saut par un comportement poli.",
    targetProblems: ["saute_gens", "hyperactivite"],
    level: "intermédiaire", exerciseType: "ciblé",
    material: ["Friandises", "Aide d'une personne"],
    steps: ["Personne approche.", "Si 4 pattes au sol : marquer.", "Si saut : personne se tourne.", "Ajouter assis avant contact."],
    tutorialSteps: [
      { title: "Briefer le visiteur", description: "Expliquez le protocole." },
      { title: "Calme récompensé", description: "4 pattes au sol = récompense." },
      { title: "Saut ignoré", description: "Le visiteur se tourne et s'éloigne." },
    ],
    tags: ["politesse", "accueil", "saut"], difficulty: 3,
  }),
  ex({
    id: "accueil-assis", slug: "assis-avant-salutation", name: "Assis avant salutation", category: "accueil",
    objective: "Le chien s'assoit avant tout contact.", dedication: "Protocole d'accueil structuré.",
    targetProblems: ["saute_gens"], prerequisites: ["pos-assis"],
    level: "intermédiaire", exerciseType: "ciblé",
    steps: ["Personne arrive.", "Demander assis.", "Si assis : la personne peut saluer.", "Si saut : retrait.", "Répéter."],
    tutorialSteps: [
      { title: "Assis", description: "Demandez assis à l'approche du visiteur." },
      { title: "Contact conditionné", description: "Salutation possible uniquement si assis maintenu." },
      { title: "Cohérence", description: "Chaque visiteur applique la même règle." },
    ],
    tags: ["politesse", "assis", "accueil"], difficulty: 3,
  }),
  ex({
    id: "accueil-excitation", slug: "ignorer-excitation", name: "Ignorer la montée en excitation", category: "accueil",
    objective: "Ne pas renforcer l'excitation.", dedication: "L'attention se gagne par le calme.",
    targetProblems: ["hyperactivite", "saute_gens"],
    level: "débutant", exerciseType: "ciblé",
    steps: ["Le chien s'excite.", "Tourner le dos, croiser les bras.", "Attendre le calme.", "Récompenser le calme retrouvé."],
    tutorialSteps: [
      { title: "Excitation", description: "Le chien saute, aboie, s'agite." },
      { title: "Ignorance totale", description: "Dos tourné, aucune interaction." },
      { title: "Calme", description: "Dès que le calme revient, récompensez." },
    ],
    tags: ["politesse", "excitation", "gestion"], difficulty: 2,
  }),

  // ════════════════════════════════════════
  // MUSELIÈRE POSITIVE (3)
  // ════════════════════════════════════════
  ex({
    id: "mus-intro", slug: "museliere-presentation", name: "Présentation positive muselière", category: "museliere",
    objective: "Le chien associe la muselière à du positif.",
    dedication: "Transformer la muselière en objet neutre/positif.",
    targetProblems: ["museliere", "morsure"],
    level: "débutant", exerciseType: "ciblé",
    material: ["Muselière panier", "Friandises"],
    steps: ["Poser la muselière au sol.", "Friandises dessus et dedans.", "Laisser explorer.", "Récompenser chaque interaction."],
    tutorialSteps: [
      { title: "Introduction", description: "Muselière au sol, friandises autour." },
      { title: "Exploration", description: "Le chien la renifle et s'y intéresse." },
      { title: "Association", description: "Chaque contact = récompense." },
    ],
    tags: ["muselière", "sécurité", "habituation"], difficulty: 1, compatibleMuzzle: true,
  }),
  ex({
    id: "mus-nez", slug: "museliere-nez-dedans", name: "Nez dans la muselière", category: "museliere",
    objective: "Le chien met son nez dedans volontairement.", dedication: "Progression vers le port.",
    prerequisites: ["mus-intro"], level: "débutant", exerciseType: "ciblé",
    steps: ["Mettre des friandises au fond.", "Le chien met le nez pour manger.", "Augmenter le temps.", "Ne pas attacher encore."],
    tutorialSteps: [
      { title: "Friandises au fond", description: "Mettez des friandises au fond de la muselière." },
      { title: "Nez dedans", description: "Le chien met le nez pour manger." },
      { title: "Durée", description: "Maintenez 2s, 5s, 10s avant de retirer." },
    ],
    tags: ["muselière", "progression", "nez"], difficulty: 2, compatibleMuzzle: true,
  }),
  ex({
    id: "mus-port", slug: "museliere-port-progressif", name: "Port progressif muselière", category: "museliere",
    objective: "Porter la muselière sereinement.", dedication: "L'objectif final : port calme pendant les sorties.",
    prerequisites: ["mus-nez"], level: "intermédiaire", exerciseType: "ciblé",
    steps: ["Attacher brièvement (2-3s).", "Récompenser.", "Retirer.", "Augmenter la durée.", "Porter pendant activités plaisantes."],
    tutorialSteps: [
      { title: "Port court", description: "Attachez 2-3 secondes, récompensez, retirez." },
      { title: "Progression", description: "Augmentez : 5s, 10s, 30s, 1min." },
      { title: "Activité", description: "Portez la muselière pendant une activité agréable." },
    ],
    tags: ["muselière", "port", "habituation"], difficulty: 3, compatibleMuzzle: true,
  }),

  // ════════════════════════════════════════
  // FRUSTRATION / RENONCEMENT (3)
  // ════════════════════════════════════════
  ex({
    id: "frust-attente", slug: "tolerance-frustration", name: "Tolérance à la frustration simple", category: "frustration",
    objective: "Apprendre à attendre sans s'agiter.", dedication: "La frustration contrôlée développe la résilience.",
    targetProblems: ["frustration", "hyperactivite"],
    level: "débutant", exerciseType: "fondation",
    steps: ["Montrer une friandise.", "La cacher dans la main.", "Attendre le calme.", "Récompenser le calme.", "Augmenter la durée."],
    tutorialSteps: [
      { title: "Tentation", description: "Montrez une friandise, fermez la main." },
      { title: "Attente", description: "Attendez que l'agitation cesse." },
      { title: "Récompense", description: "Le calme ouvre l'accès." },
    ],
    tags: ["frustration", "patience", "calme"], difficulty: 2,
  }),
  ex({
    id: "frust-assis-ressource", slug: "assis-avant-ressource", name: "Assis avant ressource", category: "frustration",
    objective: "Le calme précède chaque ressource.", dedication: "Principe de vie : on gagne l'accès par le calme.",
    targetProblems: ["frustration", "auto_controle"],
    level: "débutant", exerciseType: "fondation", frequency: "Quotidien",
    steps: ["Avant chaque repas : assis.", "Avant chaque sortie : assis.", "Avant chaque jeu : assis.", "Cohérence absolue."],
    tutorialSteps: [
      { title: "Repas", description: "Assis calme avant de poser la gamelle." },
      { title: "Sortie", description: "Assis avant d'ouvrir la porte." },
      { title: "Jeu", description: "Assis avant de lancer le jouet." },
    ],
    tags: ["frustration", "auto-contrôle", "quotidien"], difficulty: 1,
  }),
  ex({
    id: "frust-renoncement-avance", slug: "renoncement-objet-sol", name: "Renoncement objet au sol", category: "frustration",
    objective: "Ignorer un objet intéressant au sol.", dedication: "Auto-contrôle face aux distractions réelles.",
    targetProblems: ["auto_controle"],
    level: "intermédiaire", exerciseType: "ciblé", prerequisites: ["ctrl-non"],
    steps: ["Poser un objet intéressant.", "Marcher devant avec le chien.", "Si le chien tire vers l'objet, s'arrêter.", "S'il détourne, marquer et récompenser."],
    tutorialSteps: [
      { title: "Objet au sol", description: "Posez un jouet ou friandise au sol." },
      { title: "Passage", description: "Marchez devant avec le chien en laisse." },
      { title: "Récompense", description: "Chaque passage calme = récompense." },
    ],
    tags: ["frustration", "renoncement", "auto-contrôle"], difficulty: 3,
  }),

  // ════════════════════════════════════════
  // SOLITUDE / SÉPARATION (3)
  // ════════════════════════════════════════
  ex({
    id: "solo-mini", slug: "mini-absences", name: "Mini absences", category: "solitude",
    objective: "Apprendre à rester seul sereinement.", dedication: "Prévenir l'anxiété de séparation.",
    targetProblems: ["anxiete_separation", "destruction"],
    level: "débutant", exerciseType: "ciblé",
    material: ["Kong fourré", "Jouet d'occupation"],
    steps: ["Quitter la pièce 5s.", "Revenir calmement.", "Augmenter : 10s, 30s, 1min.", "Proposer occupation avant départ.", "Pas de rituels de départ."],
    tutorialSteps: [
      { title: "Micro-absence", description: "Quittez la pièce 5 secondes." },
      { title: "Retour neutre", description: "Revenez sans émotion." },
      { title: "Progression", description: "5s, 10s, 30s, 1min, 5min..." },
    ],
    contraindications: ["Auto-mutilation : vétérinaire."],
    tags: ["solitude", "séparation", "anxiété"], difficulty: 2,
  }),
  ex({
    id: "solo-retour", slug: "retour-neutre", name: "Retour neutre", category: "solitude",
    objective: "Revenir sans renforcer l'excitation.", dedication: "Les retours calmes enseignent que les départs ne sont pas graves.",
    targetProblems: ["anxiete_separation"],
    level: "débutant", exerciseType: "ciblé",
    steps: ["Revenir à la maison.", "Ignorer le chien 1-2 minutes.", "Quand il est calme, saluer doucement.", "Pas de fête au retour."],
    tutorialSteps: [
      { title: "Retour", description: "Rentrez sans fanfare." },
      { title: "Attente", description: "Ignorez 1-2 minutes." },
      { title: "Salutation calme", description: "Quand le calme est là, une caresse douce." },
    ],
    tags: ["solitude", "retour", "calme"], difficulty: 1,
  }),
  ex({
    id: "solo-attente", slug: "attente-calme-separation", name: "Attente calme (séparation)", category: "solitude",
    objective: "Le chien attend calmement dans une autre pièce.", dedication: "Étape vers la solitude sereine.",
    targetProblems: ["anxiete_separation"],
    level: "intermédiaire", exerciseType: "ciblé", prerequisites: ["solo-mini"],
    steps: ["Installer dans une pièce avec occupation.", "Fermer la porte.", "Revenir après 2 min.", "Augmenter progressivement.", "Observer avec caméra."],
    tutorialSteps: [
      { title: "Installation", description: "Pièce confortable, Kong fourré." },
      { title: "Porte fermée", description: "Fermez doucement, partez." },
      { title: "Retour neutre", description: "Revenez après 2 min, sans émotion." },
    ],
    tags: ["solitude", "séparation", "attente"], difficulty: 3,
  }),

  // ════════════════════════════════════════
  // DÉPENSE MENTALE (4)
  // ════════════════════════════════════════
  ex({
    id: "mental-recherche", slug: "recherche-friandises", name: "Recherche de friandises", category: "mental",
    objective: "Stimuler le flair et l'exploration calme.", dedication: "Dépense excellente sans effort physique.",
    targetProblems: ["hyperactivite", "anxiete"],
    level: "débutant", exerciseType: "mental", ageRecommendation: "Tous âges",
    material: ["Friandises", "Tapis de fouille optionnel"],
    steps: ["Montrer les friandises.", "Les disperser.", "Dire 'Cherche !'.", "Laisser explorer.", "Varier les difficultés."],
    tutorialSteps: [
      { title: "Montrer", description: "Montrez les friandises pour créer l'intérêt." },
      { title: "Disperser", description: "Lancez dans l'herbe ou sur un tapis de fouille." },
      { title: "Exploration", description: "Le chien cherche à son rythme." },
    ],
    tags: ["mental", "flair", "calme", "enrichissement"], difficulty: 1,
    compatibleSenior: true, compatiblePuppy: true,
  }),
  ex({
    id: "mental-puzzle", slug: "jeu-resolution", name: "Jeu de résolution", category: "mental",
    objective: "Résoudre un problème pour obtenir une récompense.", dedication: "Intelligence adaptative et résistance à la frustration.",
    targetProblems: ["frustration", "hyperactivite"],
    level: "débutant", exerciseType: "mental",
    material: ["Kong", "Tapis de léchage", "Jouet puzzle"],
    steps: ["Préparer le jouet.", "Présenter.", "Laisser résoudre seul.", "Ne pas aider.", "Varier."],
    tutorialSteps: [
      { title: "Préparation", description: "Remplissez un Kong ou tapis de léchage." },
      { title: "Autonomie", description: "Le chien résout seul." },
      { title: "Variation", description: "Changez les jouets et la difficulté." },
    ],
    tags: ["mental", "puzzle", "enrichissement"], difficulty: 1,
  }),
  ex({
    id: "mental-ciblage", slug: "ciblage-objet", name: "Ciblage d'objet", category: "mental",
    objective: "Le chien touche un objet spécifique avec le nez.", dedication: "Base pour de nombreux exercices avancés.",
    level: "intermédiaire", exerciseType: "mental",
    material: ["Objet cible (post-it, couvercle)", "Friandises"],
    steps: ["Présenter l'objet.", "Marquer quand le chien le renifle.", "Déplacer l'objet.", "Le chien doit le trouver et le toucher."],
    tutorialSteps: [
      { title: "Présentation", description: "Montrez l'objet cible au chien." },
      { title: "Contact", description: "Marquez le moindre contact nez-objet." },
      { title: "Déplacement", description: "Déplacez l'objet, le chien le suit." },
    ],
    tags: ["mental", "ciblage", "avancé"], difficulty: 2,
  }),
  ex({
    id: "mental-choix", slug: "choix-objet", name: "Choix d'objet simple", category: "mental",
    objective: "Le chien choisit le bon objet parmi plusieurs.", dedication: "Discrimination et cognition avancée.",
    level: "avancé", exerciseType: "mental", prerequisites: ["mental-ciblage"],
    steps: ["Présenter 2 objets.", "Récompenser le choix du bon.", "Augmenter à 3 objets.", "Varier."],
    tutorialSteps: [
      { title: "Deux choix", description: "Présentez 2 objets, récompensez le bon choix." },
      { title: "Discrimination", description: "Le chien apprend à distinguer." },
      { title: "Complexité", description: "Augmentez le nombre d'objets." },
    ],
    tags: ["mental", "choix", "cognition"], difficulty: 4,
  }),

  // ════════════════════════════════════════
  // ENRICHMENT / FLAIR (3)
  // ════════════════════════════════════════
  ex({
    id: "enrich-fouille", slug: "tapis-de-fouille", name: "Tapis de fouille", category: "enrichment",
    objective: "Utiliser le flair pour trouver de la nourriture.", dedication: "Enrichissement quotidien calme et satisfaisant.",
    level: "débutant", exerciseType: "mental",
    material: ["Tapis de fouille", "Friandises sèches"],
    steps: ["Disperser les friandises dans le tapis.", "Poser au sol.", "Laisser chercher.", "Varier les cachettes."],
    tutorialSteps: [
      { title: "Préparation", description: "Dispersez les friandises dans les plis du tapis." },
      { title: "Recherche", description: "Le chien utilise son flair pour trouver." },
      { title: "Satisfaction", description: "Activité calme et auto-récompensante." },
    ],
    tags: ["enrichissement", "flair", "calme"], difficulty: 1, compatibleSenior: true,
  }),
  ex({
    id: "enrich-flair-facile", slug: "jeu-flair-facile", name: "Jeu de flair facile", category: "enrichment",
    objective: "Piste olfactive simple en intérieur.", dedication: "Développer le flair et la concentration.",
    level: "débutant", exerciseType: "mental", environment: "maison",
    steps: ["Traîner une friandise au sol pour créer une piste.", "Poser la récompense au bout.", "Dire 'Cherche !'.", "Le chien suit la piste."],
    tutorialSteps: [
      { title: "Piste", description: "Traînez une friandise pour créer un parcours." },
      { title: "Récompense", description: "Grosse récompense au bout de la piste." },
      { title: "Complexification", description: "Allongez la piste, ajoutez des virages." },
    ],
    tags: ["enrichissement", "flair", "intérieur"], difficulty: 1,
  }),
  ex({
    id: "enrich-parcours", slug: "parcours-maison", name: "Parcours maison léger", category: "enrichment",
    objective: "Petit parcours d'obstacles doux en intérieur.", dedication: "Stimulation physique et mentale combinée.",
    level: "débutant", exerciseType: "mental", environment: "maison",
    material: ["Coussins", "Cartons", "Chaises"],
    steps: ["Créer un parcours simple.", "Guider le chien.", "Récompenser chaque obstacle.", "Varier le parcours."],
    tutorialSteps: [
      { title: "Installation", description: "Coussins à enjamber, chaise à contourner." },
      { title: "Guidage", description: "Guidez avec des friandises." },
      { title: "Autonomie", description: "Le chien fait le parcours seul." },
    ],
    tags: ["enrichissement", "parcours", "maison", "proprioception"], difficulty: 1,
    compatiblePuppy: true,
  }),

  // ════════════════════════════════════════
  // TRICKS / TOURS (8)
  // ════════════════════════════════════════
  ex({
    id: "trick-patte", slug: "donne-la-patte", name: "Donne la patte", category: "tricks",
    objective: "Tour de base amusant.", dedication: "Complicité et contact positif.",
    exerciseType: "trick", duration: "5 min",
    steps: ["Friandise dans le poing au sol.", "Attendre le grattage de patte.", "Marquer.", "Ajouter 'Donne la patte'.", "Main ouverte."],
    tutorialSteps: [
      { title: "Leurre", description: "Poing fermé au sol avec friandise." },
      { title: "Capture", description: "Le chien gratte → marquez !" },
      { title: "Signal", description: "Ajoutez 'Donne la patte'." },
    ],
    contraindications: ["Douleurs aux pattes."],
    tags: ["trick", "fun", "relation", "base"], difficulty: 1,
  }),
  ex({
    id: "trick-touche", slug: "touche-la-main", name: "Touche la main (target)", category: "tricks",
    objective: "Le chien touche votre paume avec le nez.", dedication: "Base de tricks et excellent pour rediriger.",
    exerciseType: "trick",
    steps: ["Paume ouverte.", "Marquer le contact nez.", "Récompenser de l'autre main.", "Ajouter 'Touche'.", "Déplacer la main."],
    tutorialSteps: [
      { title: "Paume", description: "Présentez la paume à hauteur du nez." },
      { title: "Contact", description: "La curiosité le pousse à toucher. Marquez !" },
      { title: "Mouvement", description: "Déplacez la main, guidez le chien." },
    ],
    tags: ["trick", "target", "focus", "base"], difficulty: 1,
  }),
  ex({
    id: "trick-tourne", slug: "tourne-spin", name: "Tourne / Spin", category: "tricks",
    objective: "Tour complet sur lui-même.", dedication: "Coordination et connexion.",
    exerciseType: "trick",
    steps: ["Leurrer en cercle.", "Marquer le tour complet.", "Réduire le leurre.", "Ajouter 'Tourne'."],
    tutorialSteps: [
      { title: "Cercle", description: "Guidez le nez en cercle." },
      { title: "Tour complet", description: "Marquez le tour complet." },
      { title: "Signal", description: "Ajoutez 'Tourne', réduisez le leurre." },
    ],
    contraindications: ["Douleurs dorsales.", "Senior avec vertiges."],
    tags: ["trick", "fun", "coordination"], difficulty: 2, compatibleSenior: false,
  }),
  ex({
    id: "trick-recule", slug: "recule", name: "Recule", category: "tricks",
    objective: "Reculer de quelques pas.", dedication: "Conscience corporelle et contrôle spatial.",
    exerciseType: "trick",
    steps: ["Avancer vers le chien.", "Marquer le pas en arrière.", "Augmenter les pas.", "Ajouter 'Recule'."],
    tutorialSteps: [
      { title: "Pression", description: "Avancez calmement, le chien recule." },
      { title: "Marquage", description: "Un pas en arrière = marquer !" },
      { title: "Distance", description: "2, 3, puis 5 pas." },
    ],
    tags: ["trick", "conscience corporelle", "contrôle"], difficulty: 2,
  }),
  ex({
    id: "trick-slalom", slug: "slalom-jambes", name: "Slalom entre les jambes", category: "tricks",
    objective: "Passer en alternance entre les jambes en marchant.", dedication: "Coordination et complicité avancées.",
    exerciseType: "trick", level: "intermédiaire",
    steps: ["Jambes écartées, leurrer sous une jambe.", "Marquer le passage.", "Pas, leurrer sous l'autre.", "Enchaîner.", "Ajouter 'Slalom'."],
    tutorialSteps: [
      { title: "Premier passage", description: "Guidez sous une jambe." },
      { title: "Alternance", description: "Un pas, guidez sous l'autre." },
      { title: "Fluidité", description: "Enchaînez en marchant." },
    ],
    contraindications: ["Chien très grand/petit.", "Douleurs articulaires."],
    tags: ["trick", "coordination", "focus", "avancé"], difficulty: 3,
  }),
  ex({
    id: "trick-salut", slug: "salut", name: "Salut", category: "tricks",
    objective: "Le chien lève une patte avant en position debout.", dedication: "Trick visuellement impressionnant.",
    exerciseType: "trick", level: "intermédiaire", prerequisites: ["trick-patte"],
    steps: ["Depuis donne la patte, lever la main plus haut.", "Marquer la patte levée.", "Ajouter 'Salut'."],
    tutorialSteps: [
      { title: "Depuis la patte", description: "Depuis 'donne la patte', levez la main." },
      { title: "Hauteur", description: "Le chien lève la patte plus haut." },
      { title: "Signal", description: "Ajoutez 'Salut'." },
    ],
    tags: ["trick", "fun", "impressionnant"], difficulty: 3,
  }),
  ex({
    id: "trick-contourne", slug: "contourne-objet", name: "Contourne un objet", category: "tricks",
    objective: "Le chien fait le tour d'un objet.", dedication: "Envoi à distance et contrôle spatial.",
    exerciseType: "trick",
    material: ["Cône ou objet", "Friandises"],
    steps: ["Placer un objet.", "Leurrer autour.", "Marquer le tour complet.", "Augmenter la distance.", "Ajouter 'Contourne'."],
    tutorialSteps: [
      { title: "Objet", description: "Placez un cône ou objet au sol." },
      { title: "Leurre", description: "Guidez le chien autour avec une friandise." },
      { title: "Envoi", description: "Envoyez-le contourner depuis une distance." },
    ],
    tags: ["trick", "distance", "contrôle"], difficulty: 2,
  }),
  ex({
    id: "trick-tapis-va", slug: "va-a-ta-place", name: "Va à ta place", category: "tricks",
    objective: "Aller sur le tapis à distance.", dedication: "Combiner trick et outil de calme.",
    exerciseType: "trick", level: "intermédiaire", prerequisites: ["calme-tapis"],
    material: ["Tapis", "Friandises"],
    steps: ["Tapis à 1m.", "Leurrer vers le tapis.", "Marquer l'arrivée.", "Augmenter la distance.", "Ajouter 'Va au tapis'."],
    tutorialSteps: [
      { title: "Distance courte", description: "1 mètre du tapis." },
      { title: "Guidage", description: "Lancez une friandise ou guidez." },
      { title: "Envoi", description: "Pointez et dites 'Va au tapis'." },
    ],
    tags: ["trick", "calme", "distance", "tapis"], difficulty: 3,
  }),

  // ════════════════════════════════════════
  // RELATION / ENGAGEMENT (4)
  // ════════════════════════════════════════
  ex({
    id: "rel-follow", slug: "follow-me", name: "Follow me", category: "relation",
    objective: "Le chien vous suit joyeusement.", dedication: "Le suivi comme jeu de connexion.",
    exerciseType: "relation",
    steps: ["Marcher de manière intéressante.", "Changer de rythme, de direction.", "Récompenser le suivi.", "Rendre le jeu fun."],
    tutorialSteps: [
      { title: "Mouvement fun", description: "Marchez de façon intéressante." },
      { title: "Variations", description: "Changez de rythme, zigzaguez." },
      { title: "Récompense", description: "Chaque suivi = récompense et jeu." },
    ],
    tags: ["relation", "suivi", "engagement", "fun"], difficulty: 1,
  }),
  ex({
    id: "rel-routine", slug: "routine-connexion", name: "Mini routine de connexion", category: "relation",
    objective: "Séquence courte de connexion maître-chien.", dedication: "5 minutes pour renforcer le lien chaque jour.",
    exerciseType: "routine", duration: "5 min",
    steps: ["Nom + regarde (3 fois).", "Touche la main (3 fois).", "Mini jeu (30s).", "Pause calme.", "Friandise finale."],
    tutorialSteps: [
      { title: "Focus", description: "3 contacts visuels rapides." },
      { title: "Target", description: "3 touches de la main." },
      { title: "Jeu", description: "30 secondes de jeu, puis pause calme." },
    ],
    tags: ["relation", "routine", "connexion", "quotidien"], difficulty: 1,
  }),
  ex({
    id: "rel-contact-spontane", slug: "contact-spontane", name: "Contact spontané renforcé", category: "relation",
    objective: "Renforcer chaque initiative de contact.", dedication: "Le chien vient vers vous = toujours positif.",
    exerciseType: "relation",
    steps: ["Le chien vient vers vous.", "Accueillez chaleureusement.", "Caresse ou friandise.", "Il apprend : aller vers l'humain = bien."],
    tutorialSteps: [
      { title: "Initiative", description: "Le chien s'approche de lui-même." },
      { title: "Accueil", description: "Répondez toujours positivement." },
      { title: "Renforcement", description: "Chaque contact augmente le lien." },
    ],
    tags: ["relation", "contact", "spontané"], difficulty: 1,
  }),
  ex({
    id: "rel-cooperation", slug: "mini-sequence-cooperation", name: "Mini séquence coopération", category: "relation",
    objective: "Enchaîner 3-4 exercices simples en séquence.", dedication: "Travailler ensemble de manière fluide et connectée.",
    exerciseType: "relation", level: "intermédiaire",
    prerequisites: ["focus-regarde", "pos-assis", "trick-touche"],
    steps: ["Regarde → Assis → Touche → OK.", "Récompenser la séquence complète.", "Varier les enchaînements.", "Rendre le travail fluide et joyeux."],
    tutorialSteps: [
      { title: "Séquence simple", description: "Regarde → Assis → Touche → OK." },
      { title: "Fluidité", description: "Enchaînez sans pause." },
      { title: "Récompense finale", description: "Jackpot à la fin de la séquence." },
    ],
    tags: ["relation", "coopération", "séquence", "fluidité"], difficulty: 2,
  }),

  // ════════════════════════════════════════
  // CONFIANCE / PROPRIOCEPTION (3)
  // ════════════════════════════════════════
  ex({
    id: "conf-surfaces", slug: "exploration-surfaces", name: "Exploration de surfaces", category: "confiance",
    objective: "Marcher sur différentes surfaces.", dedication: "Confiance corporelle et réduction de la néophobie.",
    targetProblems: ["anxiete", "peur_bruits"],
    level: "débutant", exerciseType: "fondation",
    material: ["Surfaces variées (carton, grille, bâche, mousse)", "Friandises"],
    steps: ["Poser une surface.", "Laisser explorer.", "Récompenser chaque interaction.", "Ne jamais forcer."],
    tutorialSteps: [
      { title: "Installation", description: "Posez carton, bâche ou mousse au sol." },
      { title: "Exploration", description: "Le chien s'approche à son rythme." },
      { title: "Récompense", description: "Chaque patte posée = récompense." },
    ],
    tags: ["confiance", "proprioception", "habituation"], difficulty: 1,
    compatiblePuppy: true, compatibleSenior: true,
  }),
  ex({
    id: "conf-equilibre", slug: "exercice-equilibre-doux", name: "Exercice d'équilibre doux", category: "confiance",
    objective: "Monter sur un support stable et bas.", dedication: "Conscience du corps et confiance en soi.",
    level: "débutant", exerciseType: "fondation",
    material: ["Coussin ferme ou planche basse", "Friandises"],
    steps: ["Placer un support bas et stable.", "Leurrer le chien dessus.", "2 pattes d'abord, puis 4.", "Récompenser le maintien."],
    tutorialSteps: [
      { title: "Support", description: "Coussin ferme au sol, stable." },
      { title: "Progression", description: "2 pattes, puis 4 pattes dessus." },
      { title: "Maintien", description: "Quelques secondes sur le support." },
    ],
    contraindications: ["Douleurs articulaires sévères."],
    tags: ["confiance", "équilibre", "proprioception"], difficulty: 2,
    compatibleSenior: false,
  }),
  ex({
    id: "conf-nouveaute", slug: "habituation-objets-nouveaux", name: "Habituation objets nouveaux", category: "confiance",
    objective: "Le chien explore de nouveaux objets sans peur.", dedication: "Réduire la néophobie et construire la confiance.",
    level: "débutant", exerciseType: "fondation",
    steps: ["Présenter un objet nouveau.", "Laisser approcher.", "Récompenser l'exploration.", "Varier les objets."],
    tutorialSteps: [
      { title: "Objet", description: "Nouvel objet posé au sol (parapluie, sac)." },
      { title: "Exploration", description: "Le chien s'approche à son rythme." },
      { title: "Association", description: "Chaque interaction = friandise." },
    ],
    tags: ["confiance", "néophobie", "habituation"], difficulty: 1,
    compatiblePuppy: true,
  }),

  // ════════════════════════════════════════
  // CHIOT (4)
  // ════════════════════════════════════════
  ex({
    id: "chiot-mordillement", slug: "mordillement-alternative", name: "Mordillement vers alternative", category: "chiot",
    objective: "Rediriger le mordillement vers un jouet.", dedication: "Inhibition de la morsure : compétence vitale.",
    targetProblems: ["morsure", "hyperactivite"],
    level: "débutant", exerciseType: "fondation", ageRecommendation: "Chiots (8-20 semaines)",
    steps: ["Si morsure forte : 'Aïe' et retirer la main.", "Proposer un jouet.", "Si morsure douce : continuer.", "Si forte : arrêt 10s.", "Reprendre."],
    tutorialSteps: [
      { title: "Signal", description: "'Aïe' et retrait de la main." },
      { title: "Redirection", description: "Proposez un jouet à mâcher." },
      { title: "Cohérence", description: "Chaque morsure forte = fin du jeu." },
    ],
    tags: ["chiot", "morsure", "inhibition"], difficulty: 1,
    compatiblePuppy: true, compatibleSenior: false,
  }),
  ex({
    id: "chiot-focus-court", slug: "focus-ultra-court", name: "Focus ultra court", category: "chiot",
    objective: "1-2 secondes de regard.", dedication: "Première brique de focus pour un chiot.",
    level: "débutant", exerciseType: "fondation", ageRecommendation: "Chiots (8-16 semaines)",
    duration: "2 min",
    steps: ["Friandise vers votre visage.", "Marquer le moindre regard.", "1-2 secondes max.", "Sessions ultra courtes."],
    tutorialSteps: [
      { title: "Leurre", description: "Amenez la friandise vers vos yeux." },
      { title: "Regard", description: "Marquez le moindre contact visuel." },
      { title: "Ultra court", description: "2 min max, 5-6 récompenses." },
    ],
    tags: ["chiot", "focus", "court"], difficulty: 1,
    compatiblePuppy: true, compatibleSenior: false,
  }),
  ex({
    id: "chiot-socialisation", slug: "exploration-sensorielle", name: "Exploration sensorielle", category: "chiot",
    objective: "Habituer le chiot à différents stimuli.", dedication: "Fenêtre de socialisation critique.",
    level: "débutant", exerciseType: "fondation", ageRecommendation: "Chiots (8-16 semaines)",
    duration: "5 min max",
    steps: ["Présenter un nouveau stimulus.", "Laisser explorer.", "Récompenser l'intérêt calme.", "Ne jamais forcer.", "Varier quotidiennement."],
    tutorialSteps: [
      { title: "Stimulus", description: "Nouvel objet, son ou surface." },
      { title: "Exploration", description: "Approche à son rythme." },
      { title: "Positif", description: "Friandise + voix calme = monde sûr." },
    ],
    tags: ["chiot", "socialisation", "habituation"], difficulty: 1,
    compatiblePuppy: true, compatibleSenior: false,
  }),
  ex({
    id: "chiot-suivi-fun", slug: "suivi-fun-chiot", name: "Suivi fun", category: "chiot",
    objective: "Le chiot vous suit avec plaisir.", dedication: "Base du rappel et de la connexion.",
    level: "débutant", exerciseType: "fondation", ageRecommendation: "Chiots (10+ semaines)",
    steps: ["S'accroupir.", "Appeler joyeusement.", "Reculer.", "Récompenser à l'arrivée.", "Faire la fête !"],
    tutorialSteps: [
      { title: "Appel", description: "Accroupissez-vous, voix joyeuse." },
      { title: "Attraction", description: "Reculez pour l'encourager." },
      { title: "Fête", description: "Jackpot de friandises et de joie !" },
    ],
    tags: ["chiot", "suivi", "rappel", "fun"], difficulty: 1,
    compatiblePuppy: true, compatibleSenior: false,
  }),

  // ════════════════════════════════════════
  // SENIOR (4)
  // ════════════════════════════════════════
  ex({
    id: "senior-massage", slug: "routine-massage-calme", name: "Routine de massage calme", category: "senior",
    objective: "Renforcer le lien par le toucher doux.", dedication: "Connexion douce pour chiens âgés ou douloureux.",
    level: "débutant", exerciseType: "récupération", ageRecommendation: "Seniors",
    steps: ["Installer confortablement.", "Caresses lentes le long du dos.", "Pressions douces épaules.", "Observer la détente.", "Friandise calme."],
    tutorialSteps: [
      { title: "Installation", description: "Surface confortable, calme." },
      { title: "Toucher", description: "Caresses lentes et régulières." },
      { title: "Observation", description: "Soupirs, yeux mi-clos = détente." },
    ],
    contraindications: ["Chien qui n'aime pas le contact : ne pas forcer."],
    tags: ["senior", "calme", "relation", "massage"], difficulty: 1,
    compatibleSenior: true, compatiblePuppy: false,
  }),
  ex({
    id: "senior-olfactif", slug: "travail-olfactif-doux", name: "Travail olfactif doux", category: "senior",
    objective: "Stimuler mentalement sans effort physique.", dedication: "Dépense adaptée aux chiens âgés.",
    level: "débutant", exerciseType: "mental", ageRecommendation: "Seniors",
    material: ["Friandises", "Gobelets"],
    steps: ["Gobelets retournés.", "Friandise sous un.", "Le chien cherche.", "Augmenter le nombre.", "Varier."],
    tutorialSteps: [
      { title: "Setup", description: "3 gobelets, friandise sous un." },
      { title: "Recherche", description: "Le chien utilise son flair." },
      { title: "Progression", description: "Plus de gobelets, positions variées." },
    ],
    tags: ["senior", "olfactif", "mental", "calme"], difficulty: 1,
    compatibleSenior: true, compatiblePuppy: false,
  }),
  ex({
    id: "senior-marche-douce", slug: "marche-douce-senior", name: "Marche douce", category: "senior",
    objective: "Promenade adaptée au rythme du chien.", dedication: "Maintenir l'activité sans forcer.",
    level: "débutant", exerciseType: "récupération", ageRecommendation: "Seniors",
    duration: "10 min max", physicalLoad: 1,
    steps: ["Rythme du chien.", "Pauses fréquentes.", "Exploration libre.", "Pas de traction.", "Durée courte."],
    tutorialSteps: [
      { title: "Rythme", description: "Suivez le rythme du chien, pas l'inverse." },
      { title: "Pauses", description: "Laissez renifler, observer, se reposer." },
      { title: "Durée", description: "10 min max, adapter selon la forme." },
    ],
    tags: ["senior", "marche", "doux", "adapté"], difficulty: 1,
    compatibleSenior: true,
  }),
  ex({
    id: "senior-ciblage-calme", slug: "ciblage-calme-senior", name: "Ciblage calme", category: "senior",
    objective: "Touch/target en version douce.", dedication: "Stimulation sans effort physique.",
    level: "débutant", exerciseType: "mental", ageRecommendation: "Seniors",
    steps: ["Présenter la paume à hauteur confortable.", "Marquer le contact.", "Récompenser.", "Pas de mouvements extrêmes."],
    tutorialSteps: [
      { title: "Paume basse", description: "Main à hauteur du nez, sans effort." },
      { title: "Contact doux", description: "Touche léger = récompense." },
      { title: "Rythme lent", description: "Pas de pression, rythme du chien." },
    ],
    tags: ["senior", "ciblage", "doux", "mental"], difficulty: 1,
    compatibleSenior: true,
  }),

  // ════════════════════════════════════════
  // PROFILS SENSIBLES / PRUDENTS (3)
  // ════════════════════════════════════════
  ex({
    id: "sens-distance", slug: "travail-distance-confort", name: "Travail à distance de confort", category: "sensible",
    objective: "Travailler uniquement dans la zone verte.", dedication: "Sécurité émotionnelle en priorité.",
    targetProblems: ["reactivite_chiens", "reactivite_humains", "anxiete"],
    level: "débutant", exerciseType: "ciblé",
    steps: ["Identifier la zone de confort.", "Travailler uniquement dans cette zone.", "Ne jamais forcer la réduction.", "Laisser le temps.", "Observer les signaux."],
    tutorialSteps: [
      { title: "Zone verte", description: "À quelle distance le chien est-il calme ?" },
      { title: "Travail sûr", description: "Restez dans cette zone." },
      { title: "Patience", description: "La progression viendra naturellement." },
    ],
    tags: ["sensible", "distance", "sécurité", "prudent"], difficulty: 2,
  }),
  ex({
    id: "sens-recuperation", slug: "session-recuperation", name: "Session de récupération", category: "sensible",
    objective: "Séance légère après une journée difficile.", dedication: "Le repos fait partie de l'entraînement.",
    exerciseType: "récupération", duration: "5 min",
    steps: ["Tapis calme.", "Recherche facile.", "Massage doux.", "Pas d'exigence.", "Récompenses calmes."],
    tutorialSteps: [
      { title: "Calme", description: "Séance sur le tapis, ambiance détendue." },
      { title: "Facile", description: "Recherche de friandises au sol." },
      { title: "Douceur", description: "Tout est facile, tout est réussi." },
    ],
    tags: ["sensible", "récupération", "calme", "doux"], difficulty: 1,
  }),
  ex({
    id: "sens-surcharge", slug: "gestion-surcharge-emotionnelle", name: "Gestion surcharge émotionnelle", category: "sensible",
    objective: "Réduire l'intensité quand le chien sature.", dedication: "Savoir s'adapter en temps réel.",
    targetProblems: ["anxiete", "reactivite_chiens", "reactivite_humains"],
    level: "intermédiaire", exerciseType: "ciblé",
    steps: ["Reconnaître les signaux de stress.", "Arrêter l'exercice.", "Proposer le tapis.", "Recherche de friandises calme.", "Ne pas insister."],
    tutorialSteps: [
      { title: "Signaux", description: "Halètement, bâillements, détournement." },
      { title: "Arrêt", description: "Arrêtez l'exercice immédiatement." },
      { title: "Redescente", description: "Tapis, calme, friandises au sol." },
    ],
    tags: ["sensible", "surcharge", "gestion", "stress"], difficulty: 2,
  }),
];

// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

export function getExercisesByCategory(category: string): LibraryExercise[] {
  return EXERCISE_LIBRARY.filter((e) => e.category === category);
}

export function getExercisesForProblems(problemKeys: string[]): LibraryExercise[] {
  return EXERCISE_LIBRARY.filter((e) =>
    e.targetProblems.some((tp) => problemKeys.includes(tp))
  );
}

export function getExerciseById(id: string): LibraryExercise | undefined {
  return EXERCISE_LIBRARY.find(e => e.id === id);
}

export function getExerciseBySlug(slug: string): LibraryExercise | undefined {
  return EXERCISE_LIBRARY.find(e => e.slug === slug);
}

export function getExercisesForProfile(options: {
  isPuppy?: boolean;
  isSenior?: boolean;
  isReactive?: boolean;
  hasMuzzle?: boolean;
}): LibraryExercise[] {
  return EXERCISE_LIBRARY.filter(e => {
    if (options.isPuppy && !e.compatiblePuppy) return false;
    if (options.isSenior && !e.compatibleSenior) return false;
    if (options.hasMuzzle && !e.compatibleMuzzle) return false;
    return true;
  });
}

export function getExercisesByTags(tags: string[]): LibraryExercise[] {
  return EXERCISE_LIBRARY.filter(e =>
    tags.some(t => e.tags.includes(t))
  );
}

export function getExercisesByLevel(level: string): LibraryExercise[] {
  return EXERCISE_LIBRARY.filter(e => e.level === level);
}
