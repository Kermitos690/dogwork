export interface TutorialStep {
  title: string;
  description: string;
  imageUrl?: string; // placeholder for real photos
  tip?: string;
}

export interface LibraryExercise {
  id: string;
  name: string;
  category: string;
  categoryIcon: string;
  objective: string;
  dedication: string; // what this exercise is for
  targetProblems: string[];
  level: "débutant" | "intermédiaire" | "avancé";
  duration: string;
  repetitions: string;
  material: string[];
  steps: string[];
  tutorialSteps: TutorialStep[];
  mistakes: string[];
  precautions: string[];
  contraindications: string[];
  tags: string[];
  difficulty: number; // 1-5
  ageRecommendation?: string;
  profileAdaptation?: string;
  coverImage?: string; // placeholder
}

export const EXERCISE_CATEGORIES = [
  { key: "fondations", label: "Fondations", icon: "🏗️", color: "neon-blue" },
  { key: "focus", label: "Focus / Attention", icon: "👁️", color: "neon-cyan" },
  { key: "controle", label: "Contrôle & Auto-contrôle", icon: "🛑", color: "neon-purple" },
  { key: "marche", label: "Marche & Extérieur", icon: "🦮", color: "neon-blue" },
  { key: "reactivite_chiens", label: "Réactivité chiens", icon: "🐕", color: "zone-orange" },
  { key: "reactivite_humains", label: "Réactivité humains", icon: "👤", color: "zone-orange" },
  { key: "calme", label: "Calme / Tapis / Redescente", icon: "🧘", color: "neon-cyan" },
  { key: "aboiements", label: "Aboiements / Redirection", icon: "🔇", color: "zone-orange" },
  { key: "museliere", label: "Muselière positive", icon: "🔒", color: "neon-purple" },
  { key: "rappel", label: "Rappel", icon: "📢", color: "neon-blue" },
  { key: "accueil", label: "Politesse / Accueil", icon: "🤝", color: "neon-cyan" },
  { key: "solitude", label: "Solitude / Frustration", icon: "🏠", color: "neon-purple" },
  { key: "tricks", label: "Tricks / Tours", icon: "🎪", color: "neon-pink" },
  { key: "mental", label: "Dépense mentale", icon: "🧩", color: "neon-cyan" },
  { key: "confiance", label: "Confiance / Proprioception", icon: "🌟", color: "neon-blue" },
  { key: "jeux", label: "Jeux éducatifs", icon: "🎯", color: "neon-pink" },
  { key: "senior", label: "Exercices senior / Doux", icon: "🐾", color: "neon-purple" },
  { key: "chiot", label: "Exercices chiot / Débutant", icon: "🐶", color: "neon-cyan" },
];

export const CATEGORY_KEYS = EXERCISE_CATEGORIES.map(c => c.key);

export const EXERCISE_LIBRARY: LibraryExercise[] = [
  // ═══════════ FONDATIONS ═══════════
  {
    id: "lib-focus-1", name: "Regarde-moi", category: "focus", categoryIcon: "👁️",
    objective: "Obtenir un contact visuel fiable sur commande.",
    dedication: "Base de toute communication : capter l'attention du chien avant toute consigne.",
    targetProblems: ["manque_focus", "reactivite_chiens", "reactivite_humains"],
    level: "débutant", duration: "5 à 10 min", repetitions: "15 à 20 répétitions",
    material: ["Friandises de haute valeur", "Pochette à friandises"],
    difficulty: 1, tags: ["focus", "fondation", "essentiel"],
    steps: [
      "Dire \"Regarde\" une seule fois, d'un ton calme.",
      "Attendre que le chien établisse un contact visuel.",
      "Marquer (\"Oui !\" ou clicker) dès que les yeux se croisent.",
      "Récompenser immédiatement.",
      "Augmenter progressivement la durée du regard avant de marquer."
    ],
    tutorialSteps: [
      { title: "Position de départ", description: "Tenez une friandise près de votre visage pour guider le regard.", tip: "Restez détendu, le chien lit votre énergie." },
      { title: "Contact visuel", description: "Dès que ses yeux croisent les vôtres, marquez immédiatement.", tip: "Le timing est crucial : marquez dans la seconde." },
      { title: "Récompense", description: "Donnez la friandise juste après le marqueur.", tip: "Variez les récompenses pour maintenir la motivation." },
    ],
    mistakes: ["Répéter le mot plusieurs fois.", "Tenir la friandise devant son visage.", "Récompenser sans contact visuel réel."],
    precautions: ["Commencer dans un environnement calme.", "Sessions courtes, terminer sur un succès."],
    contraindications: [],
  },
  {
    id: "lib-focus-2", name: "Focus en mouvement", category: "focus", categoryIcon: "👁️",
    objective: "Maintenir l'attention du chien en marchant.",
    dedication: "Préparer le chien à rester connecté pendant les déplacements extérieurs.",
    targetProblems: ["manque_focus", "tire_laisse"],
    level: "intermédiaire", duration: "10 min", repetitions: "10 séquences de 5 à 10 pas",
    material: ["Friandises", "Laisse standard"],
    difficulty: 2, tags: ["focus", "marche", "connexion"],
    steps: ["Commencer à marcher lentement.", "Dire \"Regarde\" en marchant.", "Récompenser dès que le chien vous regarde tout en marchant.", "Allonger progressivement les séquences."],
    tutorialSteps: [
      { title: "Démarrage", description: "Commencez à marcher lentement dans un endroit calme." },
      { title: "Signal", description: "Dites 'Regarde' en marchant, sans vous arrêter." },
      { title: "Récompense en mouvement", description: "Récompensez immédiatement le regard tout en continuant à marcher." },
    ],
    mistakes: ["Aller trop vite.", "Environnement trop stimulant au début."],
    precautions: ["Rester sous seuil.", "Travailler le focus statique d'abord."],
    contraindications: ["Douleurs articulaires : adapter la durée."],
  },
  {
    id: "lib-stop-1", name: "Stop — arrêt net", category: "controle", categoryIcon: "🛑",
    objective: "Interrompre le déplacement du chien instantanément.",
    dedication: "Outil de sécurité essentiel pour prévenir les situations dangereuses.",
    targetProblems: ["rappel_faible", "reactivite_chiens", "tire_laisse", "ignore_stop"],
    level: "débutant", duration: "10 min", repetitions: "15 répétitions",
    material: ["Friandises", "Laisse"],
    difficulty: 2, tags: ["sécurité", "contrôle", "fondation"],
    steps: ["Marcher avec le chien en laisse.", "S'arrêter net et dire \"Stop\" une seule fois.", "Attendre que le chien s'arrête.", "Marquer et récompenser l'arrêt.", "Reprendre la marche et répéter."],
    tutorialSteps: [
      { title: "Marche", description: "Marchez normalement avec votre chien en laisse." },
      { title: "Arrêt", description: "Arrêtez-vous brusquement et dites 'Stop' fermement mais calmement." },
      { title: "Validation", description: "Dès que le chien s'immobilise, marquez et récompensez." },
    ],
    mistakes: ["Tirer sur la laisse au lieu d'attendre.", "Répéter l'ordre.", "Récompenser un stop approximatif."],
    precautions: ["S'arrêter soi-même clairement.", "Travailler d'abord en intérieur."],
    contraindications: [],
  },
  {
    id: "lib-non-1", name: "Non / Renoncement", category: "controle", categoryIcon: "🛑",
    objective: "Apprendre au chien à renoncer volontairement.",
    dedication: "Développer l'auto-contrôle face aux tentations et distractions.",
    targetProblems: ["ignore_non", "protection_ressources", "auto_controle"],
    level: "débutant", duration: "5 à 10 min", repetitions: "15 répétitions",
    material: ["Friandises (2 types : basse et haute valeur)"],
    difficulty: 2, tags: ["auto-contrôle", "renoncement", "fondation"],
    steps: ["Fermer une friandise dans le poing.", "Présenter le poing au chien.", "Attendre qu'il recule ou détourne la tête.", "Marquer et récompenser de l'autre main.", "Ajouter le signal \"Non\" quand le comportement est fiable."],
    tutorialSteps: [
      { title: "Présentation", description: "Fermez une friandise de faible valeur dans votre poing." },
      { title: "Patience", description: "Laissez le chien renifler, pousser, puis attendre qu'il recule." },
      { title: "Récompense alternative", description: "Récompensez le renoncement avec une friandise de haute valeur de l'autre main." },
    ],
    mistakes: ["Ouvrir la main quand le chien insiste.", "Punir verbalement.", "Ne pas récompenser assez vite."],
    precautions: ["Progresser lentement.", "Ne pas frustrer excessivement."],
    contraindications: ["Protection de ressources sévère : consulter un professionnel."],
  },
  {
    id: "lib-assis-1", name: "Assis tenu", category: "fondations", categoryIcon: "🏗️",
    objective: "Obtenir et maintenir un assis fiable.",
    dedication: "Position de base pour l'accueil, le calme et la gestion des situations.",
    targetProblems: ["saute_gens", "auto_controle", "hyperactivite"],
    level: "débutant", duration: "5 à 10 min", repetitions: "10 à 15 répétitions",
    material: ["Friandises"],
    difficulty: 1, tags: ["fondation", "position", "calme"],
    steps: ["Leurrer le chien en montant la friandise au-dessus de son nez.", "Marquer dès que les fesses touchent le sol.", "Récompenser.", "Ajouter le signal \"Assis\" quand acquis.", "Augmenter la durée progressivement."],
    tutorialSteps: [
      { title: "Leurre", description: "Amenez la friandise au-dessus du nez du chien, il s'assoit naturellement." },
      { title: "Marquage", description: "Marquez et récompensez dès que les fesses touchent le sol." },
      { title: "Durée", description: "Augmentez progressivement le temps avant la récompense : 2s, 5s, 10s." },
    ],
    mistakes: ["Appuyer sur le dos du chien.", "Récompenser un assis qui ne tient pas."],
    precautions: ["Courtes sessions.", "Toujours libérer avec \"OK\"."],
    contraindications: ["Douleurs aux hanches : vérifier avec le vétérinaire."],
  },
  {
    id: "lib-couche-1", name: "Couché tenu", category: "fondations", categoryIcon: "🏗️",
    objective: "Obtenir un couché calme et maintenu.",
    dedication: "Position de repos utilisée pour le calme, le tapis et les situations d'attente.",
    targetProblems: ["auto_controle", "hyperactivite", "anxiete"],
    level: "débutant", duration: "5 à 10 min", repetitions: "10 répétitions",
    material: ["Friandises", "Tapis optionnel"],
    difficulty: 1, tags: ["fondation", "position", "calme"],
    steps: ["Depuis l'assis, descendre lentement la friandise vers le sol.", "Guider vers l'avant si nécessaire.", "Marquer dès que le ventre touche le sol.", "Récompenser.", "Augmenter progressivement la durée."],
    tutorialSteps: [
      { title: "Du assis au couché", description: "Depuis l'assis, descendez la friandise lentement vers le sol." },
      { title: "Guidage", description: "Guidez légèrement vers l'avant pour que le chien s'allonge." },
      { title: "Récompense", description: "Marquez et récompensez dès que le ventre est au sol." },
    ],
    mistakes: ["Pousser le chien vers le bas.", "Aller trop vite en durée."],
    precautions: ["Surface confortable.", "Adapter pour les chiens avec douleurs."],
    contraindications: ["Douleurs articulaires importantes : adapter ou éviter."],
  },
  {
    id: "lib-reste-1", name: "Reste / Pas bouger", category: "controle", categoryIcon: "🛑",
    objective: "Maintenir une position malgré les distractions.",
    dedication: "Apprendre la patience et la stabilité en toutes circonstances.",
    targetProblems: ["auto_controle", "hyperactivite", "frustration"],
    level: "intermédiaire", duration: "10 min", repetitions: "10 répétitions",
    material: ["Friandises", "Laisse longue optionnelle"],
    difficulty: 3, tags: ["contrôle", "patience", "stabilité"],
    steps: ["Demander un assis ou couché.", "Dire \"Reste\" avec geste de la paume.", "Reculer d'un pas.", "Revenir immédiatement et récompenser.", "Augmenter distance et durée progressivement."],
    tutorialSteps: [
      { title: "Position initiale", description: "Mettez le chien en assis ou couché." },
      { title: "Signal", description: "Montrez la paume et dites 'Reste', puis reculez d'un pas." },
      { title: "Retour", description: "Revenez vers le chien et récompensez. Ne l'appelez jamais à vous." },
    ],
    mistakes: ["Augmenter trop vite la distance.", "Appeler le chien au lieu de revenir."],
    precautions: ["Toujours revenir vers le chien.", "Progresser par micro-étapes."],
    contraindications: [],
  },
  // ═══════════ MARCHE ═══════════
  {
    id: "lib-marche-1", name: "Marche connectée", category: "marche", categoryIcon: "🦮",
    objective: "Marcher avec une laisse souple sans traction.",
    dedication: "Transformer la promenade en moment de coopération, pas de lutte.",
    targetProblems: ["tire_laisse", "manque_focus"],
    level: "débutant", duration: "10 à 15 min", repetitions: "10 séquences",
    material: ["Friandises", "Laisse standard", "Harnais recommandé"],
    difficulty: 2, tags: ["marche", "laisse", "connexion"],
    steps: ["Commencer dans un lieu calme.", "Faire 3 à 5 pas, récompenser si laisse souple.", "Si le chien tire, s'arrêter et attendre.", "Récompenser le retour.", "Changer de direction fréquemment."],
    tutorialSteps: [
      { title: "Démarrage", description: "Commencez dans un endroit calme, laisse détendue." },
      { title: "Récompense du calme", description: "Après 3-5 pas avec laisse souple, récompensez." },
      { title: "Gestion de la traction", description: "Si le chien tire, arrêtez-vous. Attendez qu'il revienne." },
    ],
    mistakes: ["Tirer en retour.", "Utiliser une laisse enrouleur.", "Avancer quand la laisse est tendue."],
    precautions: ["Sessions courtes au début.", "Environnement calme."],
    contraindications: ["Douleurs cervicales : utiliser un harnais."],
  },
  {
    id: "lib-demitour-1", name: "Demi-tour d'urgence", category: "marche", categoryIcon: "🦮",
    objective: "Changer de direction immédiatement en cas de déclencheur.",
    dedication: "Outil de sécurité pour éviter les confrontations et gérer les situations imprévues.",
    targetProblems: ["reactivite_chiens", "reactivite_humains", "tire_laisse"],
    level: "intermédiaire", duration: "10 min", repetitions: "10 à 15 répétitions",
    material: ["Friandises très haute valeur", "Laisse courte"],
    difficulty: 3, tags: ["sécurité", "urgence", "marche"],
    steps: ["Marcher normalement.", "Dire \"On y va !\" d'un ton enjoué.", "Faire demi-tour en tournant vers l'extérieur.", "Leurrer avec friandise si nécessaire.", "Récompenser le suivi."],
    tutorialSteps: [
      { title: "Signal joyeux", description: "Utilisez un ton enthousiaste : 'On y va !' ou 'Tourne !'" },
      { title: "Mouvement", description: "Tournez vers l'extérieur, jamais par-dessus le chien." },
      { title: "Récompense", description: "Récompensez généreusement chaque suivi réussi." },
    ],
    mistakes: ["Tirer brusquement.", "Pratiquer la première fois face à un vrai déclencheur."],
    precautions: ["C'est un outil de sécurité, pas une punition."],
    contraindications: [],
  },
  // ═══════════ CALME / TAPIS ═══════════
  {
    id: "lib-tapis-1", name: "Aller au tapis", category: "calme", categoryIcon: "🧘",
    objective: "Créer un lieu de calme et de sécurité.",
    dedication: "Zone de décompression émotionnelle, essentielle pour les chiens réactifs ou anxieux.",
    targetProblems: ["hyperactivite", "anxiete", "saute_gens"],
    level: "débutant", duration: "10 min", repetitions: "10 à 15 répétitions",
    material: ["Tapis ou couverture", "Friandises"],
    difficulty: 1, tags: ["calme", "relaxation", "gestion émotionnelle"],
    steps: ["Poser le tapis au sol.", "Récompenser dès qu'une patte touche le tapis.", "Récompenser les quatre pattes.", "Récompenser le couché.", "Ajouter le signal \"Tapis\"."],
    tutorialSteps: [
      { title: "Introduction", description: "Posez le tapis et laissez le chien l'explorer librement." },
      { title: "Shaping", description: "Récompensez chaque interaction : une patte, deux pattes, quatre pattes." },
      { title: "Couché", description: "Récompensez le couché spontané sur le tapis, puis ajoutez le mot 'Tapis'." },
    ],
    mistakes: ["Forcer le chien sur le tapis.", "Utiliser le tapis comme punition."],
    precautions: ["Le tapis doit toujours être associé à du positif."],
    contraindications: [],
  },
  // ═══════════ ACCUEIL ═══════════
  {
    id: "lib-accueil-1", name: "Accueil sans saut", category: "accueil", categoryIcon: "🤝",
    objective: "Accueillir les visiteurs sans sauter.",
    dedication: "Remplacer le saut par un comportement poli pour des interactions agréables.",
    targetProblems: ["saute_gens", "hyperactivite", "auto_controle"],
    level: "intermédiaire", duration: "10 min", repetitions: "5 à 10 mises en situation",
    material: ["Friandises", "Aide d'une personne"],
    difficulty: 3, tags: ["politesse", "accueil", "gestion"],
    steps: ["Préparer des friandises.", "La personne s'approche lentement.", "Si 4 pattes au sol : marquer et récompenser.", "Si saut : la personne se tourne et s'éloigne.", "Ajouter un assis avant le contact."],
    tutorialSteps: [
      { title: "Briefer le visiteur", description: "Expliquez le protocole à votre assistant avant de commencer." },
      { title: "Récompenser le calme", description: "Dès que les 4 pattes restent au sol, récompensez immédiatement." },
      { title: "Ignorer le saut", description: "Le visiteur se tourne et s'éloigne. Aucun contact pendant le saut." },
    ],
    mistakes: ["Repousser avec les mains.", "Dire 'Non' sans alternative."],
    precautions: ["Briefer les visiteurs.", "Garder en laisse au début."],
    contraindications: [],
  },
  // ═══════════ RÉACTIVITÉ CHIENS ═══════════
  {
    id: "lib-desens-chiens-1", name: "Désensibilisation aux chiens", category: "reactivite_chiens", categoryIcon: "🐕",
    objective: "Réduire la réactivité face aux autres chiens.",
    dedication: "Apprendre au chien à tolérer la présence d'autres chiens à distance croissante.",
    targetProblems: ["reactivite_chiens"],
    level: "avancé", duration: "15 à 20 min", repetitions: "Sessions régulières",
    material: ["Friandises très haute valeur", "Laisse", "Chien neutre à distance"],
    difficulty: 4, tags: ["réactivité", "désensibilisation", "gestion émotionnelle"],
    steps: ["Identifier la distance de confort.", "Se positionner à cette distance ou au-delà.", "Récompenser le calme à la vue de l'autre chien.", "Si réaction : augmenter la distance.", "Réduire par micro-étapes sur plusieurs séances."],
    tutorialSteps: [
      { title: "Trouver la zone verte", description: "Identifiez la distance à laquelle votre chien reste calme." },
      { title: "Association positive", description: "Chaque fois qu'il voit un chien et reste calme, récompensez." },
      { title: "Micro-progression", description: "Réduisez la distance de 1-3m par séance, jamais plus." },
    ],
    mistakes: ["Forcer la proximité.", "Autoriser les contacts nez-à-nez.", "Travailler en zone rouge."],
    precautions: ["Toujours sous seuil.", "Muselière si historique d'agression."],
    contraindications: ["Agression sévère : professionnel uniquement."],
  },
  // ═══════════ RÉACTIVITÉ HUMAINS ═══════════
  {
    id: "lib-desens-humains-1", name: "Désensibilisation aux humains", category: "reactivite_humains", categoryIcon: "👤",
    objective: "Réduire la réactivité face aux humains inconnus.",
    dedication: "Permettre au chien de tolérer la présence d'humains sans stress.",
    targetProblems: ["reactivite_humains", "peur_inconnus"],
    level: "avancé", duration: "15 à 20 min", repetitions: "Sessions régulières",
    material: ["Friandises très haute valeur", "Laisse"],
    difficulty: 4, tags: ["réactivité", "humains", "gestion émotionnelle"],
    steps: ["Observer des humains à grande distance.", "Récompenser le calme et le regard vers vous.", "Progresser par micro-étapes.", "Ne jamais forcer le contact."],
    tutorialSteps: [
      { title: "Observation à distance", description: "Installez-vous à bonne distance d'un lieu passant." },
      { title: "Récompense du calme", description: "Chaque regard calme vers un humain = récompense." },
      { title: "Choix du chien", description: "Laissez le chien choisir de s'approcher ou non." },
    ],
    mistakes: ["Laisser des inconnus approcher.", "Forcer les caresses.", "Travailler en surcharge."],
    precautions: ["Muselière si nécessaire.", "Lieux calmes d'abord."],
    contraindications: ["Peur extrême : comportementaliste."],
  },
  // ═══════════ ABOIEMENTS ═══════════
  {
    id: "lib-aboiement-1", name: "Redirection sur aboiement", category: "aboiements", categoryIcon: "🔇",
    objective: "Rediriger le chien quand il aboie sur un stimulus.",
    dedication: "Casser le cycle d'aboiement avant qu'il ne s'amplifie.",
    targetProblems: ["aboiements", "reactivite_chiens", "reactivite_humains"],
    level: "intermédiaire", duration: "Variable", repetitions: "À chaque occurrence",
    material: ["Friandises haute valeur"],
    difficulty: 3, tags: ["aboiement", "redirection", "focus"],
    steps: ["Au premier aboiement, ne pas crier.", "Appeler le chien ou utiliser le focus.", "Dès qu'il se tourne : marquer et récompenser.", "Augmenter la distance.", "Travailler le focus préventif."],
    tutorialSteps: [
      { title: "Anticipation", description: "Repérez les signes précurseurs : corps qui se raidit, regard fixe." },
      { title: "Intervention", description: "Utilisez le focus ou le nom AVANT le premier aboiement si possible." },
      { title: "Renforcement", description: "Récompensez chaque moment de calme face au stimulus." },
    ],
    mistakes: ["Crier sur le chien.", "Punir physiquement.", "Ignorer les signaux de montée."],
    precautions: ["Identifier les déclencheurs.", "Focus de base d'abord."],
    contraindications: [],
  },
  // ═══════════ MUSELIÈRE ═══════════
  {
    id: "lib-museliere-1", name: "Muselière positive", category: "museliere", categoryIcon: "🔒",
    objective: "Habituer le chien à porter la muselière sereinement.",
    dedication: "Transformer la muselière d'une contrainte en objet neutre voire positif.",
    targetProblems: ["museliere", "agressivite", "morsure"],
    level: "débutant", duration: "5 à 15 min par session", repetitions: "Quotidiennes",
    material: ["Muselière Baskerville ou panier", "Friandises"],
    difficulty: 2, tags: ["muselière", "sécurité", "habituation"],
    steps: ["Jour 1-3 : Présenter, récompenser le reniflement.", "Jour 4-6 : Friandises dans la muselière.", "Jour 7-10 : Attacher brièvement (2-3s).", "Jour 11-15 : Augmenter la durée.", "Jour 16+ : Porter pendant activités plaisantes."],
    tutorialSteps: [
      { title: "Introduction", description: "Posez la muselière au sol avec des friandises dessus et dedans." },
      { title: "Association positive", description: "Le chien met le nez dedans pour manger = récompense supplémentaire." },
      { title: "Port progressif", description: "Attachez brièvement (2-3s), récompensez, retirez. Augmentez très lentement." },
    ],
    mistakes: ["Forcer d'un coup.", "N'utiliser que pour le négatif.", "Muselière en tissu."],
    precautions: ["Muselière panier pour boire/haleter.", "Ne jamais précipiter."],
    contraindications: [],
  },
  // ═══════════ RAPPEL ═══════════
  {
    id: "lib-rappel-1", name: "Rappel de base", category: "rappel", categoryIcon: "📢",
    objective: "Obtenir un retour fiable vers le maître.",
    dedication: "Sécurité fondamentale : pouvoir rappeler son chien en toute situation.",
    targetProblems: ["rappel_faible"],
    level: "débutant", duration: "10 min", repetitions: "15 à 20 répétitions",
    material: ["Friandises très haute valeur", "Longe 5m optionnelle"],
    difficulty: 2, tags: ["rappel", "sécurité", "fondation"],
    steps: ["Commencer en intérieur.", "Nom + \"Viens !\" d'un ton joyeux.", "Reculer pour encourager.", "Récompenser à l'arrivée.", "Augmenter distance et distractions."],
    tutorialSteps: [
      { title: "Intérieur d'abord", description: "Commencez dans une pièce sans distraction." },
      { title: "Ton joyeux", description: "Appelez avec enthousiasme et reculez pour attirer." },
      { title: "Jackpot", description: "Le rappel réussi = la meilleure récompense possible." },
    ],
    mistakes: ["Courir après le chien.", "Punir à l'arrivée.", "Rappel pour fin de jeu sans récompense."],
    precautions: ["Longe en extérieur non sécurisé.", "Toujours récompenser le retour."],
    contraindications: [],
  },
  // ═══════════ SOLITUDE ═══════════
  {
    id: "lib-solitude-1", name: "Solitude progressive", category: "solitude", categoryIcon: "🏠",
    objective: "Apprendre au chien à rester seul sereinement.",
    dedication: "Prévenir l'anxiété de séparation et les destructions.",
    targetProblems: ["anxiete_separation", "destruction"],
    level: "intermédiaire", duration: "Sessions progressives", repetitions: "Quotidien",
    material: ["Kong fourré", "Jouet d'occupation", "Caméra optionnelle"],
    difficulty: 3, tags: ["solitude", "anxiété", "autonomie"],
    steps: ["Courtes absences (5s).", "Revenir calmement.", "Augmenter progressivement.", "Proposer occupation avant de partir.", "Pas de rituels de départ."],
    tutorialSteps: [
      { title: "Micro-absences", description: "Quittez la pièce 5 secondes, revenez calmement." },
      { title: "Progression", description: "Augmentez : 10s, 30s, 1min, 5min. Jamais de grands sauts." },
      { title: "Occupation", description: "Proposez un Kong fourré ou tapis de léchage avant de partir." },
    ],
    mistakes: ["Augmenter trop vite.", "Punir les destructions.", "Au revoir émotionnels."],
    precautions: ["Vétérinaire si anxiété sévère.", "Caméra pour observer."],
    contraindications: ["Auto-mutilation : vétérinaire comportementaliste obligatoire."],
  },
  // ═══════════ AUTO-CONTRÔLE ═══════════
  {
    id: "lib-auto-1", name: "Attendre la gamelle", category: "controle", categoryIcon: "🛑",
    objective: "Apprendre la patience et l'auto-régulation.",
    dedication: "Le calme ouvre l'accès aux ressources : leçon fondamentale.",
    targetProblems: ["frustration", "hyperactivite", "auto_controle"],
    level: "débutant", duration: "5 min", repetitions: "À chaque repas",
    material: ["Gamelle", "Nourriture"],
    difficulty: 1, tags: ["auto-contrôle", "patience", "quotidien"],
    steps: ["Tenir la gamelle en hauteur.", "Descendre lentement.", "Si le chien bouge, remonter.", "Poser quand il reste immobile.", "Libérer avec \"OK\"."],
    tutorialSteps: [
      { title: "Préparation", description: "Tenez la gamelle à hauteur de poitrine, le chien en face." },
      { title: "Test de patience", description: "Descendez lentement. Si le chien bouge, remontez." },
      { title: "Libération", description: "Posez la gamelle quand il est immobile, dites 'OK' pour libérer." },
    ],
    mistakes: ["Poser malgré l'excitation.", "Crier au lieu de remonter."],
    precautions: ["Patience.", "Adapter pour les chiots."],
    contraindications: ["Protection de ressources alimentaire : professionnel."],
  },
  // ═══════════ TRICKS / TOURS ═══════════
  {
    id: "lib-trick-patte", name: "Donne la patte", category: "tricks", categoryIcon: "🎪",
    objective: "Tour de base amusant et valorisant.",
    dedication: "Créer de la complicité, renforcer la coopération et le contact positif.",
    targetProblems: [], level: "débutant", duration: "5 min", repetitions: "10 répétitions",
    material: ["Friandises"],
    difficulty: 1, tags: ["trick", "fun", "relation"], ageRecommendation: "Tous âges",
    steps: ["Présenter une friandise dans le poing fermé au sol.", "Attendre que le chien gratte avec sa patte.", "Marquer et récompenser dès que la patte touche la main.", "Ajouter le signal 'Donne la patte'.", "Passer de la main fermée à la main ouverte paume vers le haut."],
    tutorialSteps: [
      { title: "Leurre au sol", description: "Friandise dans le poing fermé posé au sol." },
      { title: "Capture", description: "Le chien finira par gratter avec sa patte. Marquez !" },
      { title: "Signal", description: "Ajoutez 'Donne la patte' quand il le fait spontanément." },
    ],
    mistakes: ["Prendre la patte soi-même.", "Sessions trop longues."],
    precautions: ["Doux avec les pattes sensibles."], contraindications: ["Douleurs aux pattes."],
  },
  {
    id: "lib-trick-touche", name: "Touche la main (target)", category: "tricks", categoryIcon: "🎪",
    objective: "Le chien touche votre paume avec son nez sur commande.",
    dedication: "Base de nombreux tricks et excellent pour rediriger l'attention.",
    targetProblems: ["manque_focus"], level: "débutant", duration: "5 min", repetitions: "15 répétitions",
    material: ["Friandises"],
    difficulty: 1, tags: ["trick", "target", "focus"], ageRecommendation: "Tous âges",
    steps: ["Présenter la paume ouverte.", "Marquer dès que le nez touche.", "Récompenser de l'autre main.", "Ajouter 'Touche'.", "Déplacer la main dans différentes directions."],
    tutorialSteps: [
      { title: "Présentation", description: "Montrez votre paume ouverte à hauteur du nez du chien." },
      { title: "Contact", description: "La curiosité naturelle le pousse à toucher. Marquez !" },
      { title: "Déplacements", description: "Déplacez votre main pour guider le chien dans l'espace." },
    ],
    mistakes: ["Pousser la main sur le nez.", "Récompenser sans vrai contact."],
    precautions: [], contraindications: [],
  },
  {
    id: "lib-trick-tourne", name: "Tourne / Spin", category: "tricks", categoryIcon: "🎪",
    objective: "Le chien fait un tour complet sur lui-même.",
    dedication: "Exercice fun qui développe la coordination et la connexion.",
    targetProblems: [], level: "débutant", duration: "5 min", repetitions: "10 répétitions",
    material: ["Friandises"],
    difficulty: 2, tags: ["trick", "fun", "coordination"], ageRecommendation: "Adultes et jeunes",
    steps: ["Leurrer le chien en cercle avec une friandise.", "Marquer quand il complète le tour.", "Récompenser.", "Réduire le leurre progressivement.", "Ajouter le signal 'Tourne'."],
    tutorialSteps: [
      { title: "Leurre circulaire", description: "Guidez le nez du chien en cercle avec une friandise." },
      { title: "Tour complet", description: "Marquez et récompensez quand il fait un tour complet." },
      { title: "Signal verbal", description: "Ajoutez 'Tourne' et réduisez le leurre." },
    ],
    mistakes: ["Cercle trop grand.", "Tourner trop vite."],
    precautions: ["Éviter si vertiges connus."], contraindications: ["Douleurs dorsales.", "Chien senior : évaluer."],
    profileAdaptation: "Pas recommandé pour les chiens seniors avec problèmes dorsaux.",
  },
  {
    id: "lib-trick-slalom", name: "Slalom entre les jambes", category: "tricks", categoryIcon: "🎪",
    objective: "Le chien passe en alternance entre les jambes du maître en marchant.",
    dedication: "Exercice de coordination, de focus et de complicité avancé.",
    targetProblems: ["manque_focus"], level: "intermédiaire", duration: "10 min", repetitions: "5 à 8 séquences",
    material: ["Friandises"],
    difficulty: 3, tags: ["trick", "coordination", "focus"], ageRecommendation: "Adultes",
    steps: ["Jambes écartées, leurrer le chien sous une jambe.", "Marquer le passage.", "Faire un pas, leurrer sous l'autre jambe.", "Enchaîner les passages.", "Ajouter le signal 'Slalom'."],
    tutorialSteps: [
      { title: "Premier passage", description: "Jambes écartées, guidez le chien sous une jambe." },
      { title: "Alternance", description: "Faites un pas et guidez sous l'autre jambe." },
      { title: "Fluidité", description: "Enchaînez en marchant, le chien slalome naturellement." },
    ],
    mistakes: ["Jambes trop serrées.", "Aller trop vite."],
    precautions: ["Chien de taille adaptée."], contraindications: ["Chien très grand ou très petit.", "Douleurs articulaires."],
  },
  {
    id: "lib-trick-recule", name: "Recule", category: "tricks", categoryIcon: "🎪",
    objective: "Le chien recule de quelques pas sur commande.",
    dedication: "Développe la conscience corporelle et le contrôle spatial.",
    targetProblems: [], level: "intermédiaire", duration: "5 min", repetitions: "10 répétitions",
    material: ["Friandises"],
    difficulty: 2, tags: ["trick", "conscience corporelle", "contrôle"],
    steps: ["Face au chien, avancer d'un pas vers lui.", "Dès qu'il recule d'un pas, marquer.", "Récompenser.", "Augmenter le nombre de pas.", "Ajouter 'Recule'."],
    tutorialSteps: [
      { title: "Pression spatiale", description: "Avancez calmement vers le chien, il recule naturellement." },
      { title: "Marquage", description: "Marquez le moindre pas en arrière." },
      { title: "Distance", description: "Augmentez à 2, 3, puis 5 pas." },
    ],
    mistakes: ["Pousser physiquement.", "Aller trop vite."],
    precautions: [], contraindications: [],
  },
  {
    id: "lib-trick-tapis-va", name: "Va sur ton tapis", category: "tricks", categoryIcon: "🎪",
    objective: "Le chien va sur son tapis à distance sur commande.",
    dedication: "Combiner le trick et l'outil de calme pour un envoi à distance.",
    targetProblems: ["hyperactivite", "saute_gens"], level: "intermédiaire",
    duration: "10 min", repetitions: "10 répétitions",
    material: ["Tapis", "Friandises"],
    difficulty: 3, tags: ["trick", "calme", "distance"],
    steps: ["Placer le tapis à 1m.", "Leurrer le chien vers le tapis.", "Marquer et récompenser l'arrivée.", "Augmenter la distance.", "Ajouter 'Va au tapis'."],
    tutorialSteps: [
      { title: "Distance courte", description: "Commencez à 1 mètre du tapis." },
      { title: "Guidage", description: "Lancez une friandise sur le tapis ou guidez avec la main." },
      { title: "Envoi à distance", description: "Pointez vers le tapis et dites 'Va au tapis'." },
    ],
    mistakes: ["Distance trop grande au début."], precautions: [], contraindications: [],
  },
  // ═══════════ DÉPENSE MENTALE ═══════════
  {
    id: "lib-mental-recherche", name: "Recherche de friandises", category: "mental", categoryIcon: "🧩",
    objective: "Stimuler le flair et l'exploration calme.",
    dedication: "Dépense mentale excellente sans effort physique, idéale après séance ou pour chiens seniors.",
    targetProblems: ["hyperactivite", "anxiete", "frustration"],
    level: "débutant", duration: "10 à 15 min", repetitions: "3 à 5 séances par semaine",
    material: ["Friandises", "Tapis de fouille optionnel"],
    difficulty: 1, tags: ["mental", "flair", "calme"], ageRecommendation: "Tous âges",
    steps: ["Montrer les friandises au chien.", "Les disperser au sol dans l'herbe.", "Dire 'Cherche !'.", "Laisser le chien explorer à son rythme.", "Augmenter la difficulté (cachettes, pièces)."],
    tutorialSteps: [
      { title: "Montrer", description: "Montrez les friandises au chien pour créer l'intérêt." },
      { title: "Disperser", description: "Lancez les friandises dans l'herbe ou sur un tapis de fouille." },
      { title: "Exploration", description: "Laissez le chien chercher à son rythme, c'est la dépense." },
    ],
    mistakes: ["Aider trop vite.", "Endroits trop difficiles au début."],
    precautions: ["Surveiller ce qu'il mange."], contraindications: [],
  },
  {
    id: "lib-mental-puzzle", name: "Jeu de résolution", category: "mental", categoryIcon: "🧩",
    objective: "Résoudre un petit problème pour obtenir une récompense.",
    dedication: "Développer l'intelligence adaptative et la résistance à la frustration.",
    targetProblems: ["frustration", "hyperactivite"],
    level: "débutant", duration: "10 min", repetitions: "1 à 2 sessions par jour",
    material: ["Kong", "Tapis de léchage", "Jouet puzzle"],
    difficulty: 1, tags: ["mental", "puzzle", "enrichissement"], ageRecommendation: "Tous âges",
    steps: ["Préparer le jouet avec de la nourriture.", "Présenter au chien.", "Laisser trouver la solution seul.", "Féliciter sans aider.", "Varier les jouets et la difficulté."],
    tutorialSteps: [
      { title: "Préparation", description: "Remplissez un Kong ou tapis de léchage." },
      { title: "Présentation", description: "Donnez le jouet au chien dans un endroit calme." },
      { title: "Autonomie", description: "Laissez-le résoudre seul. N'aidez pas." },
    ],
    mistakes: ["Aider le chien.", "Jouet trop difficile."],
    precautions: ["Adapter la difficulté au niveau."], contraindications: [],
  },
  // ═══════════ CONFIANCE / PROPRIOCEPTION ═══════════
  {
    id: "lib-confiance-surfaces", name: "Exploration de surfaces", category: "confiance", categoryIcon: "🌟",
    objective: "Habituer le chien à marcher sur différentes surfaces.",
    dedication: "Développer la confiance corporelle et réduire la néophobie.",
    targetProblems: ["anxiete", "peur_bruits"],
    level: "débutant", duration: "10 min", repetitions: "5 surfaces différentes",
    material: ["Surfaces variées (carton, grille, bâche, mousse)", "Friandises"],
    difficulty: 1, tags: ["confiance", "proprioception", "habituation"], ageRecommendation: "Tous âges",
    steps: ["Poser une surface au sol.", "Laisser le chien explorer.", "Récompenser chaque interaction.", "Augmenter progressivement les textures.", "Ne jamais forcer."],
    tutorialSteps: [
      { title: "Installation", description: "Posez un morceau de carton, bâche ou mousse au sol." },
      { title: "Exploration libre", description: "Laissez le chien s'approcher et explorer à son rythme." },
      { title: "Récompense", description: "Récompensez chaque patte posée, chaque interaction." },
    ],
    mistakes: ["Forcer le chien sur la surface.", "Trop de surfaces d'un coup."],
    precautions: ["Surfaces stables et sûres."], contraindications: [],
  },
  // ═══════════ JEUX ÉDUCATIFS ═══════════
  {
    id: "lib-jeu-cache", name: "Cache-cache éducatif", category: "jeux", categoryIcon: "🎯",
    objective: "Renforcer le rappel de façon ludique.",
    dedication: "Combiner le jeu et l'apprentissage pour un rappel joyeux et fiable.",
    targetProblems: ["rappel_faible", "manque_focus"],
    level: "débutant", duration: "10 min", repetitions: "5 à 8 tours",
    material: ["Friandises très haute valeur"],
    difficulty: 1, tags: ["jeu", "rappel", "fun"], ageRecommendation: "Tous âges",
    steps: ["Quelqu'un tient le chien.", "Vous allez vous cacher (facile au début).", "Appellez joyeusement.", "Récompensez généreusement à l'arrivée.", "Augmentez la difficulté des cachettes."],
    tutorialSteps: [
      { title: "Aide", description: "Un partenaire retient gentiment le chien." },
      { title: "Cachette facile", description: "Cachez-vous derrière un meuble visible." },
      { title: "Rappel joyeux", description: "Appelez avec enthousiasme. Jackpot à l'arrivée !" },
    ],
    mistakes: ["Se cacher trop bien au début.", "Ne pas récompenser."],
    precautions: ["Environnement sécurisé."], contraindications: [],
  },
  // ═══════════ SENIOR ═══════════
  {
    id: "lib-senior-massage", name: "Routine de massage calme", category: "senior", categoryIcon: "🐾",
    objective: "Renforcer le lien par le toucher calme.",
    dedication: "Séance de connexion douce adaptée aux chiens âgés ou douloureux.",
    targetProblems: ["anxiete"],
    level: "débutant", duration: "5 à 10 min", repetitions: "Quotidien",
    material: [],
    difficulty: 1, tags: ["senior", "calme", "relation"], ageRecommendation: "Seniors et chiens douloureux",
    steps: ["Installer le chien confortablement.", "Caresses lentes le long du dos.", "Pressions douces sur les épaules.", "Observer les signaux de détente.", "Terminer par une friandise calme."],
    tutorialSteps: [
      { title: "Installation", description: "Chien allongé sur une surface confortable." },
      { title: "Toucher doux", description: "Caresses lentes et régulières le long du dos." },
      { title: "Observation", description: "Observez les signes de détente : soupirs, yeux mi-clos." },
    ],
    mistakes: ["Mouvements brusques.", "Zones sensibles sans observation."],
    precautions: ["Éviter les zones douloureuses.", "Arrêter si le chien se tend."],
    contraindications: ["Chien qui n'aime pas le contact : ne pas forcer."],
    profileAdaptation: "Parfait pour les chiens seniors avec limitations physiques.",
  },
  {
    id: "lib-senior-nose", name: "Travail olfactif doux", category: "senior", categoryIcon: "🐾",
    objective: "Stimuler mentalement sans effort physique.",
    dedication: "Dépense mentale adaptée aux chiens âgés ou convalescents.",
    targetProblems: ["hyperactivite", "anxiete"],
    level: "débutant", duration: "10 min", repetitions: "1 à 2 par jour",
    material: ["Friandises", "Boîtes ou gobelets"],
    difficulty: 1, tags: ["senior", "olfactif", "mental"], ageRecommendation: "Seniors",
    steps: ["Placer des gobelets retournés.", "Cacher une friandise sous un.", "Laisser le chien chercher.", "Augmenter le nombre de gobelets.", "Varier les cachettes."],
    tutorialSteps: [
      { title: "Setup", description: "3 gobelets retournés, friandise sous un seul." },
      { title: "Recherche", description: "Le chien doit trouver le bon gobelet avec son flair." },
      { title: "Progression", description: "Ajoutez des gobelets, changez les positions." },
    ],
    mistakes: ["Trop de gobelets au début.", "Aider le chien."],
    precautions: ["Gobelets stables."], contraindications: [],
    profileAdaptation: "Idéal pour les chiens à mobilité réduite.",
  },
  // ═══════════ CHIOT ═══════════
  {
    id: "lib-chiot-socialisation", name: "Exploration sensorielle", category: "chiot", categoryIcon: "🐶",
    objective: "Habituer le chiot à différents stimuli de façon positive.",
    dedication: "Fenêtre de socialisation critique : exposition positive à un maximum de stimuli.",
    targetProblems: ["anxiete", "peur_bruits"],
    level: "débutant", duration: "5 min max", repetitions: "Quotidien",
    material: ["Objets variés", "Friandises"],
    difficulty: 1, tags: ["chiot", "socialisation", "habituation"], ageRecommendation: "Chiots (8-16 semaines)",
    steps: ["Présenter un nouvel objet/son/surface.", "Laisser explorer librement.", "Récompenser l'intérêt calme.", "Ne jamais forcer l'approche.", "Varier les stimuli quotidiennement."],
    tutorialSteps: [
      { title: "Nouveau stimulus", description: "Présentez un objet nouveau à distance." },
      { title: "Exploration", description: "Laissez le chiot s'approcher à son rythme." },
      { title: "Association positive", description: "Friandise + voix calme = monde sûr." },
    ],
    mistakes: ["Submerger de stimuli.", "Forcer le contact."],
    precautions: ["Sessions ultra courtes (5 min).", "Observer les signaux de stress."],
    contraindications: [],
    profileAdaptation: "Exclusivement pour les chiots en période de socialisation.",
  },
  {
    id: "lib-chiot-inhibition", name: "Inhibition de la morsure", category: "chiot", categoryIcon: "🐶",
    objective: "Apprendre au chiot à contrôler la pression de sa mâchoire.",
    dedication: "Compétence vitale à acquérir avant 4-5 mois pour prévenir les morsures futures.",
    targetProblems: ["morsure", "hyperactivite"],
    level: "débutant", duration: "En continu", repetitions: "À chaque interaction",
    material: ["Jouets de mâchouillage"],
    difficulty: 1, tags: ["chiot", "morsure", "inhibition"], ageRecommendation: "Chiots (8-20 semaines)",
    steps: ["Si le chiot mord trop fort, dire 'Aïe' et retirer la main.", "Proposer un jouet en remplacement.", "Si morsure douce : ignorer ou continuer le jeu.", "Si morsure forte : arrêt du jeu 10 secondes.", "Reprendre calmement."],
    tutorialSteps: [
      { title: "Signal", description: "Si la morsure est trop forte, dites 'Aïe' et retirez la main." },
      { title: "Redirection", description: "Proposez immédiatement un jouet à mâcher." },
      { title: "Cohérence", description: "Chaque morsure forte = fin du jeu 10 secondes." },
    ],
    mistakes: ["Punir physiquement.", "Jeux de mains excitants.", "Ignorer les morsures fortes."],
    precautions: ["Patience.", "Toute la famille doit être cohérente."],
    contraindications: [],
  },
];

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
