export interface LibraryExercise {
  id: string;
  name: string;
  category: string;
  objective: string;
  targetProblems: string[];
  level: "débutant" | "intermédiaire" | "avancé";
  duration: string;
  repetitions: string;
  material: string[];
  steps: string[];
  mistakes: string[];
  precautions: string[];
  contraindications: string[];
}

export const EXERCISE_CATEGORIES = [
  "Focus / Regarde",
  "Stop",
  "Non / Renoncement",
  "Assis",
  "Couché",
  "Reste / Maintien",
  "Marche en laisse",
  "Auto-contrôle",
  "Tapis / Calme",
  "Accueil sans saut",
  "Demi-tour d'urgence",
  "Désensibilisation chiens",
  "Désensibilisation humains",
  "Redirection aboiement",
  "Muselière positive",
  "Rappel de base",
  "Solitude progressive",
];

export const EXERCISE_LIBRARY: LibraryExercise[] = [
  {
    id: "lib-focus-1",
    name: "Regarde-moi",
    category: "Focus / Regarde",
    objective: "Obtenir un contact visuel fiable sur commande.",
    targetProblems: ["manque_focus", "reactivite_chiens", "reactivite_humains"],
    level: "débutant",
    duration: "5 à 10 min",
    repetitions: "15 à 20 répétitions",
    material: ["Friandises de haute valeur", "Pochette à friandises"],
    steps: [
      "Dire \"Regarde\" une seule fois, d'un ton calme.",
      "Attendre que le chien établisse un contact visuel.",
      "Marquer (\"Oui !\" ou clicker) dès que les yeux se croisent.",
      "Récompenser immédiatement.",
      "Augmenter progressivement la durée du regard avant de marquer."
    ],
    mistakes: [
      "Répéter le mot plusieurs fois.",
      "Tenir la friandise devant son visage (le chien regarde la nourriture, pas vous).",
      "Récompenser sans contact visuel réel."
    ],
    precautions: [
      "Commencer dans un environnement calme et sans distraction.",
      "Sessions courtes, toujours terminer sur un succès."
    ],
    contraindications: [],
  },
  {
    id: "lib-focus-2",
    name: "Focus en mouvement",
    category: "Focus / Regarde",
    objective: "Maintenir l'attention du chien en marchant.",
    targetProblems: ["manque_focus", "tire_laisse"],
    level: "intermédiaire",
    duration: "10 min",
    repetitions: "10 séquences de 5 à 10 pas",
    material: ["Friandises", "Laisse standard"],
    steps: [
      "Commencer à marcher lentement.",
      "Dire \"Regarde\" en marchant.",
      "Récompenser dès que le chien vous regarde tout en continuant à marcher.",
      "Allonger progressivement les séquences."
    ],
    mistakes: [
      "Aller trop vite.",
      "Travailler dans un environnement trop stimulant au début."
    ],
    precautions: ["Rester sous seuil.", "Travailler d'abord le focus statique."],
    contraindications: ["Chien avec douleurs articulaires : adapter la durée."],
  },
  {
    id: "lib-stop-1",
    name: "Stop — arrêt net",
    category: "Stop",
    objective: "Interrompre le déplacement du chien instantanément.",
    targetProblems: ["rappel_faible", "reactivite_chiens", "tire_laisse"],
    level: "débutant",
    duration: "10 min",
    repetitions: "15 répétitions",
    material: ["Friandises", "Laisse"],
    steps: [
      "Marcher avec le chien en laisse.",
      "S'arrêter net et dire \"Stop\" une seule fois.",
      "Attendre que le chien s'arrête.",
      "Marquer et récompenser l'arrêt.",
      "Reprendre la marche et répéter."
    ],
    mistakes: [
      "Tirer sur la laisse au lieu d'attendre.",
      "Répéter l'ordre.",
      "Récompenser un stop approximatif."
    ],
    precautions: ["S'arrêter soi-même clairement.", "Travailler d'abord en intérieur."],
    contraindications: [],
  },
  {
    id: "lib-non-1",
    name: "Non / Renoncement à la friandise",
    category: "Non / Renoncement",
    objective: "Apprendre au chien à renoncer volontairement.",
    targetProblems: ["ignore_non", "protection_ressources", "auto_controle"],
    level: "débutant",
    duration: "5 à 10 min",
    repetitions: "15 répétitions",
    material: ["Friandises (2 types : basse et haute valeur)"],
    steps: [
      "Fermer une friandise dans le poing.",
      "Présenter le poing au chien.",
      "Attendre qu'il recule ou détourne la tête.",
      "Marquer et récompenser de l'autre main avec une friandise de haute valeur.",
      "Ajouter le signal \"Non\" quand le comportement est fiable."
    ],
    mistakes: [
      "Ouvrir la main quand le chien insiste.",
      "Punir le chien verbalement.",
      "Ne pas récompenser assez vite le renoncement."
    ],
    precautions: ["Progresser lentement.", "Ne pas frustrer excessivement."],
    contraindications: ["Protection de ressources sévère : consulter un professionnel."],
  },
  {
    id: "lib-assis-1",
    name: "Assis tenu",
    category: "Assis",
    objective: "Obtenir et maintenir un assis fiable.",
    targetProblems: ["saute_gens", "auto_controle", "hyperactivite"],
    level: "débutant",
    duration: "5 à 10 min",
    repetitions: "10 à 15 répétitions",
    material: ["Friandises"],
    steps: [
      "Leurrer le chien en montant la friandise au-dessus de son nez.",
      "Marquer dès que les fesses touchent le sol.",
      "Récompenser.",
      "Ajouter le signal \"Assis\" quand le mouvement est acquis.",
      "Augmenter la durée : 2s, 5s, 10s avant de récompenser."
    ],
    mistakes: [
      "Appuyer sur le dos du chien.",
      "Récompenser un assis qui ne tient pas."
    ],
    precautions: ["Courtes sessions.", "Toujours libérer avec \"OK\"."],
    contraindications: ["Douleurs aux hanches : vérifier avec le vétérinaire."],
  },
  {
    id: "lib-couche-1",
    name: "Couché tenu",
    category: "Couché",
    objective: "Obtenir un couché calme et maintenu.",
    targetProblems: ["auto_controle", "hyperactivite", "anxiete"],
    level: "débutant",
    duration: "5 à 10 min",
    repetitions: "10 répétitions",
    material: ["Friandises", "Tapis optionnel"],
    steps: [
      "Depuis l'assis, descendre lentement la friandise vers le sol.",
      "Guider vers l'avant si nécessaire.",
      "Marquer dès que le ventre touche le sol.",
      "Récompenser.",
      "Augmenter progressivement la durée."
    ],
    mistakes: [
      "Pousser le chien vers le bas.",
      "Aller trop vite en durée."
    ],
    precautions: ["Surface confortable.", "Adapter pour les chiens avec douleurs articulaires."],
    contraindications: ["Douleurs articulaires importantes : adapter ou éviter."],
  },
  {
    id: "lib-reste-1",
    name: "Reste / Pas bouger",
    category: "Reste / Maintien",
    objective: "Maintenir une position malgré les distractions.",
    targetProblems: ["auto_controle", "hyperactivite", "frustration"],
    level: "intermédiaire",
    duration: "10 min",
    repetitions: "10 répétitions",
    material: ["Friandises", "Laisse longue optionnelle"],
    steps: [
      "Demander un assis ou couché.",
      "Dire \"Reste\" avec un geste de la main (paume ouverte).",
      "Reculer d'un pas.",
      "Revenir immédiatement et récompenser.",
      "Augmenter la distance et la durée progressivement.",
      "Ajouter des distractions légères."
    ],
    mistakes: [
      "Augmenter trop vite la distance.",
      "Appeler le chien au lieu de revenir vers lui.",
      "Oublier de libérer avec \"OK\"."
    ],
    precautions: ["Toujours revenir vers le chien, ne pas l'appeler.", "Progresser par micro-étapes."],
    contraindications: [],
  },
  {
    id: "lib-marche-1",
    name: "Marche connectée",
    category: "Marche en laisse",
    objective: "Marcher avec une laisse souple sans traction.",
    targetProblems: ["tire_laisse", "manque_focus"],
    level: "débutant",
    duration: "10 à 15 min",
    repetitions: "10 séquences de 5 à 10 pas",
    material: ["Friandises", "Laisse standard (pas enrouleur)", "Harnais recommandé"],
    steps: [
      "Commencer dans un lieu calme.",
      "Faire 3 à 5 pas, récompenser si la laisse reste souple.",
      "Si le chien tire, s'arrêter et attendre qu'il revienne vers vous.",
      "Récompenser le retour et reprendre la marche.",
      "Changer de direction fréquemment pour garder l'attention."
    ],
    mistakes: [
      "Tirer en retour quand le chien tire.",
      "Utiliser une laisse enrouleur.",
      "Avancer quand la laisse est tendue."
    ],
    precautions: ["Sessions courtes au début.", "Environnement calme."],
    contraindications: ["Chien avec douleurs cervicales : utiliser un harnais."],
  },
  {
    id: "lib-auto-1",
    name: "Auto-contrôle : attendre la gamelle",
    category: "Auto-contrôle",
    objective: "Apprendre la patience et l'auto-régulation.",
    targetProblems: ["frustration", "hyperactivite", "auto_controle"],
    level: "débutant",
    duration: "5 min",
    repetitions: "À chaque repas",
    material: ["Gamelle", "Nourriture habituelle"],
    steps: [
      "Tenir la gamelle en hauteur.",
      "Descendre lentement.",
      "Si le chien bouge, remonter la gamelle.",
      "Poser la gamelle quand le chien reste immobile.",
      "Libérer avec \"OK\" pour manger."
    ],
    mistakes: [
      "Poser la gamelle malgré l'excitation.",
      "Crier \"Non\" au lieu de simplement remonter la gamelle."
    ],
    precautions: ["Patience.", "Ne pas frustrer excessivement les chiots."],
    contraindications: ["Protection de ressources alimentaire : adapter avec un professionnel."],
  },
  {
    id: "lib-tapis-1",
    name: "Aller au tapis",
    category: "Tapis / Calme",
    objective: "Créer un lieu de calme et de sécurité.",
    targetProblems: ["hyperactivite", "anxiete", "saute_gens"],
    level: "débutant",
    duration: "10 min",
    repetitions: "10 à 15 répétitions",
    material: ["Tapis ou couverture", "Friandises"],
    steps: [
      "Poser le tapis au sol.",
      "Récompenser dès qu'une patte touche le tapis.",
      "Récompenser les quatre pattes sur le tapis.",
      "Récompenser le couché sur le tapis.",
      "Augmenter la durée sur le tapis.",
      "Ajouter le signal \"Tapis\" quand le comportement est fiable."
    ],
    mistakes: [
      "Forcer le chien sur le tapis.",
      "Utiliser le tapis comme punition."
    ],
    precautions: ["Le tapis doit toujours être associé à du positif.", "Ne jamais déranger le chien sur son tapis."],
    contraindications: [],
  },
  {
    id: "lib-accueil-1",
    name: "Accueil sans saut — 4 pattes au sol",
    category: "Accueil sans saut",
    objective: "Accueillir les visiteurs sans sauter.",
    targetProblems: ["saute_gens", "hyperactivite", "auto_controle"],
    level: "intermédiaire",
    duration: "10 min",
    repetitions: "5 à 10 mises en situation",
    material: ["Friandises", "Aide d'une personne"],
    steps: [
      "Préparer des friandises.",
      "La personne s'approche lentement.",
      "Si le chien garde les 4 pattes au sol : marquer et récompenser au sol.",
      "Si le chien saute : la personne se tourne et s'éloigne (pas de contact).",
      "Répéter jusqu'à ce que le chien comprenne que 4 pattes au sol = interaction.",
      "Ajouter un assis demandé avant le contact."
    ],
    mistakes: [
      "Repousser le chien avec les mains (= interaction, donc récompense pour lui).",
      "Dire \"Non\" sans alternative claire."
    ],
    precautions: ["Briefer les visiteurs à l'avance.", "Garder le chien en laisse au début."],
    contraindications: [],
  },
  {
    id: "lib-demitour-1",
    name: "Demi-tour d'urgence",
    category: "Demi-tour d'urgence",
    objective: "Changer de direction immédiatement en cas de déclencheur.",
    targetProblems: ["reactivite_chiens", "reactivite_humains", "tire_laisse"],
    level: "intermédiaire",
    duration: "10 min",
    repetitions: "10 à 15 répétitions",
    material: ["Friandises de très haute valeur", "Laisse courte"],
    steps: [
      "Marcher normalement avec le chien.",
      "Dire \"On y va !\" d'un ton enjoué.",
      "Faire demi-tour en tournant vers l'extérieur (pas par-dessus le chien).",
      "Leurrer avec une friandise si nécessaire au début.",
      "Récompenser dès que le chien suit le mouvement.",
      "Pratiquer sans déclencheur d'abord, puis à distance d'un déclencheur."
    ],
    mistakes: [
      "Tirer le chien brusquement.",
      "Pratiquer pour la première fois face à un vrai déclencheur."
    ],
    precautions: ["C'est un outil de sécurité, pas une punition.", "Toujours récompenser le suivi."],
    contraindications: [],
  },
  {
    id: "lib-desens-chiens-1",
    name: "Désensibilisation aux chiens",
    category: "Désensibilisation chiens",
    objective: "Réduire la réactivité face aux autres chiens.",
    targetProblems: ["reactivite_chiens"],
    level: "avancé",
    duration: "15 à 20 min",
    repetitions: "Sessions régulières",
    material: ["Friandises très haute valeur", "Laisse", "Chien neutre à distance (idéalement)"],
    steps: [
      "Identifier la distance de confort du chien (zone verte).",
      "Se positionner à cette distance ou au-delà.",
      "Chaque fois que le chien voit l'autre chien et reste calme : marquer et récompenser.",
      "Si le chien fixe mais ne réagit pas : marquer et récompenser.",
      "Si le chien réagit (zone rouge) : augmenter immédiatement la distance.",
      "Réduire la distance par micro-étapes (1 à 3 mètres) sur plusieurs séances."
    ],
    mistakes: [
      "Forcer la proximité.",
      "Autoriser les contacts nez-à-nez.",
      "Travailler quand le chien est déjà en zone rouge."
    ],
    precautions: [
      "Toujours rester sous seuil.",
      "Muselière si historique d'agression.",
      "Ne jamais forcer une rencontre."
    ],
    contraindications: ["Agression sévère : travail avec un professionnel uniquement."],
  },
  {
    id: "lib-desens-humains-1",
    name: "Désensibilisation aux humains",
    category: "Désensibilisation humains",
    objective: "Réduire la réactivité face aux humains inconnus.",
    targetProblems: ["reactivite_humains", "peur_inconnus"],
    level: "avancé",
    duration: "15 à 20 min",
    repetitions: "Sessions régulières",
    material: ["Friandises très haute valeur", "Laisse"],
    steps: [
      "Observer des humains à grande distance (zone verte).",
      "Récompenser le calme et le regard vers vous.",
      "Progresser par micro-étapes de distance.",
      "Ne jamais forcer le contact.",
      "Laisser le chien choisir de s'approcher ou non."
    ],
    mistakes: [
      "Laisser des inconnus approcher directement.",
      "Forcer le chien à accepter des caresses.",
      "Travailler en surcharge (trop de monde)."
    ],
    precautions: ["Muselière si nécessaire.", "Lieux calmes d'abord."],
    contraindications: ["Peur extrême : travail avec un comportementaliste."],
  },
  {
    id: "lib-aboiement-1",
    name: "Redirection sur aboiement",
    category: "Redirection aboiement",
    objective: "Rediriger le chien quand il aboie sur un stimulus.",
    targetProblems: ["aboiements", "reactivite_chiens", "reactivite_humains"],
    level: "intermédiaire",
    duration: "Variable",
    repetitions: "À chaque occurrence",
    material: ["Friandises haute valeur"],
    steps: [
      "Au premier aboiement, ne pas crier.",
      "Appeler le chien par son nom ou utiliser le focus.",
      "Dès qu'il se tourne vers vous : marquer et récompenser.",
      "Augmenter la distance par rapport au déclencheur.",
      "Travailler le focus préventif avant que l'aboiement ne commence."
    ],
    mistakes: [
      "Crier sur le chien (il pense que vous aboyez aussi).",
      "Punir physiquement.",
      "Ignorer les premiers signaux de montée en tension."
    ],
    precautions: ["Identifier les déclencheurs.", "Travailler le focus de base d'abord."],
    contraindications: [],
  },
  {
    id: "lib-museliere-1",
    name: "Muselière positive",
    category: "Muselière positive",
    objective: "Habituer le chien à porter la muselière sereinement.",
    targetProblems: ["museliere", "agressivite", "morsure"],
    level: "débutant",
    duration: "5 à 15 min par session, sur plusieurs semaines",
    repetitions: "Sessions quotidiennes courtes",
    material: ["Muselière Baskerville ou panier", "Friandises"],
    steps: [
      "Jour 1-3 : Présenter la muselière, récompenser le reniflement.",
      "Jour 4-6 : Mettre des friandises dans la muselière, laisser manger dedans.",
      "Jour 7-10 : Commencer à attacher brièvement (2-3 secondes), récompenser.",
      "Jour 11-15 : Augmenter la durée progressivement (10s, 30s, 1min).",
      "Jour 16+ : Porter la muselière pendant des activités plaisantes (promenades, jeux)."
    ],
    mistakes: [
      "Forcer la muselière d'un coup.",
      "Ne l'utiliser que dans des contextes négatifs (vétérinaire).",
      "Utiliser une muselière en tissu qui empêche de haleter."
    ],
    precautions: [
      "Choisir une muselière panier permettant de boire et haleter.",
      "Ne jamais précipiter les étapes.",
      "Associer toujours la muselière à du positif."
    ],
    contraindications: [],
  },
  {
    id: "lib-rappel-1",
    name: "Rappel de base",
    category: "Rappel de base",
    objective: "Obtenir un retour fiable vers le maître.",
    targetProblems: ["rappel_faible"],
    level: "débutant",
    duration: "10 min",
    repetitions: "15 à 20 répétitions",
    material: ["Friandises très haute valeur", "Longe 5m optionnelle"],
    steps: [
      "Commencer en intérieur ou jardin clos.",
      "Dire le nom du chien + \"Viens !\" d'un ton joyeux.",
      "Reculer de quelques pas pour encourager le mouvement.",
      "Marquer et récompenser généreusement à l'arrivée.",
      "Ne jamais appeler pour quelque chose de négatif.",
      "Augmenter progressivement la distance et les distractions."
    ],
    mistakes: [
      "Courir après le chien.",
      "Punir le chien à l'arrivée (même s'il a mis du temps).",
      "Utiliser le rappel pour mettre fin à un moment plaisant sans récompense."
    ],
    precautions: ["Utiliser une longe en extérieur non sécurisé.", "Toujours récompenser le retour."],
    contraindications: [],
  },
  {
    id: "lib-solitude-1",
    name: "Solitude progressive",
    category: "Solitude progressive",
    objective: "Apprendre au chien à rester seul sereinement.",
    targetProblems: ["anxiete_separation", "destruction"],
    level: "intermédiaire",
    duration: "Sessions progressives de 5s à plusieurs heures",
    repetitions: "Quotidien",
    material: ["Kong fourré", "Jouet d'occupation", "Caméra optionnelle"],
    steps: [
      "Commencer par de très courtes absences (quitter la pièce 5 secondes).",
      "Revenir calmement sans faire de fête.",
      "Augmenter la durée très progressivement : 10s, 30s, 1min, 5min, etc.",
      "Proposer un Kong ou jouet d'occupation avant de partir.",
      "Ne pas ritualiser le départ (pas d'au revoir exagéré).",
      "Si le chien montre des signes de détresse, revenir à une durée inférieure."
    ],
    mistakes: [
      "Augmenter trop vite la durée.",
      "Punir le chien pour des destructions.",
      "Faire des au revoir émotionnels."
    ],
    precautions: [
      "Consulter un vétérinaire si anxiété sévère (médication parfois nécessaire).",
      "Utiliser une caméra pour observer le comportement réel."
    ],
    contraindications: ["Anxiété sévère avec auto-mutilation : vétérinaire comportementaliste obligatoire."],
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
