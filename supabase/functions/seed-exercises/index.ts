import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Safe by default: block unless ENVIRONMENT is explicitly "development"
  const environment = Deno.env.get("ENVIRONMENT") || "production";
  if (environment !== "development") {
    return new Response(JSON.stringify({ error: "Not available in this environment" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Admin authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clear existing data
    await supabase.from("exercises").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("exercise_categories").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // ═══════════════════════════════════════
    // CATEGORIES (25 categories)
    // ═══════════════════════════════════════
    const categories = [
      { slug: "obeissance-base", name: "Obéissance de base", icon: "🏗️", color: "neon-blue", sort_order: 1, is_professional: false, description: "Les fondamentaux de l'éducation canine" },
      { slug: "marche-laisse", name: "Marche en laisse", icon: "🦮", color: "neon-blue", sort_order: 2, is_professional: false, description: "Marche au pied et gestion de la laisse" },
      { slug: "rappel", name: "Rappel", icon: "📢", color: "neon-blue", sort_order: 3, is_professional: false, description: "Revenir quand on l'appelle" },
      { slug: "socialisation", name: "Socialisation", icon: "🤝", color: "neon-cyan", sort_order: 4, is_professional: false, description: "Habituation aux stimuli sociaux" },
      { slug: "reactivite", name: "Gestion de la réactivité", icon: "⚡", color: "zone-orange", sort_order: 5, is_professional: false, description: "Gérer les réactions face aux déclencheurs" },
      { slug: "desensibilisation", name: "Désensibilisation", icon: "🎯", color: "zone-orange", sort_order: 6, is_professional: false, description: "Réduire progressivement la sensibilité" },
      { slug: "calme-relaxation", name: "Calme et relaxation", icon: "🧘", color: "neon-cyan", sort_order: 7, is_professional: false, description: "Apprendre à se poser et se détendre" },
      { slug: "autonomie-solitude", name: "Autonomie et solitude", icon: "🏠", color: "neon-purple", sort_order: 8, is_professional: false, description: "Gérer l'absence du maître" },
      { slug: "manipulation-soins", name: "Manipulation et soins", icon: "🩺", color: "neon-cyan", sort_order: 9, is_professional: false, description: "Accepter les soins et manipulations" },
      { slug: "proprioception-fitness", name: "Proprioception et fitness", icon: "💪", color: "neon-blue", sort_order: 10, is_professional: false, description: "Conscience corporelle et forme physique" },
      { slug: "stimulation-mentale", name: "Stimulation mentale", icon: "🧩", color: "neon-cyan", sort_order: 11, is_professional: false, description: "Jeux cognitifs et résolution de problèmes" },
      { slug: "tricks-tours", name: "Tricks et tours", icon: "🎪", color: "neon-pink", sort_order: 12, is_professional: false, description: "Tours amusants et impressionnants" },
      { slug: "agilite", name: "Agilité", icon: "🏃", color: "neon-blue", sort_order: 13, is_professional: false, description: "Parcours d'obstacles et coordination" },
      { slug: "pistage-recherche", name: "Pistage et recherche", icon: "👃", color: "neon-cyan", sort_order: 14, is_professional: false, description: "Utiliser le flair pour chercher" },
      { slug: "travail-aquatique", name: "Travail aquatique", icon: "🏊", color: "neon-blue", sort_order: 15, is_professional: false, description: "Exercices en milieu aquatique" },
      { slug: "canicross-sport", name: "Canicross et sport canin", icon: "🏅", color: "neon-blue", sort_order: 16, is_professional: false, description: "Sports et activités physiques canines" },
      { slug: "gestion-emotions", name: "Gestion des émotions", icon: "💙", color: "neon-purple", sort_order: 17, is_professional: false, description: "Frustration, excitation, peur" },
      { slug: "education-chiot", name: "Éducation du chiot", icon: "🐶", color: "neon-cyan", sort_order: 18, is_professional: false, description: "Exercices adaptés aux chiots" },
      { slug: "chien-senior", name: "Chien senior", icon: "🐾", color: "neon-purple", sort_order: 19, is_professional: false, description: "Exercices doux pour chiens âgés" },
      // Professional categories
      { slug: "troupeau", name: "Travail de troupeau", icon: "🐑", color: "zone-orange", sort_order: 20, is_professional: true, description: "Conduite et gestion de troupeau" },
      { slug: "ring-sport", name: "Ring et obéissance sportive", icon: "🏆", color: "neon-blue", sort_order: 21, is_professional: true, description: "Compétition et ring français" },
      { slug: "detection", name: "Détection et recherche pro", icon: "🔍", color: "neon-cyan", sort_order: 22, is_professional: true, description: "Détection de substances, recherche de personnes" },
      { slug: "protection-mordant", name: "Protection et mordant", icon: "🛡️", color: "zone-orange", sort_order: 23, is_professional: true, description: "Travail de défense et mordant sportif" },
      { slug: "sauvetage", name: "Sauvetage et décombres", icon: "🚨", color: "zone-orange", sort_order: 24, is_professional: true, description: "Recherche en décombres et catastrophe" },
      { slug: "patrouille-securite", name: "Patrouille et sécurité", icon: "🚔", color: "neon-purple", sort_order: 25, is_professional: true, description: "Travail de patrouille police/armée/sécurité" },
    ];

    const { data: insertedCats } = await supabase.from("exercise_categories").insert(categories).select("id, slug");
    const catMap: Record<string, string> = {};
    for (const c of insertedCats || []) catMap[c.slug] = c.id;

    // ═══════════════════════════════════════
    // EXERCISES (500+)
    // ═══════════════════════════════════════
    // Helper to generate exercise objects
    const ex = (catSlug: string, slug: string, name: string, obj: string, level: string, type: string, dur: string, diff: number, opts: any = {}) => ({
      category_id: catMap[catSlug],
      slug,
      name,
      short_title: name.substring(0, 30),
      objective: obj,
      level,
      exercise_type: type,
      duration: dur,
      difficulty: diff,
      dedication: opts.dedication || "La constance est la clé du succès",
      repetitions: opts.reps || "5 fois",
      frequency: opts.freq || "1x/jour",
      environment: opts.env || "tous",
      intensity_level: opts.intensity || Math.min(diff, 5),
      cognitive_load: opts.cognitive || Math.min(diff, 5),
      physical_load: opts.physical || Math.ceil(diff / 2),
      steps: JSON.stringify(opts.steps || ["Préparer l'environnement", "Commencer l'exercice", "Récompenser le bon comportement"]),
      tutorial_steps: JSON.stringify(opts.tutorial || [{ title: "Préparation", description: "Choisissez un environnement calme adapté" }, { title: "Exécution", description: obj }]),
      mistakes: JSON.stringify(opts.mistakes || ["Aller trop vite", "Oublier de récompenser"]),
      success_criteria: opts.success || "Le chien répond de manière fiable",
      stop_criteria: opts.stop || "Signes de stress ou fatigue",
      vigilance: opts.vigilance || "Observer le langage corporel",
      precautions: JSON.stringify(opts.precautions || ["Adapter la difficulté au niveau du chien"]),
      contraindications: JSON.stringify(opts.contra || []),
      health_precautions: JSON.stringify(opts.health || []),
      adaptations: JSON.stringify(opts.adaptations || []),
      suitable_profiles: JSON.stringify(opts.profiles || []),
      compatible_reactivity: opts.reactive || false,
      compatible_senior: opts.senior || false,
      compatible_puppy: opts.puppy || false,
      compatible_muzzle: opts.muzzle || false,
      is_professional: opts.pro || false,
      target_breeds: opts.breeds || null,
      equipment: opts.equip || [],
      tags: opts.tags || [catSlug],
      priority_axis: opts.axis || [],
      target_problems: opts.problems || [],
      secondary_benefits: opts.benefits || [],
      prerequisites: opts.prereqs || [],
      sort_order: opts.order || 0,
    });

    const allExercises: any[] = [];

    // ═══════════════════════════════════════
    // 1. OBÉISSANCE DE BASE (30 exercices)
    // ═══════════════════════════════════════
    const obeissance = [
      ex("obeissance-base", "assis-base", "Assis", "Apprendre au chien à s'asseoir sur commande", "débutant", "fondation", "5 min", 1, { puppy: true, senior: true, tags: ["assis", "base", "fondation"], equip: ["Friandises"] }),
      ex("obeissance-base", "couche-base", "Couché", "Apprendre au chien à se coucher sur commande", "débutant", "fondation", "5 min", 1, { puppy: true, senior: true, tags: ["couché", "base"] }),
      ex("obeissance-base", "reste-assis", "Reste en position assise", "Maintenir la position assise avec durée croissante", "débutant", "fondation", "5 min", 2, { tags: ["reste", "statique"] }),
      ex("obeissance-base", "reste-couche", "Reste en position couchée", "Maintenir le couché avec durée croissante", "débutant", "fondation", "5 min", 2, { tags: ["reste", "couché"] }),
      ex("obeissance-base", "pas-bouger", "Pas bouger", "Rester immobile malgré les distractions", "intermédiaire", "fondation", "8 min", 3, { tags: ["statique", "contrôle"] }),
      ex("obeissance-base", "debout-base", "Debout", "Se lever et maintenir la position debout", "intermédiaire", "fondation", "5 min", 2, { tags: ["debout", "position"] }),
      ex("obeissance-base", "regarde-moi", "Regarde-moi", "Capter et maintenir le contact visuel", "débutant", "fondation", "3 min", 1, { puppy: true, tags: ["attention", "focus"], reactive: true }),
      ex("obeissance-base", "touche-main", "Touche (target main)", "Toucher la paume de la main avec le nez", "débutant", "fondation", "5 min", 1, { puppy: true, tags: ["target", "nez"] }),
      ex("obeissance-base", "laisse-ca", "Laisse ça", "Renoncer à un objet ou nourriture au sol", "intermédiaire", "fondation", "5 min", 3, { tags: ["renoncement", "contrôle"], problems: ["vol de nourriture"] }),
      ex("obeissance-base", "donne-objet", "Donne", "Relâcher un objet tenu en gueule", "débutant", "fondation", "5 min", 2, { puppy: true, tags: ["donne", "objet"] }),
      ex("obeissance-base", "attend-gamelle", "Attendre devant la gamelle", "Patienter avant de manger", "débutant", "fondation", "3 min", 2, { tags: ["patience", "gamelle", "autocontrôle"] }),
      ex("obeissance-base", "va-a-ta-place", "Va à ta place", "Aller se coucher sur un tapis désigné", "intermédiaire", "fondation", "10 min", 3, { tags: ["place", "tapis", "calme"], reactive: true }),
      ex("obeissance-base", "enchainement-positions", "Enchaînement de positions", "Alterner assis-couché-debout fluidement", "intermédiaire", "fondation", "8 min", 3, { tags: ["positions", "enchaînement"] }),
      ex("obeissance-base", "assis-a-distance", "Assis à distance", "S'asseoir à distance du maître", "avancé", "ciblé", "8 min", 4, { tags: ["distance", "contrôle"] }),
      ex("obeissance-base", "couche-a-distance", "Couché à distance", "Se coucher à distance sur commande", "avancé", "ciblé", "8 min", 4, { tags: ["distance", "couché"] }),
      ex("obeissance-base", "stop-urgence", "Stop d'urgence", "S'arrêter immédiatement en mouvement", "avancé", "ciblé", "10 min", 5, { tags: ["urgence", "sécurité"], problems: ["fugue"] }),
      ex("obeissance-base", "non-verbal", "Obéissance non verbale", "Répondre aux signaux gestuels uniquement", "avancé", "ciblé", "10 min", 4, { tags: ["gestuel", "silence"] }),
      ex("obeissance-base", "assis-automatique", "Assis automatique", "S'asseoir automatiquement à chaque arrêt", "intermédiaire", "fondation", "10 min", 3, { tags: ["automatique", "marche"] }),
      ex("obeissance-base", "reste-distractions", "Reste avec distractions", "Maintenir le reste malgré stimuli", "avancé", "ciblé", "10 min", 4, { tags: ["distractions", "fiabilité"] }),
      ex("obeissance-base", "enchainement-rapide", "Enchaînement rapide", "Exécuter plusieurs ordres en séquence rapide", "avancé", "ciblé", "8 min", 4, { tags: ["vitesse", "obéissance"] }),
      ex("obeissance-base", "obeis-en-mouvement", "Obéissance en mouvement", "Exécuter des ordres tout en marchant", "avancé", "ciblé", "10 min", 4, { tags: ["mouvement", "dynamique"] }),
      ex("obeissance-base", "envoi-en-avant", "Envoi en avant", "Envoyer le chien dans une direction précise", "avancé", "ciblé", "10 min", 4, { tags: ["direction", "envoi"] }),
      ex("obeissance-base", "pas-toucher-objet", "Ne pas toucher un objet", "Ignorer un objet posé au sol", "intermédiaire", "fondation", "5 min", 3, { tags: ["renoncement", "objet"] }),
      ex("obeissance-base", "changement-position-distance", "Changement de position à distance", "Alterner assis/couché à 5+ mètres", "avancé", "ciblé", "10 min", 5, { tags: ["distance", "positions"] }),
      ex("obeissance-base", "reponse-au-nom", "Réponse au nom", "Tourner la tête systématiquement à l'appel", "débutant", "fondation", "3 min", 1, { puppy: true, tags: ["nom", "attention"] }),
      ex("obeissance-base", "assis-longue-duree", "Assis longue durée", "Tenir l'assis pendant 3+ minutes", "intermédiaire", "fondation", "10 min", 3, { tags: ["durée", "patience"] }),
      ex("obeissance-base", "couche-longue-duree", "Couché longue durée", "Tenir le couché pendant 5+ minutes", "intermédiaire", "fondation", "10 min", 3, { tags: ["durée", "calme"], senior: true }),
      ex("obeissance-base", "obeissance-en-groupe", "Obéissance en groupe", "Exécuter des ordres parmi d'autres chiens", "avancé", "ciblé", "15 min", 5, { tags: ["groupe", "distractions"] }),
      ex("obeissance-base", "obeissance-terrain-varie", "Obéissance terrain varié", "Obéir sur différentes surfaces et terrains", "intermédiaire", "ciblé", "10 min", 3, { tags: ["terrain", "généralisation"] }),
      ex("obeissance-base", "attendre-en-voiture", "Attendre en voiture", "Rester calme dans la voiture portes ouvertes", "intermédiaire", "fondation", "10 min", 3, { tags: ["voiture", "patience"] }),
    ];
    allExercises.push(...obeissance);

    // ═══════════════════════════════════════
    // 2. MARCHE EN LAISSE (25 exercices)
    // ═══════════════════════════════════════
    const marche = [
      ex("marche-laisse", "marche-sans-tirer", "Marche sans tirer", "Marcher à côté sans tension sur la laisse", "débutant", "fondation", "10 min", 2, { equip: ["Laisse", "Harnais"], tags: ["marche", "laisse"] }),
      ex("marche-laisse", "demi-tour", "Demi-tour", "Changer de direction avec le chien qui suit", "débutant", "fondation", "5 min", 2, { tags: ["direction", "attention"] }),
      ex("marche-laisse", "stop-en-marche", "Stop en marche", "S'arrêter net et le chien s'assoit", "intermédiaire", "fondation", "8 min", 3, { tags: ["stop", "automatique"] }),
      ex("marche-laisse", "changement-rythme", "Changement de rythme", "Varier la vitesse de marche", "intermédiaire", "fondation", "8 min", 3, { tags: ["rythme", "attention"] }),
      ex("marche-laisse", "croisement-pieton", "Croisement de piétons", "Passer près des gens sans réagir", "intermédiaire", "ciblé", "10 min", 3, { reactive: true, tags: ["piétons", "socialisation"] }),
      ex("marche-laisse", "croisement-chien", "Croisement de chiens", "Croiser un autre chien calmement", "avancé", "ciblé", "10 min", 4, { reactive: true, tags: ["chiens", "croisement"], problems: ["réactivité"] }),
      ex("marche-laisse", "marche-au-pied-strict", "Marche au pied stricte", "Marche collée au pied gauche", "avancé", "ciblé", "10 min", 4, { tags: ["pied", "précision"] }),
      ex("marche-laisse", "contournement-obstacles", "Contournement d'obstacles", "Naviguer autour des obstacles urbains", "intermédiaire", "ciblé", "10 min", 3, { tags: ["obstacles", "urbain"] }),
      ex("marche-laisse", "marche-en-ville", "Marche en milieu urbain", "Évoluer dans un environnement stimulant", "avancé", "ciblé", "15 min", 4, { env: "extérieur contrôlé", tags: ["ville", "stimuli"] }),
      ex("marche-laisse", "attente-au-pied", "Attente au pied", "Rester au pied pendant que le maître discute", "intermédiaire", "fondation", "5 min", 3, { tags: ["attente", "social"] }),
      ex("marche-laisse", "marche-laisse-longue", "Marche en longe", "Marcher avec une longe de 5m", "intermédiaire", "fondation", "15 min", 2, { equip: ["Longe 5m"], tags: ["longe", "liberté"] }),
      ex("marche-laisse", "ignore-nourriture-sol", "Ignorer nourriture au sol", "Ne pas ramasser lors de la promenade", "intermédiaire", "ciblé", "10 min", 3, { tags: ["nourriture", "renoncement"] }),
      ex("marche-laisse", "traversee-passage-pieton", "Traversée de route", "Attendre et traverser calmement", "intermédiaire", "fondation", "5 min", 3, { tags: ["route", "sécurité"] }),
      ex("marche-laisse", "marche-nocturne", "Marche nocturne", "Promenade de nuit avec calme", "intermédiaire", "ciblé", "15 min", 3, { tags: ["nuit", "calme"] }),
      ex("marche-laisse", "marche-sous-pluie", "Marche sous la pluie", "Accepter les intempéries", "intermédiaire", "ciblé", "10 min", 3, { tags: ["pluie", "habituation"] }),
      ex("marche-laisse", "marche-foret", "Marche en forêt", "Évoluer en milieu naturel riche en odeurs", "débutant", "fondation", "20 min", 2, { env: "extérieur calme", tags: ["forêt", "nature"] }),
      ex("marche-laisse", "marche-parc-animalier", "Marche en parc canin", "Évoluer dans un parc avec d'autres chiens", "avancé", "ciblé", "15 min", 4, { tags: ["parc", "chiens"] }),
      ex("marche-laisse", "marche-zigzag", "Slalom en marche", "Suivre un parcours en zigzag", "intermédiaire", "fondation", "8 min", 3, { tags: ["slalom", "coordination"] }),
      ex("marche-laisse", "arret-spontane", "Arrêt spontané", "S'arrêter immédiatement quand la laisse se tend", "débutant", "fondation", "5 min", 2, { tags: ["tension", "laisse"] }),
      ex("marche-laisse", "marche-2-chiens", "Marche avec 2 chiens", "Promener deux chiens simultanément", "avancé", "ciblé", "15 min", 5, { equip: ["2 laisses", "Coupleur"], tags: ["multi-chiens"] }),
      ex("marche-laisse", "passer-une-porte", "Passer une porte", "Passer les portes calmement en laisse", "débutant", "fondation", "3 min", 1, { puppy: true, tags: ["porte", "calme"] }),
      ex("marche-laisse", "monter-descendre-escaliers", "Monter/descendre escaliers", "Gravir les marches sans tirer", "intermédiaire", "fondation", "5 min", 2, { tags: ["escaliers", "coordination"] }),
      ex("marche-laisse", "terrasse-cafe", "Terrasse de café", "Rester calme en terrasse", "avancé", "ciblé", "20 min", 4, { tags: ["terrasse", "social", "calme"] }),
      ex("marche-laisse", "marche-marche", "Marche de marché", "Évoluer dans un marché bondé", "avancé", "ciblé", "15 min", 5, { tags: ["foule", "stress"] }),
      ex("marche-laisse", "marche-relaxation", "Marche de décompression", "Marche lente en pleine nature sans objectif", "débutant", "récupération", "20 min", 1, { senior: true, tags: ["décompression", "nature"], reactive: true }),
    ];
    allExercises.push(...marche);

    // ═══════════════════════════════════════
    // 3. RAPPEL (20 exercices)
    // ═══════════════════════════════════════
    const rappel = [
      ex("rappel", "rappel-base", "Rappel de base", "Revenir quand on appelle son nom", "débutant", "fondation", "5 min", 1, { puppy: true, equip: ["Friandises de haute valeur"], tags: ["rappel", "base"] }),
      ex("rappel", "rappel-longe", "Rappel en longe", "Rappel sécurisé avec longe de 10m", "débutant", "fondation", "10 min", 2, { equip: ["Longe 10m"], tags: ["longe", "sécurité"] }),
      ex("rappel", "rappel-sifflet", "Rappel au sifflet", "Associer un coup de sifflet au retour", "intermédiaire", "ciblé", "8 min", 3, { equip: ["Sifflet"], tags: ["sifflet", "signal"] }),
      ex("rappel", "rappel-distractions", "Rappel avec distractions", "Revenir malgré les distractions", "avancé", "ciblé", "10 min", 4, { tags: ["distractions", "fiabilité"] }),
      ex("rappel", "rappel-jeu", "Rappel en jeu", "Interrompre le jeu pour revenir", "intermédiaire", "ciblé", "8 min", 3, { tags: ["jeu", "interruption"] }),
      ex("rappel", "rappel-course", "Rappel en course", "Revenir en pleine course", "avancé", "ciblé", "8 min", 4, { tags: ["course", "urgence"] }),
      ex("rappel", "rappel-entre-2-personnes", "Rappel entre 2 personnes", "Ping-pong entre deux humains", "débutant", "fondation", "8 min", 1, { puppy: true, tags: ["duo", "jeu"] }),
      ex("rappel", "rappel-cache", "Rappel caché", "Revenir quand le maître se cache", "intermédiaire", "ciblé", "10 min", 3, { tags: ["cache", "recherche"] }),
      ex("rappel", "rappel-urgence", "Rappel d'urgence", "Signal d'urgence pour retour immédiat", "avancé", "ciblé", "5 min", 5, { tags: ["urgence", "sécurité"] }),
      ex("rappel", "rappel-avec-chiens", "Rappel en présence de chiens", "Revenir quand d'autres chiens sont présents", "avancé", "ciblé", "10 min", 5, { tags: ["chiens", "challenge"] }),
      ex("rappel", "rappel-gibier", "Rappel face au gibier", "Revenir malgré la présence de gibier", "avancé", "ciblé", "10 min", 5, { tags: ["gibier", "chasse", "instinct"] }),
      ex("rappel", "rappel-progressif-distance", "Rappel à distance croissante", "Augmenter progressivement la distance", "intermédiaire", "fondation", "10 min", 3, { tags: ["distance", "progression"] }),
      ex("rappel", "rappel-terrain-varie", "Rappel terrain varié", "Rappel sur différents terrains", "intermédiaire", "ciblé", "10 min", 3, { tags: ["terrain", "généralisation"] }),
      ex("rappel", "rappel-position", "Rappel avec position finale", "Revenir et s'asseoir devant", "intermédiaire", "ciblé", "8 min", 3, { tags: ["position", "finition"] }),
      ex("rappel", "rappel-libre", "Rappel en liberté complète", "Rappel sans longe en terrain ouvert", "avancé", "ciblé", "15 min", 5, { tags: ["liberté", "confiance"] }),
      ex("rappel", "rappel-nuit", "Rappel de nuit", "Revenir dans l'obscurité", "avancé", "ciblé", "10 min", 4, { equip: ["Lampe", "Collier lumineux"], tags: ["nuit", "visibilité"] }),
      ex("rappel", "rappel-vocal-varie", "Rappel vocal varié", "Répondre à différents tons de voix", "intermédiaire", "ciblé", "5 min", 3, { tags: ["voix", "tonalité"] }),
      ex("rappel", "rappel-reward-jackpot", "Rappel jackpot", "Rappels récompensés avec haute valeur aléatoire", "intermédiaire", "fondation", "5 min", 2, { tags: ["récompense", "motivation"] }),
      ex("rappel", "rappel-pendant-repas", "Rappel pendant exploration", "Interrompre un reniflage pour revenir", "avancé", "ciblé", "8 min", 4, { tags: ["exploration", "interruption"] }),
      ex("rappel", "rappel-sans-friandise", "Rappel sans friandise", "Rappel fiable avec récompense sociale uniquement", "avancé", "ciblé", "10 min", 5, { tags: ["social", "relation"] }),
    ];
    allExercises.push(...rappel);

    // ═══════════════════════════════════════
    // 4. SOCIALISATION (20 exercices)
    // ═══════════════════════════════════════
    const social = [
      ex("socialisation", "habituation-bruits", "Habituation aux bruits", "Exposer progressivement aux bruits courants", "débutant", "fondation", "10 min", 2, { puppy: true, tags: ["bruits", "habituation"] }),
      ex("socialisation", "rencontre-humains", "Rencontre d'humains calmes", "Approcher des inconnus sans stress", "débutant", "fondation", "10 min", 2, { tags: ["humains", "approche"] }),
      ex("socialisation", "enfants", "Habituation aux enfants", "Rester calme en présence d'enfants", "intermédiaire", "ciblé", "10 min", 3, { tags: ["enfants", "calme"] }),
      ex("socialisation", "chapeaux-uniformes", "Chapeaux et uniformes", "Accepter les apparences inhabituelles", "intermédiaire", "ciblé", "10 min", 3, { tags: ["apparence", "habituation"] }),
      ex("socialisation", "velo-skateboard", "Vélos et skateboards", "Rester calme face aux engins roulants", "intermédiaire", "ciblé", "10 min", 3, { tags: ["véhicules", "mouvement"] }),
      ex("socialisation", "transport-commun", "Transport en commun", "Rester calme dans les transports", "avancé", "ciblé", "15 min", 4, { tags: ["transport", "public"] }),
      ex("socialisation", "veterinaire", "Visite chez le vétérinaire", "Accepter l'environnement vétérinaire", "intermédiaire", "ciblé", "10 min", 3, { tags: ["vétérinaire", "stress"] }),
      ex("socialisation", "rencontre-chien-calme", "Rencontre de chien calme", "Approche contrôlée d'un chien équilibré", "intermédiaire", "ciblé", "10 min", 3, { tags: ["chien", "rencontre"] }),
      ex("socialisation", "surfaces-variees", "Surfaces variées", "Marcher sur grille, eau, sable, etc.", "débutant", "fondation", "8 min", 2, { puppy: true, tags: ["surfaces", "confiance"] }),
      ex("socialisation", "escaliers-mecaniques", "Escaliers mécaniques", "Monter sur un escalator", "avancé", "ciblé", "5 min", 4, { tags: ["escalator", "urbain"] }),
      ex("socialisation", "ascenseur", "Ascenseur", "Entrer et rester calme dans un ascenseur", "intermédiaire", "ciblé", "5 min", 3, { tags: ["ascenseur", "espace clos"] }),
      ex("socialisation", "foule", "Exposition à la foule", "Marcher dans un lieu très fréquenté", "avancé", "ciblé", "15 min", 4, { tags: ["foule", "stress"] }),
      ex("socialisation", "bruits-chantier", "Bruits de chantier", "Tolérer marteaux-piqueurs et machines", "avancé", "ciblé", "10 min", 4, { tags: ["chantier", "bruits forts"] }),
      ex("socialisation", "animaux-divers", "Animaux divers", "Habituation chats, chevaux, poules", "intermédiaire", "ciblé", "10 min", 3, { tags: ["animaux", "espèces"] }),
      ex("socialisation", "jeux-inter-chiens", "Jeu entre chiens", "Sessions de jeu contrôlées", "intermédiaire", "ciblé", "15 min", 3, { tags: ["jeu", "interaction"] }),
      ex("socialisation", "personnes-agees", "Personnes âgées", "Habituation aux mouvements lents/aides de marche", "débutant", "ciblé", "10 min", 2, { tags: ["personnes âgées", "douceur"] }),
      ex("socialisation", "personnes-handicapees", "Personnes à mobilité réduite", "Accepter fauteuils roulants et béquilles", "intermédiaire", "ciblé", "10 min", 3, { tags: ["PMR", "habituation"] }),
      ex("socialisation", "bruits-menagers", "Bruits ménagers", "Aspirateur, sèche-cheveux, mixeur", "débutant", "fondation", "5 min", 2, { puppy: true, tags: ["maison", "bruits"] }),
      ex("socialisation", "musique-forte", "Musique et feux d'artifice", "Habituation aux sons forts", "avancé", "ciblé", "10 min", 4, { tags: ["musique", "feux artifice"] }),
      ex("socialisation", "manipulations-douces", "Manipulations par des inconnus", "Accepter d'être touché par des étrangers", "intermédiaire", "ciblé", "5 min", 3, { tags: ["toucher", "confiance"] }),
    ];
    allExercises.push(...social);

    // ═══════════════════════════════════════
    // 5. GESTION DE LA RÉACTIVITÉ (25 exercices)
    // ═══════════════════════════════════════
    const reactivite = [
      ex("reactivite", "lat-look-at-that", "LAT (Look At That)", "Regarder le déclencheur et se retourner", "intermédiaire", "ciblé", "10 min", 3, { reactive: true, tags: ["LAT", "déclencheur"] }),
      ex("reactivite", "bat-training", "BAT (Behavior Adjustment)", "Laisser le chien gérer la distance", "avancé", "ciblé", "15 min", 4, { reactive: true, tags: ["BAT", "distance"] }),
      ex("reactivite", "counter-conditioning", "Contre-conditionnement classique", "Associer le déclencheur à des friandises", "intermédiaire", "ciblé", "10 min", 3, { reactive: true, tags: ["CC", "association positive"] }),
      ex("reactivite", "engage-disengage", "Engage/Disengage", "Regarder puis se détourner du stimulus", "intermédiaire", "ciblé", "10 min", 3, { reactive: true, tags: ["engage", "détournement"] }),
      ex("reactivite", "distance-confort", "Trouver la distance de confort", "Identifier le seuil de réaction", "débutant", "fondation", "10 min", 2, { reactive: true, tags: ["seuil", "distance"] }),
      ex("reactivite", "u-turn", "U-turn d'évitement", "Demi-tour rapide pour éviter un déclencheur", "débutant", "fondation", "5 min", 2, { reactive: true, tags: ["demi-tour", "fuite"] }),
      ex("reactivite", "focus-pres-stimulus", "Focus près du stimulus", "Maintenir l'attention malgré le déclencheur", "avancé", "ciblé", "10 min", 4, { reactive: true, tags: ["focus", "stimulus"] }),
      ex("reactivite", "passage-en-arc", "Passage en arc de cercle", "Contourner les déclencheurs en arc", "intermédiaire", "ciblé", "10 min", 3, { reactive: true, tags: ["arc", "contournement"] }),
      ex("reactivite", "station-observation", "Station d'observation", "Observer le monde depuis un point sûr", "débutant", "ciblé", "15 min", 2, { reactive: true, senior: true, tags: ["observation", "calme"] }),
      ex("reactivite", "marche-parallele", "Marche parallèle", "Marcher en parallèle avec un autre chien", "avancé", "ciblé", "15 min", 4, { reactive: true, tags: ["parallèle", "chien"] }),
      ex("reactivite", "reactivite-voitures", "Réactivité aux voitures", "Ignorer les véhicules en mouvement", "intermédiaire", "ciblé", "10 min", 3, { reactive: true, tags: ["voitures", "véhicules"] }),
      ex("reactivite", "reactivite-velo", "Réactivité aux cyclistes", "Rester calme face aux vélos", "intermédiaire", "ciblé", "10 min", 3, { reactive: true, tags: ["vélos", "mouvement"] }),
      ex("reactivite", "reactivite-joggers", "Réactivité aux joggeurs", "Ignorer les personnes qui courent", "intermédiaire", "ciblé", "10 min", 3, { reactive: true, tags: ["joggeurs", "course"] }),
      ex("reactivite", "trigger-stacking", "Gestion du trigger stacking", "Reconnaître l'accumulation de stress", "avancé", "ciblé", "10 min", 4, { reactive: true, tags: ["stress", "accumulation"] }),
      ex("reactivite", "pattern-games", "Jeux de patterns", "Séquences prévisibles pour rassurer", "débutant", "ciblé", "8 min", 2, { reactive: true, tags: ["pattern", "prévisibilité"] }),
      ex("reactivite", "reactivite-bruit", "Réactivité aux bruits soudains", "Gérer les bruits inattendus", "intermédiaire", "ciblé", "10 min", 3, { reactive: true, tags: ["bruits", "surprise"] }),
      ex("reactivite", "gestion-fenetre", "Gestion de la réactivité à la fenêtre", "Arrêter d'aboyer à la fenêtre", "intermédiaire", "ciblé", "10 min", 3, { reactive: true, tags: ["fenêtre", "aboiements"] }),
      ex("reactivite", "reactivite-portail", "Réactivité au portail", "Calme quand quelqu'un sonne ou passe", "intermédiaire", "ciblé", "10 min", 3, { reactive: true, tags: ["portail", "porte"] }),
      ex("reactivite", "auto-apaisement", "Signaux d'auto-apaisement", "Reconnaître et encourager le calme", "débutant", "fondation", "5 min", 2, { reactive: true, tags: ["auto-régulation", "calme"] }),
      ex("reactivite", "reactivite-laisse", "Réactivité en laisse spécifique", "Travailler la frustration de la laisse", "intermédiaire", "ciblé", "10 min", 3, { reactive: true, tags: ["laisse", "frustration"] }),
      ex("reactivite", "zone-tampon", "Création de zone tampon", "Utiliser le corps comme barrière", "intermédiaire", "ciblé", "10 min", 3, { reactive: true, muzzle: true, tags: ["protection", "positionnement"] }),
      ex("reactivite", "relaxation-apres-crise", "Relaxation post-déclenchement", "Routine de retour au calme", "intermédiaire", "ciblé", "10 min", 3, { reactive: true, tags: ["récupération", "calme"] }),
      ex("reactivite", "compteur-comportemental", "Compteur comportemental", "Transformer la vue du déclencheur en signal de friandise", "intermédiaire", "ciblé", "10 min", 3, { reactive: true, tags: ["compteur", "positive"] }),
      ex("reactivite", "marche-sniffari", "Marche « sniffari »", "Marche libre au flair pour décompresser", "débutant", "récupération", "20 min", 1, { reactive: true, senior: true, tags: ["flair", "décompression"] }),
      ex("reactivite", "choix-direction", "Donner le choix de direction", "Laisser le chien choisir sa route", "débutant", "fondation", "15 min", 1, { reactive: true, tags: ["choix", "autonomie"] }),
    ];
    allExercises.push(...reactivite);

    // ═══════════════════════════════════════
    // 6. DÉSENSIBILISATION (20 exercices)
    // ═══════════════════════════════════════
    const desens = [
      ex("desensibilisation", "desens-sons-enregistres", "Désensibilisation sons enregistrés", "Écouter des sons à volume croissant", "débutant", "ciblé", "10 min", 2, { reactive: true, tags: ["sons", "volume"] }),
      ex("desensibilisation", "desens-orage", "Désensibilisation orages", "Habituation progressive aux orages", "intermédiaire", "ciblé", "10 min", 3, { tags: ["orage", "peur"] }),
      ex("desensibilisation", "desens-feux-artifice", "Désensibilisation feux d'artifice", "Tolérer les explosions sonores", "avancé", "ciblé", "15 min", 4, { tags: ["feux", "peur"] }),
      ex("desensibilisation", "desens-aspirateur", "Désensibilisation aspirateur", "Accepter l'aspirateur sans fuir", "débutant", "ciblé", "5 min", 2, { puppy: true, tags: ["aspirateur", "maison"] }),
      ex("desensibilisation", "desens-voiture-trajet", "Habituation à la voiture", "Accepter les trajets en voiture", "intermédiaire", "ciblé", "15 min", 3, { tags: ["voiture", "trajet"] }),
      ex("desensibilisation", "desens-parapluie", "Désensibilisation parapluie", "Accepter l'ouverture d'un parapluie", "débutant", "ciblé", "5 min", 2, { tags: ["parapluie", "objets"] }),
      ex("desensibilisation", "desens-chapeau", "Désensibilisation casquettes/chapeaux", "Accepter les changements d'apparence", "débutant", "ciblé", "5 min", 2, { tags: ["chapeau", "apparence"] }),
      ex("desensibilisation", "desens-sol-grille", "Désensibilisation grilles au sol", "Marcher sur des grilles métalliques", "intermédiaire", "ciblé", "8 min", 3, { tags: ["grille", "surface"] }),
      ex("desensibilisation", "desens-eau", "Désensibilisation à l'eau", "Accepter progressivement l'eau", "débutant", "ciblé", "10 min", 2, { tags: ["eau", "baignade"] }),
      ex("desensibilisation", "desens-tondeuse", "Désensibilisation tondeuse", "Accepter le bruit de tondeuse", "intermédiaire", "ciblé", "8 min", 3, { tags: ["tondeuse", "bruit"] }),
      ex("desensibilisation", "desens-seche-cheveux", "Désensibilisation sèche-cheveux", "Tolérer le souffle et bruit du séchoir", "débutant", "ciblé", "5 min", 2, { tags: ["séchoir", "toilettage"] }),
      ex("desensibilisation", "desens-clippers", "Désensibilisation tondeuse toilettage", "Accepter le bruit et vibrations", "intermédiaire", "ciblé", "5 min", 3, { tags: ["toilettage", "vibrations"] }),
      ex("desensibilisation", "desens-museliere", "Désensibilisation muselière", "Port progressif de la muselière", "intermédiaire", "ciblé", "10 min", 3, { muzzle: true, tags: ["muselière", "habituation"] }),
      ex("desensibilisation", "desens-collier-elisabethain", "Désensibilisation collerette", "Accepter le port de la collerette", "intermédiaire", "ciblé", "10 min", 3, { tags: ["collerette", "vétérinaire"] }),
      ex("desensibilisation", "desens-manipulations-pattes", "Désensibilisation manipulation pattes", "Accepter qu'on touche les pattes", "débutant", "ciblé", "5 min", 2, { puppy: true, tags: ["pattes", "manipulation"] }),
      ex("desensibilisation", "desens-oreilles", "Désensibilisation nettoyage oreilles", "Accepter l'inspection des oreilles", "débutant", "ciblé", "5 min", 2, { tags: ["oreilles", "soins"] }),
      ex("desensibilisation", "desens-dents", "Désensibilisation brossage dents", "Accepter la brosse à dents", "intermédiaire", "ciblé", "5 min", 3, { tags: ["dents", "hygiène"] }),
      ex("desensibilisation", "desens-piqure", "Désensibilisation piqûres", "Simuler des injections", "avancé", "ciblé", "5 min", 4, { tags: ["piqûre", "vétérinaire"] }),
      ex("desensibilisation", "desens-cage-transport", "Désensibilisation cage de transport", "Accepter la cage progressivement", "débutant", "ciblé", "10 min", 2, { puppy: true, tags: ["cage", "transport"] }),
      ex("desensibilisation", "desens-sac-poubelle", "Désensibilisation bruits sacs plastique", "Accepter le froissement de sacs", "débutant", "ciblé", "5 min", 1, { tags: ["sac", "bruit"] }),
    ];
    allExercises.push(...desens);

    // ═══════════════════════════════════════
    // 7. CALME ET RELAXATION (20 exercices)
    // ═══════════════════════════════════════
    const calme = [
      ex("calme-relaxation", "protocole-relaxation", "Protocole de relaxation", "Détente complète sur tapis", "débutant", "fondation", "15 min", 2, { senior: true, reactive: true, tags: ["relaxation", "tapis"] }),
      ex("calme-relaxation", "tapis-calme", "Tapis de calme", "Se poser sur commande sur le tapis", "débutant", "fondation", "10 min", 2, { tags: ["tapis", "place"] }),
      ex("calme-relaxation", "zen-bowl", "Gamelle zen", "Manger calmement avec patience", "débutant", "fondation", "5 min", 1, { puppy: true, tags: ["gamelle", "patience"] }),
      ex("calme-relaxation", "massage-canin", "Massage canin", "Masser le chien pour le détendre", "débutant", "fondation", "10 min", 1, { senior: true, tags: ["massage", "contact"] }),
      ex("calme-relaxation", "respiration-guidee", "Respiration guidée", "Le maître inspire/expire pour calmer le chien", "débutant", "fondation", "5 min", 1, { tags: ["respiration", "miroir"] }),
      ex("calme-relaxation", "calme-sur-couverture", "Calme sur couverture", "Associer la couverture au calme", "débutant", "fondation", "10 min", 2, { equip: ["Couverture"], tags: ["couverture", "ancrage"] }),
      ex("calme-relaxation", "capturing-calme", "Capturing du calme", "Récompenser les moments de calme spontanés", "débutant", "fondation", "toute la journée", 1, { tags: ["capturing", "spontané"] }),
      ex("calme-relaxation", "attente-passive", "Attente passive", "Rester calme dans une situation d'attente", "intermédiaire", "fondation", "15 min", 3, { tags: ["attente", "patience"] }),
      ex("calme-relaxation", "relaxation-progressive", "Relaxation progressive de Karren Overall", "Protocole en 15 jours", "intermédiaire", "ciblé", "20 min", 3, { tags: ["protocol", "Overall"] }),
      ex("calme-relaxation", "calme-en-voiture", "Calme en voiture", "Rester zen pendant les trajets", "intermédiaire", "ciblé", "15 min", 3, { tags: ["voiture", "transport"] }),
      ex("calme-relaxation", "calme-restaurant", "Calme au restaurant", "Se coucher calmement sous la table", "avancé", "ciblé", "30 min", 4, { tags: ["restaurant", "public"] }),
      ex("calme-relaxation", "calme-cabinet-vet", "Calme en salle d'attente", "Rester calme chez le vétérinaire", "avancé", "ciblé", "15 min", 4, { reactive: true, tags: ["vétérinaire", "attente"] }),
      ex("calme-relaxation", "meditation-chien", "Méditation avec son chien", "Session de calme partagée", "débutant", "récupération", "10 min", 1, { senior: true, tags: ["méditation", "lien"] }),
      ex("calme-relaxation", "kong-occupe", "Kong/occupation calme", "Utiliser un jouet d'occupation", "débutant", "récupération", "15 min", 1, { equip: ["Kong", "Pâtée"], puppy: true, tags: ["kong", "occupation"] }),
      ex("calme-relaxation", "tapis-lickimat", "LickiMat/Tapis de léchage", "Léchage apaisant sur tapis", "débutant", "récupération", "10 min", 1, { equip: ["LickiMat"], tags: ["léchage", "apaisement"] }),
      ex("calme-relaxation", "calme-fin-journee", "Routine du soir", "Séquence de détente avant le coucher", "débutant", "fondation", "10 min", 1, { tags: ["routine", "soir"] }),
      ex("calme-relaxation", "recompenser-sommeil", "Récompenser le repos", "Friandise quand le chien dort calmement", "débutant", "fondation", "variable", 1, { tags: ["sommeil", "calme"] }),
      ex("calme-relaxation", "calme-pendant-activites", "Calme pendant vos activités", "Rester calme quand vous êtes occupé", "intermédiaire", "fondation", "20 min", 3, { tags: ["activités", "autonomie"] }),
      ex("calme-relaxation", "calme-exterieur", "Calme en extérieur", "Se poser dehors malgré les stimuli", "avancé", "ciblé", "15 min", 4, { reactive: true, tags: ["extérieur", "calme"] }),
      ex("calme-relaxation", "transition-energie", "Transition énergie→calme", "Passer d'un état excité au calme", "intermédiaire", "ciblé", "10 min", 3, { tags: ["transition", "énergie"] }),
    ];
    allExercises.push(...calme);

    // ═══════════════════════════════════════
    // 8. AUTONOMIE ET SOLITUDE (15 exercices)
    // ═══════════════════════════════════════
    const solitude = [
      ex("autonomie-solitude", "solitude-10s", "Solitude 10 secondes", "Quitter la pièce 10 secondes", "débutant", "ciblé", "5 min", 1, { puppy: true, tags: ["solitude", "début"] }),
      ex("autonomie-solitude", "solitude-1min", "Solitude 1 minute", "Absence d'une minute", "débutant", "ciblé", "5 min", 2, { tags: ["solitude", "progression"] }),
      ex("autonomie-solitude", "solitude-5min", "Solitude 5 minutes", "Absence de cinq minutes", "intermédiaire", "ciblé", "10 min", 3, { tags: ["solitude", "durée"] }),
      ex("autonomie-solitude", "solitude-15min", "Solitude 15 minutes", "Quart d'heure seul sans stress", "intermédiaire", "ciblé", "20 min", 3, { tags: ["solitude", "autonomie"] }),
      ex("autonomie-solitude", "solitude-30min", "Solitude 30 minutes", "Demi-heure d'absence", "avancé", "ciblé", "35 min", 4, { tags: ["solitude", "longue durée"] }),
      ex("autonomie-solitude", "solitude-1h", "Solitude 1 heure", "Première heure seul", "avancé", "ciblé", "65 min", 5, { tags: ["solitude", "objectif"] }),
      ex("autonomie-solitude", "porte-fermee", "Porte fermée progressif", "Fermer la porte progressivement", "débutant", "ciblé", "5 min", 2, { tags: ["porte", "séparation"] }),
      ex("autonomie-solitude", "ritual-depart", "Rituel de départ neutre", "Banaliser les départs", "intermédiaire", "ciblé", "5 min", 3, { tags: ["départ", "rituel"] }),
      ex("autonomie-solitude", "ritual-retour", "Rituel de retour calme", "Banaliser les retours", "intermédiaire", "ciblé", "5 min", 3, { tags: ["retour", "calme"] }),
      ex("autonomie-solitude", "occupation-seul", "Occupation seul", "Utiliser un enrichissement en votre absence", "débutant", "ciblé", "variable", 2, { equip: ["Kong", "Puzzle"], tags: ["occupation", "autonomie"] }),
      ex("autonomie-solitude", "camera-monitoring", "Surveillance caméra", "Observer le comportement en votre absence", "intermédiaire", "ciblé", "variable", 2, { equip: ["Caméra"], tags: ["caméra", "observation"] }),
      ex("autonomie-solitude", "detachement-piece", "Détachement dans la maison", "Rester dans une autre pièce", "débutant", "fondation", "10 min", 2, { tags: ["détachement", "maison"] }),
      ex("autonomie-solitude", "barriere-bebe", "Habituation barrière bébé", "Accepter la séparation par barrière", "débutant", "ciblé", "10 min", 2, { equip: ["Barrière"], tags: ["barrière", "séparation"] }),
      ex("autonomie-solitude", "ignorer-depart", "Ignorer les signaux de départ", "Ne plus stresser quand vous prenez les clés", "intermédiaire", "ciblé", "10 min", 3, { tags: ["signaux", "départ"] }),
      ex("autonomie-solitude", "solitude-jardin", "Solitude au jardin", "Rester seul dans le jardin", "intermédiaire", "ciblé", "15 min", 3, { tags: ["jardin", "extérieur"] }),
    ];
    allExercises.push(...solitude);

    // ═══════════════════════════════════════
    // 9. MANIPULATION ET SOINS (15 exercices)
    // ═══════════════════════════════════════
    const manip = [
      ex("manipulation-soins", "toucher-pattes", "Toucher les pattes", "Accepter la manipulation des pattes", "débutant", "fondation", "5 min", 1, { puppy: true, tags: ["pattes", "manipulation"] }),
      ex("manipulation-soins", "couper-griffes", "Couper les griffes", "Accepter la coupe de griffes", "intermédiaire", "ciblé", "5 min", 3, { equip: ["Coupe-griffes"], tags: ["griffes", "soins"] }),
      ex("manipulation-soins", "brossage", "Brossage", "Accepter le brossage complet", "débutant", "fondation", "10 min", 2, { equip: ["Brosse"], tags: ["brossage", "poils"] }),
      ex("manipulation-soins", "nettoyage-yeux", "Nettoyage des yeux", "Accepter le nettoyage oculaire", "intermédiaire", "ciblé", "3 min", 2, { tags: ["yeux", "hygiène"] }),
      ex("manipulation-soins", "nettoyage-oreilles", "Nettoyage des oreilles", "Accepter le produit auriculaire", "intermédiaire", "ciblé", "5 min", 3, { tags: ["oreilles", "nettoyage"] }),
      ex("manipulation-soins", "bain", "Bain", "Accepter le bain et le séchage", "intermédiaire", "ciblé", "15 min", 3, { tags: ["bain", "eau"] }),
      ex("manipulation-soins", "inspection-dents", "Inspection des dents", "Ouvrir la gueule pour vérification", "intermédiaire", "ciblé", "3 min", 3, { tags: ["dents", "inspection"] }),
      ex("manipulation-soins", "prendre-temperature", "Prise de température", "Accepter le thermomètre", "avancé", "ciblé", "3 min", 4, { tags: ["température", "vétérinaire"] }),
      ex("manipulation-soins", "mettre-harnais", "Mettre le harnais", "Coopérer pour l'habillage", "débutant", "fondation", "3 min", 1, { puppy: true, equip: ["Harnais"], tags: ["harnais", "équipement"] }),
      ex("manipulation-soins", "palpation-corporelle", "Palpation corporelle", "Accepter la palpation de tout le corps", "intermédiaire", "fondation", "5 min", 2, { tags: ["palpation", "examen"] }),
      ex("manipulation-soins", "donner-medicament", "Donner un médicament", "Prendre un comprimé ou sirop", "intermédiaire", "ciblé", "3 min", 3, { tags: ["médicament", "santé"] }),
      ex("manipulation-soins", "cooperative-care", "Soins coopératifs (Bucket Game)", "Le chien consent aux soins", "intermédiaire", "ciblé", "10 min", 3, { equip: ["Bol", "Friandises"], tags: ["consentement", "coopératif"] }),
      ex("manipulation-soins", "toilettage-pro", "Toilettage professionnel", "Rester calme chez le toiletteur", "avancé", "ciblé", "30 min", 4, { tags: ["toiletteur", "pro"] }),
      ex("manipulation-soins", "examen-veterinaire", "Simulation examen vétérinaire", "Reproduire les gestes du vétérinaire", "intermédiaire", "ciblé", "10 min", 3, { tags: ["vétérinaire", "simulation"] }),
      ex("manipulation-soins", "chin-rest", "Chin rest (menton posé)", "Poser le menton sur commande pour les soins", "intermédiaire", "ciblé", "5 min", 2, { tags: ["chin rest", "consentement"] }),
    ];
    allExercises.push(...manip);

    // ═══════════════════════════════════════
    // 10. PROPRIOCEPTION ET FITNESS (20 exercices)
    // ═══════════════════════════════════════
    const proprio = [
      ex("proprioception-fitness", "balance-coussin", "Équilibre sur coussin", "Se tenir sur un coussin instable", "débutant", "fondation", "5 min", 2, { equip: ["Coussin d'équilibre"], tags: ["équilibre", "proprioception"] }),
      ex("proprioception-fitness", "cavaletti", "Cavaletti", "Marcher par-dessus des barres au sol", "débutant", "fondation", "8 min", 2, { equip: ["Barres"], tags: ["cavaletti", "coordination"] }),
      ex("proprioception-fitness", "planche-wobble", "Planche d'équilibre", "Se tenir sur une planche instable", "intermédiaire", "ciblé", "5 min", 3, { equip: ["Wobble board"], tags: ["balance", "confiance"] }),
      ex("proprioception-fitness", "marche-arriere", "Marche arrière", "Reculer en ligne droite", "intermédiaire", "ciblé", "5 min", 3, { tags: ["recul", "coordination"] }),
      ex("proprioception-fitness", "pattes-avant-surevelees", "Pattes avant surélevées", "Poser les pattes avant sur un objet", "débutant", "fondation", "5 min", 2, { tags: ["surélévation", "force"] }),
      ex("proprioception-fitness", "pivot-arriere", "Pivot arrière", "Les pattes arrière tournent autour d'un objet", "avancé", "trick", "8 min", 4, { tags: ["pivot", "arrière"] }),
      ex("proprioception-fitness", "slalom-cones", "Slalom entre cônes", "Zigzaguer entre des cônes", "intermédiaire", "fondation", "8 min", 3, { equip: ["Cônes"], tags: ["slalom", "agilité"] }),
      ex("proprioception-fitness", "4-pattes-objet", "4 pattes sur un objet", "Monter complètement sur une plateforme", "intermédiaire", "ciblé", "5 min", 3, { tags: ["plateforme", "confiance"] }),
      ex("proprioception-fitness", "crawl", "Crawl", "Ramper sous un obstacle", "intermédiaire", "trick", "5 min", 3, { tags: ["ramper", "souplesse"] }),
      ex("proprioception-fitness", "etirements-guides", "Étirements guidés", "Étirer le chien avec des leurres", "débutant", "récupération", "5 min", 1, { senior: true, tags: ["étirements", "souplesse"] }),
      ex("proprioception-fitness", "montee-pente", "Montée de pente", "Grimper une pente raide", "intermédiaire", "ciblé", "10 min", 3, { tags: ["pente", "force"] }),
      ex("proprioception-fitness", "course-cote", "Course en côte", "Sprints en montée", "avancé", "ciblé", "10 min", 4, { tags: ["course", "cardio"] }),
      ex("proprioception-fitness", "nage", "Nage", "Nager pour la rééducation ou le fitness", "intermédiaire", "ciblé", "10 min", 3, { tags: ["nage", "aquatique"], contra: ["Chien ne sachant pas nager"] }),
      ex("proprioception-fitness", "marche-obstacles", "Parcours d'obstacles naturels", "Utiliser l'environnement naturel", "intermédiaire", "fondation", "15 min", 3, { tags: ["nature", "obstacles"] }),
      ex("proprioception-fitness", "assis-debout-rep", "Assis-debout répétitions", "Renforcement musculaire pattes arrière", "intermédiaire", "ciblé", "5 min", 3, { senior: true, tags: ["renforcement", "muscles"] }),
      ex("proprioception-fitness", "marche-sur-poutre", "Marche sur poutre", "Traverser une poutre surélevée", "avancé", "ciblé", "5 min", 4, { equip: ["Poutre"], tags: ["poutre", "équilibre"] }),
      ex("proprioception-fitness", "trottoir-bordure", "Marche sur bordure de trottoir", "Suivre le bord en équilibre", "débutant", "fondation", "5 min", 2, { tags: ["bordure", "équilibre"] }),
      ex("proprioception-fitness", "reculer-pente", "Reculer en pente", "Marche arrière sur terrain en pente", "avancé", "ciblé", "5 min", 4, { tags: ["recul", "pente"] }),
      ex("proprioception-fitness", "yoga-canin", "Doga (yoga canin)", "Positions de yoga avec le chien", "débutant", "récupération", "10 min", 1, { senior: true, tags: ["yoga", "détente"] }),
      ex("proprioception-fitness", "tapis-roulant-canin", "Tapis roulant canin", "Marche ou trot sur tapis roulant", "avancé", "ciblé", "10 min", 4, { equip: ["Tapis roulant"], tags: ["tapis roulant", "cardio"] }),
    ];
    allExercises.push(...proprio);

    // ═══════════════════════════════════════
    // 11. STIMULATION MENTALE (20 exercices)
    // ═══════════════════════════════════════
    const mental = [
      ex("stimulation-mentale", "puzzle-debutant", "Puzzle débutant", "Résoudre un puzzle simple", "débutant", "mental", "10 min", 1, { puppy: true, equip: ["Puzzle niveau 1"], tags: ["puzzle", "cognitif"] }),
      ex("stimulation-mentale", "puzzle-intermediaire", "Puzzle intermédiaire", "Puzzle avec mécanismes multiples", "intermédiaire", "mental", "10 min", 3, { equip: ["Puzzle niveau 2"], tags: ["puzzle", "difficulté"] }),
      ex("stimulation-mentale", "puzzle-expert", "Puzzle expert", "Puzzle complexe multi-étapes", "avancé", "mental", "15 min", 5, { equip: ["Puzzle niveau 3"], tags: ["puzzle", "expert"] }),
      ex("stimulation-mentale", "cache-friandises", "Cache-friandises maison", "Cacher des friandises dans la maison", "débutant", "mental", "10 min", 1, { puppy: true, tags: ["cache", "recherche"] }),
      ex("stimulation-mentale", "tapis-fouille", "Tapis de fouille (snuffle mat)", "Chercher des friandises dans le tapis", "débutant", "mental", "10 min", 1, { equip: ["Snuffle mat"], tags: ["flair", "fouille"], senior: true }),
      ex("stimulation-mentale", "boite-a-chaussures", "Jeu de boîtes", "Trouver la bonne boîte parmi plusieurs", "intermédiaire", "mental", "8 min", 2, { tags: ["boîtes", "choix"] }),
      ex("stimulation-mentale", "nom-jouets", "Nommer les jouets", "Apprendre le nom de différents jouets", "avancé", "mental", "10 min", 4, { tags: ["noms", "vocabulaire"] }),
      ex("stimulation-mentale", "ranger-jouets", "Ranger ses jouets", "Mettre les jouets dans un panier", "avancé", "mental", "10 min", 5, { tags: ["rangement", "séquence"] }),
      ex("stimulation-mentale", "gauche-droite", "Gauche/Droite", "Distinguer gauche et droite", "avancé", "mental", "8 min", 5, { tags: ["direction", "discrimination"] }),
      ex("stimulation-mentale", "compter", "Compter les aboiements", "Aboyer un nombre de fois précis", "avancé", "mental", "8 min", 5, { tags: ["comptage", "contrôle"] }),
      ex("stimulation-mentale", "quel-main", "Dans quelle main ?", "Indiquer la main contenant la friandise", "débutant", "mental", "5 min", 1, { puppy: true, tags: ["choix", "flair"] }),
      ex("stimulation-mentale", "parcours-mental", "Parcours mental", "Séquence d'actions à mémoriser", "avancé", "mental", "15 min", 5, { tags: ["mémoire", "séquence"] }),
      ex("stimulation-mentale", "discrimination-formes", "Discrimination de formes", "Distinguer différentes formes", "avancé", "mental", "10 min", 5, { tags: ["formes", "discrimination"] }),
      ex("stimulation-mentale", "bouteille-friandises", "Bouteille à friandises", "Faire sortir les croquettes d'une bouteille", "débutant", "mental", "10 min", 1, { equip: ["Bouteille plastique"], tags: ["DIY", "occupation"] }),
      ex("stimulation-mentale", "muffin-tin-game", "Jeu du moule à muffins", "Soulever les balles pour trouver les friandises", "débutant", "mental", "8 min", 1, { equip: ["Moule muffins", "Balles tennis"], tags: ["jeu", "flair"] }),
      ex("stimulation-mentale", "serviette-roulee", "Serviette roulée", "Dérouler une serviette pour trouver les friandises", "débutant", "mental", "5 min", 1, { tags: ["DIY", "manipulation"] }),
      ex("stimulation-mentale", "jeu-gobelet", "Jeu du gobelet", "Shell game avec gobelets", "intermédiaire", "mental", "8 min", 3, { tags: ["gobelet", "observation"] }),
      ex("stimulation-mentale", "distributeur-repas", "Distributeur de repas interactif", "Prendre ses repas en puzzle", "débutant", "mental", "15 min", 1, { equip: ["Gamelle interactive"], tags: ["repas", "lent"] }),
      ex("stimulation-mentale", "discrimination-odeurs", "Discrimination d'odeurs", "Identifier une odeur parmi d'autres", "avancé", "mental", "10 min", 4, { tags: ["odeur", "discrimination"] }),
      ex("stimulation-mentale", "cardboard-destroy", "Déchiquetage de carton", "Détruire un carton pour accéder aux friandises", "débutant", "mental", "5 min", 1, { tags: ["carton", "destruction", "enrichissement"] }),
    ];
    allExercises.push(...mental);

    // ═══════════════════════════════════════
    // 12. TRICKS ET TOURS (25 exercices)
    // ═══════════════════════════════════════
    const tricks = [
      ex("tricks-tours", "donne-patte", "Donne la patte", "Poser la patte dans la main", "débutant", "trick", "5 min", 1, { puppy: true, tags: ["patte", "classique"] }),
      ex("tricks-tours", "tourne", "Tourne", "Tourner sur soi-même", "débutant", "trick", "5 min", 2, { tags: ["tourne", "spin"] }),
      ex("tricks-tours", "roule", "Roule", "Faire une roulade complète", "intermédiaire", "trick", "8 min", 3, { tags: ["roule", "sol"], contra: ["Problèmes de dos"] }),
      ex("tricks-tours", "fais-le-beau", "Fais le beau", "S'asseoir sur les pattes arrière", "intermédiaire", "trick", "8 min", 3, { tags: ["beau", "équilibre"] }),
      ex("tricks-tours", "salut", "Salut", "Baisser l'avant du corps", "intermédiaire", "trick", "5 min", 2, { tags: ["salut", "révérence"] }),
      ex("tricks-tours", "fais-le-mort", "Fais le mort", "Se coucher sur le flanc immobile", "intermédiaire", "trick", "8 min", 3, { tags: ["mort", "statique"] }),
      ex("tricks-tours", "slalom-jambes", "Slalom entre les jambes", "Passer en huit entre les jambes", "intermédiaire", "trick", "8 min", 3, { tags: ["slalom", "jambes"] }),
      ex("tricks-tours", "sauter-bras", "Sauter dans les bras", "Sauter dans les bras du maître", "avancé", "trick", "5 min", 4, { tags: ["saut", "confiance"], contra: ["Chien lourd +25kg"] }),
      ex("tricks-tours", "ramasser-objet", "Ramasser un objet", "Prendre et rapporter un objet désigné", "intermédiaire", "trick", "8 min", 3, { tags: ["ramasser", "apporter"] }),
      ex("tricks-tours", "ouvrir-porte", "Ouvrir une porte", "Tirer une corde pour ouvrir", "avancé", "trick", "10 min", 4, { tags: ["porte", "corde"] }),
      ex("tricks-tours", "eteindre-lumiere", "Éteindre la lumière", "Appuyer sur l'interrupteur", "avancé", "trick", "10 min", 4, { tags: ["lumière", "interrupteur"] }),
      ex("tricks-tours", "honte", "Cache ta honte", "Cacher le museau avec la patte", "avancé", "trick", "10 min", 4, { tags: ["honte", "patte"] }),
      ex("tricks-tours", "aboie-sur-commande", "Aboie sur commande", "Aboyer sur signal", "intermédiaire", "trick", "5 min", 3, { tags: ["aboiement", "signal"] }),
      ex("tricks-tours", "chuchoter", "Chuchoter", "Aboiement très doux sur commande", "avancé", "trick", "8 min", 4, { tags: ["chuchoter", "volume"] }),
      ex("tricks-tours", "marche-arriere-trick", "Moonwalk", "Reculer de manière stylée", "avancé", "trick", "8 min", 4, { tags: ["recul", "style"] }),
      ex("tricks-tours", "sauter-obstacle", "Sauter un obstacle", "Franchir une barre en sautant", "intermédiaire", "trick", "8 min", 3, { equip: ["Barre de saut"], tags: ["saut", "obstacle"] }),
      ex("tricks-tours", "porter-panier", "Porter un panier", "Transporter un panier en gueule", "avancé", "trick", "10 min", 4, { equip: ["Petit panier"], tags: ["porter", "utilité"] }),
      ex("tricks-tours", "eternuer", "Éternuer sur commande", "Provoquer un éternuement drôle", "avancé", "trick", "5 min", 4, { tags: ["éternuer", "drôle"] }),
      ex("tricks-tours", "reculer-echelle", "Reculer sur une échelle", "Marcher en arrière sur les barreaux", "avancé", "trick", "10 min", 5, { equip: ["Échelle au sol"], tags: ["échelle", "coordination"] }),
      ex("tricks-tours", "croiser-pattes", "Croiser les pattes", "Croiser les pattes avant en position couchée", "avancé", "trick", "8 min", 4, { tags: ["croiser", "élégance"] }),
      ex("tricks-tours", "dire-oui", "Dire oui", "Hocher la tête de haut en bas", "avancé", "trick", "8 min", 4, { tags: ["oui", "tête"] }),
      ex("tricks-tours", "dire-non", "Dire non", "Secouer la tête", "avancé", "trick", "8 min", 4, { tags: ["non", "tête"] }),
      ex("tricks-tours", "high-five", "High five", "Taper dans la main levée", "débutant", "trick", "5 min", 2, { puppy: true, tags: ["high five", "patte"] }),
      ex("tricks-tours", "peekaboo", "Peekaboo", "Passer la tête entre les jambes par derrière", "intermédiaire", "trick", "8 min", 3, { tags: ["peekaboo", "position"] }),
      ex("tricks-tours", "fermer-tiroir", "Fermer un tiroir", "Pousser un tiroir avec le nez", "avancé", "trick", "8 min", 4, { tags: ["tiroir", "target nez"] }),
    ];
    allExercises.push(...tricks);

    // ═══════════════════════════════════════
    // 13. AGILITÉ (20 exercices)
    // ═══════════════════════════════════════
    const agilite = [
      ex("agilite", "tunnel", "Tunnel", "Traverser un tunnel", "débutant", "fondation", "5 min", 2, { equip: ["Tunnel"], tags: ["tunnel", "confiance"] }),
      ex("agilite", "saut-haies", "Saut de haies", "Sauter des haies de hauteur variable", "intermédiaire", "ciblé", "8 min", 3, { equip: ["Haies réglables"], tags: ["haies", "saut"] }),
      ex("agilite", "slalom-piquets", "Slalom entre piquets", "Slalomer entre 6-12 piquets", "avancé", "ciblé", "10 min", 4, { equip: ["Piquets slalom"], tags: ["slalom", "vitesse"] }),
      ex("agilite", "passerelle", "Passerelle", "Monter et traverser une passerelle", "intermédiaire", "ciblé", "8 min", 3, { equip: ["Passerelle"], tags: ["passerelle", "hauteur"] }),
      ex("agilite", "balancoire", "Balançoire (teeter)", "Passer sur la bascule", "avancé", "ciblé", "10 min", 4, { equip: ["Balançoire agility"], tags: ["bascule", "équilibre"] }),
      ex("agilite", "table-pause", "Table de pause", "Monter et s'asseoir sur la table", "débutant", "fondation", "5 min", 2, { equip: ["Table agility"], tags: ["table", "contrôle"] }),
      ex("agilite", "pneu-saut", "Saut dans le pneu", "Sauter à travers un pneu suspendu", "intermédiaire", "ciblé", "8 min", 3, { equip: ["Pneu agility"], tags: ["pneu", "saut"] }),
      ex("agilite", "palissade", "Palissade (mur)", "Escalader et franchir un mur", "avancé", "ciblé", "8 min", 4, { equip: ["Palissade"], tags: ["mur", "escalade"] }),
      ex("agilite", "mini-parcours", "Mini parcours 3 obstacles", "Enchaîner 3 obstacles", "intermédiaire", "ciblé", "10 min", 3, { tags: ["parcours", "enchaînement"] }),
      ex("agilite", "parcours-complet", "Parcours complet", "20+ obstacles en séquence", "avancé", "ciblé", "15 min", 5, { tags: ["parcours", "compétition"] }),
      ex("agilite", "zone-contact", "Zones de contact", "Toucher les zones jaunes correctement", "avancé", "ciblé", "8 min", 4, { tags: ["zones", "précision"] }),
      ex("agilite", "saut-longueur", "Saut en longueur", "Sauter une distance au sol", "intermédiaire", "ciblé", "8 min", 3, { equip: ["Barres au sol"], tags: ["longueur", "saut"] }),
      ex("agilite", "tunnel-souple", "Tunnel souple (chute)", "Traverser un tunnel avec tissu", "intermédiaire", "ciblé", "5 min", 3, { equip: ["Tunnel souple"], tags: ["tunnel", "confiance"] }),
      ex("agilite", "direction-gauche-droite", "Direction gauche/droite en agility", "Orienter le chien à distance", "avancé", "ciblé", "10 min", 5, { tags: ["direction", "distance"] }),
      ex("agilite", "front-cross", "Front cross", "Changement de côté par l'avant", "avancé", "ciblé", "8 min", 4, { tags: ["handling", "cross"] }),
      ex("agilite", "rear-cross", "Rear cross", "Changement de côté par l'arrière", "avancé", "ciblé", "8 min", 4, { tags: ["handling", "cross"] }),
      ex("agilite", "blind-cross", "Blind cross", "Changement de côté en aveugle", "avancé", "ciblé", "8 min", 5, { tags: ["handling", "avancé"] }),
      ex("agilite", "vitesse-tunnel", "Vitesse au tunnel", "Traverser le tunnel le plus vite possible", "intermédiaire", "ciblé", "5 min", 3, { tags: ["vitesse", "tunnel"] }),
      ex("agilite", "cerceau", "Sauter dans un cerceau", "Passer à travers un cerceau tenu", "débutant", "fondation", "5 min", 2, { equip: ["Cerceau"], tags: ["cerceau", "saut"] }),
      ex("agilite", "agilite-maison", "Agility maison DIY", "Parcours avec des objets du quotidien", "débutant", "fondation", "10 min", 2, { tags: ["maison", "DIY", "improvisation"] }),
    ];
    allExercises.push(...agilite);

    // ═══════════════════════════════════════
    // 14. PISTAGE ET RECHERCHE (20 exercices)
    // ═══════════════════════════════════════
    const pistage = [
      ex("pistage-recherche", "recherche-friandise-sol", "Recherche de friandises au sol", "Trouver des friandises cachées", "débutant", "mental", "10 min", 1, { puppy: true, tags: ["recherche", "flair"] }),
      ex("pistage-recherche", "piste-courte", "Piste courte (5m)", "Suivre une piste de 5 mètres", "débutant", "fondation", "10 min", 2, { tags: ["piste", "début"] }),
      ex("pistage-recherche", "piste-moyenne", "Piste moyenne (20m)", "Suivre une piste de 20 mètres", "intermédiaire", "ciblé", "15 min", 3, { tags: ["piste", "progression"] }),
      ex("pistage-recherche", "piste-longue", "Piste longue (50m+)", "Suivre une longue piste avec virages", "avancé", "ciblé", "20 min", 4, { tags: ["piste", "distance"] }),
      ex("pistage-recherche", "recherche-objet-perdu", "Recherche d'objet perdu", "Retrouver un objet du maître", "intermédiaire", "ciblé", "10 min", 3, { tags: ["objet", "recherche"] }),
      ex("pistage-recherche", "recherche-personne", "Recherche de personne", "Trouver une personne cachée", "intermédiaire", "ciblé", "15 min", 3, { tags: ["personne", "recherche"] }),
      ex("pistage-recherche", "nosework-boites", "Nosework en boîtes", "Identifier l'odeur cible parmi les boîtes", "intermédiaire", "mental", "10 min", 3, { tags: ["nosework", "boîtes"] }),
      ex("pistage-recherche", "nosework-piece", "Nosework dans une pièce", "Trouver l'odeur cachée dans la pièce", "intermédiaire", "mental", "10 min", 3, { tags: ["nosework", "intérieur"] }),
      ex("pistage-recherche", "nosework-exterieur", "Nosework en extérieur", "Recherche olfactive en plein air", "avancé", "mental", "15 min", 4, { tags: ["nosework", "extérieur"] }),
      ex("pistage-recherche", "mantrailing", "Mantrailing initiation", "Suivre la piste d'une personne spécifique", "avancé", "ciblé", "20 min", 4, { equip: ["Harnais mantrailing", "Longe"], tags: ["mantrailing", "pistage"] }),
      ex("pistage-recherche", "discrimination-odeurs-pistage", "Discrimination d'odeurs", "Identifier une odeur parmi d'autres", "avancé", "mental", "10 min", 4, { tags: ["discrimination", "olfactif"] }),
      ex("pistage-recherche", "pistage-urbain", "Pistage urbain", "Suivre une piste en milieu urbain", "avancé", "ciblé", "20 min", 5, { tags: ["urbain", "piste"] }),
      ex("pistage-recherche", "indication-passive", "Indication passive (sit/couché)", "Marquer la trouvaille en s'asseyant", "intermédiaire", "ciblé", "8 min", 3, { tags: ["indication", "marquage"] }),
      ex("pistage-recherche", "indication-active", "Indication active (gratter/aboyer)", "Signaler la trouvaille activement", "intermédiaire", "ciblé", "8 min", 3, { tags: ["indication", "signal"] }),
      ex("pistage-recherche", "piste-vieille", "Piste vieillie (2h+)", "Suivre une piste posée il y a 2 heures", "avancé", "ciblé", "20 min", 5, { tags: ["vieille", "difficulté"] }),
      ex("pistage-recherche", "recherche-truffe", "Recherche de truffes", "Trouver des truffes enfouies", "avancé", "ciblé", "15 min", 4, { tags: ["truffe", "gastronomie"] }),
      ex("pistage-recherche", "recherche-jouet-cache", "Recherche de jouet caché", "Retrouver son jouet préféré caché", "débutant", "mental", "8 min", 1, { puppy: true, tags: ["jouet", "recherche"] }),
      ex("pistage-recherche", "piste-en-foret", "Piste en forêt", "Pistage en milieu boisé complexe", "avancé", "ciblé", "20 min", 4, { tags: ["forêt", "nature"] }),
      ex("pistage-recherche", "tri-odeurs", "Tri d'odeurs", "Sélectionner l'odeur correcte parmi plusieurs", "avancé", "mental", "10 min", 5, { tags: ["tri", "odeurs"] }),
      ex("pistage-recherche", "piste-avec-articles", "Piste avec articles", "Marquer les objets trouvés en cours de piste", "avancé", "ciblé", "20 min", 5, { tags: ["articles", "piste"] }),
    ];
    allExercises.push(...pistage);

    // ═══════════════════════════════════════
    // 15. TRAVAIL AQUATIQUE (10 exercices)
    // ═══════════════════════════════════════
    const aquatique = [
      ex("travail-aquatique", "entrer-eau", "Entrer dans l'eau", "Approche progressive de l'eau", "débutant", "fondation", "10 min", 2, { tags: ["eau", "confiance"] }),
      ex("travail-aquatique", "marche-eau-peu-profonde", "Marche en eau peu profonde", "Se déplacer dans l'eau jusqu'aux pattes", "débutant", "fondation", "10 min", 2, { tags: ["marche", "eau"] }),
      ex("travail-aquatique", "nage-assistee", "Nage assistée", "Nager avec gilet de sauvetage", "intermédiaire", "ciblé", "10 min", 3, { equip: ["Gilet de sauvetage"], tags: ["nage", "sécurité"] }),
      ex("travail-aquatique", "rapport-eau", "Rapport à l'eau", "Rapporter un objet dans l'eau", "intermédiaire", "ciblé", "10 min", 3, { tags: ["rapport", "eau"] }),
      ex("travail-aquatique", "nage-longue-distance", "Nage longue distance", "Nager sur 50m+", "avancé", "ciblé", "15 min", 4, { tags: ["distance", "endurance"] }),
      ex("travail-aquatique", "saut-ponton", "Saut depuis un ponton", "Sauter dans l'eau depuis une plateforme", "avancé", "ciblé", "10 min", 4, { tags: ["saut", "dock diving"] }),
      ex("travail-aquatique", "hydrothérapie", "Hydrothérapie", "Exercice thérapeutique en eau", "intermédiaire", "récupération", "10 min", 2, { senior: true, tags: ["thérapie", "rééducation"] }),
      ex("travail-aquatique", "sortie-eau", "Sortie de l'eau contrôlée", "Sortir calmement sans secouer immédiatement", "intermédiaire", "ciblé", "5 min", 3, { tags: ["sortie", "contrôle"] }),
      ex("travail-aquatique", "nage-courant", "Nage en courant léger", "Nager dans un courant modéré", "avancé", "ciblé", "10 min", 4, { tags: ["courant", "force"] }),
      ex("travail-aquatique", "jeu-aquatique", "Jeux aquatiques", "Activités ludiques dans l'eau", "débutant", "récupération", "15 min", 2, { tags: ["jeu", "eau", "plaisir"] }),
    ];
    allExercises.push(...aquatique);

    // ═══════════════════════════════════════
    // 16. CANICROSS ET SPORT (15 exercices)
    // ═══════════════════════════════════════
    const sport = [
      ex("canicross-sport", "canicross-initiation", "Canicross initiation", "Courir ensemble avec harnais", "intermédiaire", "ciblé", "15 min", 3, { equip: ["Harnais canicross", "Ceinture", "Ligne de trait"], tags: ["canicross", "course"] }),
      ex("canicross-sport", "cani-marche", "Cani-marche", "Marche sportive tractée", "débutant", "fondation", "20 min", 2, { equip: ["Harnais", "Ligne"], tags: ["marche", "sport"] }),
      ex("canicross-sport", "cani-vtt", "Cani-VTT", "VTT avec chien attelé", "avancé", "ciblé", "20 min", 5, { equip: ["VTT", "Barre", "Harnais"], tags: ["VTT", "vitesse"] }),
      ex("canicross-sport", "cani-trottinette", "Cani-trottinette", "Trottinette tractée par le chien", "intermédiaire", "ciblé", "15 min", 4, { equip: ["Trottinette", "Harnais"], tags: ["trottinette", "traction"] }),
      ex("canicross-sport", "frisbee-base", "Frisbee base", "Attraper un frisbee lancé court", "débutant", "fondation", "10 min", 2, { equip: ["Frisbee souple"], tags: ["frisbee", "jeu"] }),
      ex("canicross-sport", "frisbee-avance", "Frisbee figures avancées", "Sauts et figures au frisbee", "avancé", "ciblé", "15 min", 4, { equip: ["Frisbees"], tags: ["frisbee", "acrobatie"] }),
      ex("canicross-sport", "flyball-intro", "Flyball introduction", "Courir, déclencher la boîte, rapporter", "intermédiaire", "ciblé", "10 min", 3, { equip: ["Boîte flyball", "Balles"], tags: ["flyball", "vitesse"] }),
      ex("canicross-sport", "dog-dancing", "Dog dancing (obé-rythmée)", "Chorégraphie avec musique", "avancé", "trick", "15 min", 4, { tags: ["danse", "créativité"] }),
      ex("canicross-sport", "sprint-court", "Sprint court (50m)", "Course rapide sur courte distance", "intermédiaire", "ciblé", "5 min", 3, { tags: ["sprint", "vitesse"] }),
      ex("canicross-sport", "endurance-longue", "Course d'endurance", "Course longue à rythme modéré", "avancé", "ciblé", "30 min", 4, { tags: ["endurance", "cardio"] }),
      ex("canicross-sport", "treibball", "Treibball", "Pousser des ballons dans un but", "intermédiaire", "ciblé", "15 min", 3, { equip: ["Gros ballons"], tags: ["treibball", "stratégie"] }),
      ex("canicross-sport", "hoopers", "Hoopers", "Parcours de cerceaux et tunnels à distance", "intermédiaire", "ciblé", "15 min", 3, { equip: ["Cerceaux", "Tunnels"], tags: ["hoopers", "distance"] }),
      ex("canicross-sport", "cani-rando", "Cani-randonnée", "Randonnée longue avec le chien équipé", "intermédiaire", "ciblé", "variable", 3, { equip: ["Sac à dos chien"], tags: ["randonnée", "nature"] }),
      ex("canicross-sport", "weight-pulling", "Weight pulling initiation", "Tirer des charges progressives", "avancé", "ciblé", "10 min", 4, { equip: ["Harnais traction", "Chariot"], tags: ["traction", "force"], breeds: ["Malinois", "Husky", "Pitbull"] }),
      ex("canicross-sport", "echauffement-sportif", "Échauffement sportif", "Routine d'échauffement avant sport", "débutant", "fondation", "5 min", 1, { tags: ["échauffement", "prévention"] }),
    ];
    allExercises.push(...sport);

    // ═══════════════════════════════════════
    // 17. GESTION DES ÉMOTIONS (15 exercices)
    // ═══════════════════════════════════════
    const emotions = [
      ex("gestion-emotions", "jeu-interruptible", "Jeu interruptible", "Jouer puis stopper sur commande", "intermédiaire", "ciblé", "8 min", 3, { tags: ["jeu", "contrôle"] }),
      ex("gestion-emotions", "frustration-barriere", "Frustration derrière barrière", "Rester calme derrière une barrière", "intermédiaire", "ciblé", "8 min", 3, { tags: ["frustration", "barrière"] }),
      ex("gestion-emotions", "attente-recompense", "Attente de récompense", "Patienter pour obtenir la friandise", "débutant", "fondation", "5 min", 2, { tags: ["patience", "impulse"] }),
      ex("gestion-emotions", "excitation-controlée", "Excitation contrôlée", "Monter en excitation puis se calmer", "intermédiaire", "ciblé", "10 min", 3, { tags: ["excitation", "régulation"] }),
      ex("gestion-emotions", "gestion-peur", "Gestion de la peur", "Approcher un objet effrayant", "intermédiaire", "ciblé", "10 min", 3, { reactive: true, tags: ["peur", "confiance"] }),
      ex("gestion-emotions", "renoncement-friandise", "Renoncement à la friandise", "Laisser la friandise posée sans la prendre", "débutant", "fondation", "5 min", 2, { tags: ["renoncement", "contrôle"] }),
      ex("gestion-emotions", "calm-apres-jeu", "Calme après le jeu", "Retrouver le calme post-excitation", "intermédiaire", "ciblé", "8 min", 3, { tags: ["calme", "transition"] }),
      ex("gestion-emotions", "gerer-visiteurs", "Gérer les visiteurs", "Rester calme quand des gens arrivent", "intermédiaire", "ciblé", "10 min", 3, { tags: ["visiteurs", "excitation"] }),
      ex("gestion-emotions", "jouet-interdit", "Ignorer un jouet interdit", "Ne pas toucher un jouet posé devant lui", "intermédiaire", "ciblé", "5 min", 3, { tags: ["interdit", "contrôle"] }),
      ex("gestion-emotions", "frustration-porte", "Frustration à la porte", "Attendre calmement l'ouverture de la porte", "intermédiaire", "ciblé", "5 min", 3, { tags: ["porte", "patience"] }),
      ex("gestion-emotions", "gerer-competition", "Gérer la compétition alimentaire", "Rester calme quand un autre chien mange", "avancé", "ciblé", "10 min", 4, { tags: ["compétition", "nourriture"] }),
      ex("gestion-emotions", "resilience-echec", "Résilience face à l'échec", "Accepter de ne pas obtenir ce qu'on veut", "intermédiaire", "ciblé", "8 min", 3, { tags: ["résilience", "frustration"] }),
      ex("gestion-emotions", "joie-moderee", "Joie modérée au retour", "Accueillir le maître sans débordement", "intermédiaire", "ciblé", "5 min", 3, { tags: ["retour", "excitation"] }),
      ex("gestion-emotions", "gerer-bruit-soudain", "Gérer un bruit soudain", "Récupérer rapidement après un bruit fort", "intermédiaire", "ciblé", "8 min", 3, { reactive: true, tags: ["bruit", "récupération"] }),
      ex("gestion-emotions", "zen-game", "Zen Game (It's Yer Choice)", "Le chien se calme pour obtenir la récompense", "débutant", "fondation", "5 min", 2, { puppy: true, tags: ["zen", "autocontrôle"] }),
    ];
    allExercises.push(...emotions);

    // ═══════════════════════════════════════
    // 18. ÉDUCATION DU CHIOT (20 exercices)
    // ═══════════════════════════════════════
    const chiot = [
      ex("education-chiot", "proprete", "Apprentissage de la propreté", "Comprendre où faire ses besoins", "débutant", "fondation", "variable", 1, { puppy: true, tags: ["propreté", "base"] }),
      ex("education-chiot", "mordillement", "Inhibition de la morsure", "Apprendre à ne pas mordre", "débutant", "fondation", "5 min", 2, { puppy: true, tags: ["mordillement", "morsure"] }),
      ex("education-chiot", "exploration-securisee", "Exploration sécurisée", "Explorer de nouveaux environnements", "débutant", "fondation", "15 min", 1, { puppy: true, tags: ["exploration", "confiance"] }),
      ex("education-chiot", "socialisation-chiot", "Socialisation du chiot", "Rencontres positives avec divers stimuli", "débutant", "fondation", "10 min", 2, { puppy: true, tags: ["socialisation", "fenêtre"] }),
      ex("education-chiot", "handling-chiot", "Manipulation du chiot", "Habituer aux touchers de tout le corps", "débutant", "fondation", "5 min", 1, { puppy: true, tags: ["manipulation", "toucher"] }),
      ex("education-chiot", "cage-positive", "Introduction positive à la cage", "Associer la cage au confort", "débutant", "fondation", "10 min", 2, { puppy: true, equip: ["Cage", "Couverture"], tags: ["cage", "sécurité"] }),
      ex("education-chiot", "premier-rappel", "Premier rappel", "Venir quand on appelle", "débutant", "fondation", "3 min", 1, { puppy: true, tags: ["rappel", "chiot"] }),
      ex("education-chiot", "premiere-laisse", "Première laisse", "Accepter le collier et la laisse", "débutant", "fondation", "5 min", 1, { puppy: true, equip: ["Collier léger", "Laisse"], tags: ["laisse", "premier"] }),
      ex("education-chiot", "jeu-appropriate", "Jeu approprié", "Jouer correctement avec les jouets", "débutant", "fondation", "10 min", 1, { puppy: true, tags: ["jeu", "règles"] }),
      ex("education-chiot", "resilience-bruits-chiot", "Résilience aux bruits (chiot)", "Habituation précoce aux sons", "débutant", "fondation", "5 min", 1, { puppy: true, tags: ["bruits", "habituation"] }),
      ex("education-chiot", "chiot-voiture", "Premiers trajets en voiture", "Habituer le chiot à la voiture", "débutant", "ciblé", "10 min", 2, { puppy: true, tags: ["voiture", "habituation"] }),
      ex("education-chiot", "rencontre-chat", "Rencontre chat-chiot", "Première rencontre avec un chat", "intermédiaire", "ciblé", "10 min", 3, { puppy: true, tags: ["chat", "cohabitation"] }),
      ex("education-chiot", "surfaces-chiot", "Découverte de surfaces", "Marcher sur bois, métal, herbe, gravier", "débutant", "fondation", "8 min", 1, { puppy: true, tags: ["surfaces", "confiance"] }),
      ex("education-chiot", "calme-chiot", "Apprendre le calme (chiot)", "Capturer les moments de repos", "débutant", "fondation", "variable", 1, { puppy: true, tags: ["calme", "capturing"] }),
      ex("education-chiot", "noms-personnes", "Reconnaître les personnes", "Associer les noms aux membres de la famille", "débutant", "mental", "5 min", 2, { puppy: true, tags: ["noms", "famille"] }),
      ex("education-chiot", "chiot-jardin", "Découverte du jardin", "Explorer le jardin en sécurité", "débutant", "fondation", "10 min", 1, { puppy: true, tags: ["jardin", "exploration"] }),
      ex("education-chiot", "limites-maison", "Limites dans la maison", "Apprendre les zones interdites", "débutant", "fondation", "variable", 2, { puppy: true, tags: ["limites", "maison"] }),
      ex("education-chiot", "clicker-chiot", "Introduction au clicker (chiot)", "Associer le clic à la récompense", "débutant", "fondation", "3 min", 1, { puppy: true, equip: ["Clicker"], tags: ["clicker", "marqueur"] }),
      ex("education-chiot", "marcher-sans-tirer-chiot", "Marcher sans tirer (chiot)", "Premiers pas en laisse sans tension", "débutant", "fondation", "5 min", 2, { puppy: true, tags: ["marche", "laisse chiot"] }),
      ex("education-chiot", "chiot-toilettage", "Premier toilettage", "Habituer au brossage et au bain", "débutant", "fondation", "5 min", 1, { puppy: true, tags: ["toilettage", "habituation"] }),
    ];
    allExercises.push(...chiot);

    // ═══════════════════════════════════════
    // 19. CHIEN SENIOR (10 exercices)
    // ═══════════════════════════════════════
    const senior = [
      ex("chien-senior", "marche-douce", "Marche douce adaptée", "Promenade lente et confortable", "débutant", "récupération", "15 min", 1, { senior: true, tags: ["marche", "doux"] }),
      ex("chien-senior", "etirements-senior", "Étirements seniors", "Étirements doux pour articulations", "débutant", "récupération", "5 min", 1, { senior: true, tags: ["étirements", "articulations"] }),
      ex("chien-senior", "puzzle-facile-senior", "Puzzle facile", "Stimulation mentale douce", "débutant", "mental", "10 min", 1, { senior: true, tags: ["puzzle", "doux"] }),
      ex("chien-senior", "massage-senior", "Massage thérapeutique", "Massage pour soulager les douleurs", "débutant", "récupération", "10 min", 1, { senior: true, tags: ["massage", "thérapie"] }),
      ex("chien-senior", "flair-senior", "Jeu de flair doux", "Recherche olfactive sans effort physique", "débutant", "mental", "10 min", 1, { senior: true, tags: ["flair", "enrichissement"] }),
      ex("chien-senior", "assis-lent", "Assis-debout lent", "Renforcement musculaire doux", "débutant", "ciblé", "5 min", 1, { senior: true, tags: ["renforcement", "doux"] }),
      ex("chien-senior", "equilibre-senior", "Équilibre senior", "Exercices d'équilibre adaptés", "débutant", "ciblé", "5 min", 2, { senior: true, equip: ["Coussin mou"], tags: ["équilibre", "doux"] }),
      ex("chien-senior", "tapis-chauffant", "Relaxation tapis chauffant", "Repos sur surface chauffée", "débutant", "récupération", "15 min", 1, { senior: true, equip: ["Tapis chauffant"], tags: ["chaleur", "confort"] }),
      ex("chien-senior", "jeu-calme-senior", "Jeu calme", "Jeu de manipulation sans effort", "débutant", "mental", "10 min", 1, { senior: true, tags: ["jeu", "calme"] }),
      ex("chien-senior", "hydro-senior", "Hydro senior", "Marche en eau pour les articulations", "intermédiaire", "récupération", "10 min", 2, { senior: true, tags: ["eau", "rééducation"] }),
    ];
    allExercises.push(...senior);

    // ═══════════════════════════════════════
    // 20. TRAVAIL DE TROUPEAU (PRO) (20 exercices)
    // ═══════════════════════════════════════
    const troupeau = [
      ex("troupeau", "intro-troupeau", "Introduction au troupeau", "Première exposition aux moutons", "débutant", "fondation", "15 min", 2, { pro: true, breeds: ["Border Collie", "Berger Australien", "Beauceron", "Berger des Pyrénées"], tags: ["troupeau", "introduction"] }),
      ex("troupeau", "balance-point", "Balance point", "Trouver le point d'équilibre face au troupeau", "intermédiaire", "ciblé", "15 min", 3, { pro: true, tags: ["équilibre", "position"] }),
      ex("troupeau", "outrun", "Outrun (contournement)", "Contourner le troupeau par la gauche ou droite", "intermédiaire", "ciblé", "15 min", 4, { pro: true, tags: ["outrun", "contournement"] }),
      ex("troupeau", "lift", "Lift (mise en mouvement)", "Faire démarrer le troupeau", "intermédiaire", "ciblé", "10 min", 3, { pro: true, tags: ["lift", "mouvement"] }),
      ex("troupeau", "fetch", "Fetch (ramener)", "Ramener le troupeau vers le berger", "intermédiaire", "ciblé", "15 min", 3, { pro: true, tags: ["fetch", "ramener"] }),
      ex("troupeau", "drive", "Drive (pousser)", "Pousser le troupeau devant soi", "avancé", "ciblé", "15 min", 4, { pro: true, tags: ["drive", "pousser"] }),
      ex("troupeau", "shed", "Shed (séparer)", "Séparer un ou plusieurs animaux du groupe", "avancé", "ciblé", "15 min", 5, { pro: true, tags: ["shed", "séparer"] }),
      ex("troupeau", "pen", "Pen (enclos)", "Enfermer le troupeau dans un enclos", "avancé", "ciblé", "15 min", 5, { pro: true, tags: ["enclos", "précision"] }),
      ex("troupeau", "come-bye", "Come bye (gauche)", "Commander le chien vers la gauche", "intermédiaire", "fondation", "10 min", 3, { pro: true, tags: ["direction", "gauche"] }),
      ex("troupeau", "away-to-me", "Away to me (droite)", "Commander le chien vers la droite", "intermédiaire", "fondation", "10 min", 3, { pro: true, tags: ["direction", "droite"] }),
      ex("troupeau", "stop-troupeau", "Stop sur troupeau", "Arrêter le chien en pleine action", "intermédiaire", "fondation", "8 min", 3, { pro: true, tags: ["stop", "contrôle"] }),
      ex("troupeau", "flanking", "Flanking (mouvement latéral)", "Déplacer le troupeau latéralement", "avancé", "ciblé", "15 min", 4, { pro: true, tags: ["flanking", "latéral"] }),
      ex("troupeau", "gather-large", "Rassemblement large champ", "Rassembler un troupeau dispersé", "avancé", "ciblé", "20 min", 5, { pro: true, tags: ["rassemblement", "distance"] }),
      ex("troupeau", "cross-drive", "Cross drive", "Conduire le troupeau perpendiculairement", "avancé", "ciblé", "15 min", 5, { pro: true, tags: ["cross drive", "précision"] }),
      ex("troupeau", "troupeau-canards", "Travail sur canards", "Conduite de canards (plus sensibles)", "intermédiaire", "ciblé", "15 min", 3, { pro: true, tags: ["canards", "sensibilité"] }),
      ex("troupeau", "troupeau-bovins", "Travail sur bovins", "Conduite de bovins (plus résistants)", "avancé", "ciblé", "20 min", 5, { pro: true, tags: ["bovins", "force"] }),
      ex("troupeau", "look-back", "Look back", "Renvoyer le chien chercher des animaux manquants", "avancé", "ciblé", "15 min", 5, { pro: true, tags: ["look back", "initiative"] }),
      ex("troupeau", "wearing", "Wearing", "Maintenir le troupeau groupé en mouvement", "intermédiaire", "ciblé", "15 min", 4, { pro: true, tags: ["wearing", "contrôle"] }),
      ex("troupeau", "pace-control", "Contrôle du rythme", "Ajuster la vitesse de conduite", "avancé", "ciblé", "15 min", 4, { pro: true, tags: ["rythme", "vitesse"] }),
      ex("troupeau", "trial-parcours", "Parcours de trial", "Parcours complet de compétition", "avancé", "ciblé", "25 min", 5, { pro: true, tags: ["trial", "compétition"] }),
    ];
    allExercises.push(...troupeau);

    // ═══════════════════════════════════════
    // 21. RING ET OBÉISSANCE SPORTIVE (PRO) (20 exercices)
    // ═══════════════════════════════════════
    const ring = [
      ex("ring-sport", "suite-sans-laisse", "Suite sans laisse", "Marche au pied parfaite sans laisse", "avancé", "ciblé", "10 min", 5, { pro: true, breeds: ["Malinois", "Berger Allemand", "Berger Hollandais"], tags: ["suite", "compétition"] }),
      ex("ring-sport", "absence-couchee", "Absence couchée", "Couché-reste 1 minute maître hors vue", "avancé", "ciblé", "5 min", 5, { pro: true, tags: ["absence", "contrôle"] }),
      ex("ring-sport", "rapport-objet-ring", "Rapport d'objet (ring)", "Rapporter l'objet du juge", "avancé", "ciblé", "8 min", 4, { pro: true, tags: ["rapport", "ring"] }),
      ex("ring-sport", "positions-ring", "Positions à distance (ring)", "Assis-couché-debout à 15m+", "avancé", "ciblé", "10 min", 5, { pro: true, tags: ["positions", "distance"] }),
      ex("ring-sport", "sauts-ring", "Sauts de ring", "Haie, palissade, fossé", "avancé", "ciblé", "10 min", 5, { pro: true, equip: ["Haies ring"], tags: ["sauts", "obstacles"] }),
      ex("ring-sport", "refus-appat", "Refus d'appât", "Ignorer la nourriture au sol", "avancé", "ciblé", "5 min", 5, { pro: true, tags: ["appât", "renoncement"] }),
      ex("ring-sport", "envoi-en-avant-ring", "Envoi en avant (ring)", "Courir droit devant sur 30m+", "avancé", "ciblé", "10 min", 5, { pro: true, tags: ["envoi", "direction"] }),
      ex("ring-sport", "sociabilite-ring", "Sociabilité ring", "Rester calme parmi les figurants", "avancé", "ciblé", "10 min", 4, { pro: true, tags: ["sociabilité", "figurants"] }),
      ex("ring-sport", "recherche-objets", "Recherche d'objets", "Trouver et rapporter des objets du maître", "avancé", "ciblé", "10 min", 4, { pro: true, tags: ["recherche", "objets"] }),
      ex("ring-sport", "obeissance-rythme-IPO", "Obéissance IPO/IGP", "Routine d'obéissance IGP complète", "avancé", "ciblé", "15 min", 5, { pro: true, tags: ["IPO", "IGP"] }),
      ex("ring-sport", "marche-arriere-sport", "Marche arrière sportive (10 pas)", "Reculer 10 pas en ligne droite", "avancé", "ciblé", "5 min", 4, { pro: true, tags: ["recul", "précision"] }),
      ex("ring-sport", "suite-changement-allure", "Suite avec changements d'allure", "Pas, trot, course et retour", "avancé", "ciblé", "10 min", 5, { pro: true, tags: ["allure", "suite"] }),
      ex("ring-sport", "stop-ring-sport", "Stop d'arrêt de ring", "S'arrêter immédiatement en course", "avancé", "ciblé", "5 min", 5, { pro: true, tags: ["stop", "urgence"] }),
      ex("ring-sport", "conduite-figurant", "Conduite du figurant", "Escorter un figurant", "avancé", "ciblé", "10 min", 5, { pro: true, tags: ["conduite", "figurant"] }),
      ex("ring-sport", "stabilite-coup-feu", "Stabilité au coup de feu", "Rester stable au bruit de détonation", "avancé", "ciblé", "5 min", 5, { pro: true, tags: ["coup de feu", "stabilité"] }),
      ex("ring-sport", "garde-objet", "Garde d'objet", "Garder un objet et le défendre", "avancé", "ciblé", "10 min", 5, { pro: true, tags: ["garde", "défense"] }),
      ex("ring-sport", "demi-tour-suite", "Demi-tour en suite", "Demi-tour parfait en marche au pied", "avancé", "ciblé", "5 min", 4, { pro: true, tags: ["demi-tour", "précision"] }),
      ex("ring-sport", "assis-en-marche", "Assis en marche", "S'asseoir pendant que le maître continue", "avancé", "ciblé", "5 min", 4, { pro: true, tags: ["assis", "séparation"] }),
      ex("ring-sport", "couche-en-marche", "Couché en marche", "Se coucher pendant que le maître avance", "avancé", "ciblé", "5 min", 5, { pro: true, tags: ["couché", "séparation"] }),
      ex("ring-sport", "debout-en-marche", "Debout en marche", "Rester debout pendant que le maître continue", "avancé", "ciblé", "5 min", 5, { pro: true, tags: ["debout", "immobilité"] }),
    ];
    allExercises.push(...ring);

    // ═══════════════════════════════════════
    // 22. DÉTECTION ET RECHERCHE PRO (20 exercices)
    // ═══════════════════════════════════════
    const detection = [
      ex("detection", "intro-detection", "Introduction à la détection", "Associer une odeur cible à la récompense", "débutant", "fondation", "10 min", 2, { pro: true, breeds: ["Malinois", "Berger Allemand", "Springer Spaniel", "Labrador", "Beagle"], tags: ["détection", "odeur"] }),
      ex("detection", "detection-boites", "Détection en boîtes alignées", "Trouver l'odeur dans une rangée de boîtes", "intermédiaire", "ciblé", "10 min", 3, { pro: true, tags: ["boîtes", "alignement"] }),
      ex("detection", "detection-piece", "Détection dans une pièce", "Scanner une pièce complète", "intermédiaire", "ciblé", "15 min", 3, { pro: true, tags: ["pièce", "balayage"] }),
      ex("detection", "detection-vehicule", "Détection sur véhicule", "Inspecter un véhicule", "avancé", "ciblé", "10 min", 4, { pro: true, tags: ["véhicule", "inspection"] }),
      ex("detection", "detection-bagage", "Détection bagages", "Inspecter une rangée de bagages", "avancé", "ciblé", "15 min", 4, { pro: true, tags: ["bagages", "aéroport"] }),
      ex("detection", "detection-personne", "Détection sur personne", "Scanner une personne debout", "avancé", "ciblé", "10 min", 4, { pro: true, tags: ["personne", "contrôle"] }),
      ex("detection", "detection-explosifs-intro", "Détection d'explosifs (intro)", "Bases de la détection pyrotechnique", "avancé", "ciblé", "15 min", 5, { pro: true, tags: ["explosifs", "sécurité"] }),
      ex("detection", "detection-stupefiants", "Détection de stupéfiants", "Identifier les substances illicites", "avancé", "ciblé", "15 min", 5, { pro: true, tags: ["stupéfiants", "police"] }),
      ex("detection", "indication-marquage-pro", "Indication et marquage pro", "Signaler la trouvaille selon le protocole", "intermédiaire", "ciblé", "10 min", 3, { pro: true, tags: ["indication", "protocole"] }),
      ex("detection", "detection-en-hauteur", "Détection en hauteur", "Trouver l'odeur en position élevée", "avancé", "ciblé", "10 min", 4, { pro: true, tags: ["hauteur", "recherche"] }),
      ex("detection", "detection-enterree", "Détection enterrée", "Trouver une source d'odeur sous terre", "avancé", "ciblé", "15 min", 5, { pro: true, tags: ["enterré", "profondeur"] }),
      ex("detection", "detection-multi-odeurs", "Multi-odeurs", "Discriminer plusieurs odeurs cibles", "avancé", "ciblé", "15 min", 5, { pro: true, tags: ["multi", "discrimination"] }),
      ex("detection", "detection-parcours", "Parcours de détection complet", "Enchaîner plusieurs zones de recherche", "avancé", "ciblé", "20 min", 5, { pro: true, tags: ["parcours", "endurance"] }),
      ex("detection", "detection-conditions-meteo", "Détection conditions météo", "Travailler sous pluie, vent, chaleur", "avancé", "ciblé", "15 min", 4, { pro: true, tags: ["météo", "adaptation"] }),
      ex("detection", "detection-distractions", "Détection avec distractions", "Ignorer les leurres et fausses pistes", "avancé", "ciblé", "15 min", 5, { pro: true, tags: ["distractions", "focus"] }),
      ex("detection", "recherche-personne-disparue", "Recherche de personne disparue", "Suivre la piste d'un disparu", "avancé", "ciblé", "30 min", 5, { pro: true, tags: ["personne", "disparition"] }),
      ex("detection", "recherche-zone-large", "Recherche en zone large", "Couvrir une large zone systématiquement", "avancé", "ciblé", "30 min", 5, { pro: true, tags: ["zone", "systématique"] }),
      ex("detection", "detection-medicale", "Détection médicale", "Détecter des changements physiologiques", "avancé", "ciblé", "10 min", 5, { pro: true, tags: ["médical", "santé"] }),
      ex("detection", "detection-banque-odeurs", "Banque d'odeurs", "Mémoriser et reconnaître de nouvelles odeurs", "avancé", "ciblé", "10 min", 4, { pro: true, tags: ["mémoire", "odeurs"] }),
      ex("detection", "certification-detection", "Exercice de certification", "Simulation d'examen de certification", "avancé", "ciblé", "30 min", 5, { pro: true, tags: ["certification", "examen"] }),
    ];
    allExercises.push(...detection);

    // ═══════════════════════════════════════
    // 23. PROTECTION ET MORDANT (PRO) (20 exercices)
    // ═══════════════════════════════════════
    const protection = [
      ex("protection-mordant", "motivation-proie", "Motivation de proie", "Développer l'instinct de proie contrôlé", "débutant", "fondation", "10 min", 2, { pro: true, breeds: ["Malinois", "Berger Allemand", "Berger Hollandais", "Rottweiler"], tags: ["proie", "instinct"] }),
      ex("protection-mordant", "boudin-intro", "Introduction au boudin", "Première prise sur boudin de jute", "débutant", "fondation", "5 min", 2, { pro: true, equip: ["Boudin jute"], tags: ["boudin", "prise"] }),
      ex("protection-mordant", "manchette-intro", "Introduction manchette", "Prise sur manchette tenue", "intermédiaire", "ciblé", "10 min", 3, { pro: true, equip: ["Manchette"], tags: ["manchette", "prise"] }),
      ex("protection-mordant", "lacher-commande", "Lâcher sur commande", "Relâcher la prise immédiatement", "intermédiaire", "ciblé", "5 min", 4, { pro: true, tags: ["lâcher", "contrôle"] }),
      ex("protection-mordant", "morsure-complete", "Morsure complète (pleine gueule)", "Obtenir une prise franche et calme", "avancé", "ciblé", "10 min", 4, { pro: true, tags: ["morsure", "qualité"] }),
      ex("protection-mordant", "garde-au-ferme", "Garde au ferme", "Aboyer face au figurant immobile", "intermédiaire", "ciblé", "8 min", 3, { pro: true, tags: ["garde", "aboiement"] }),
      ex("protection-mordant", "attaque-lancee", "Attaque lancée", "Course et prise sur figurant en fuite", "avancé", "ciblé", "10 min", 5, { pro: true, equip: ["Costume de protection"], tags: ["attaque", "course"] }),
      ex("protection-mordant", "attaque-arretee", "Attaque arrêtée", "Stopper l'attaque sur commande", "avancé", "ciblé", "10 min", 5, { pro: true, tags: ["stop", "contrôle"] }),
      ex("protection-mordant", "defense-maitre", "Défense du maître", "Protéger le maître en situation de menace", "avancé", "ciblé", "10 min", 5, { pro: true, tags: ["défense", "protection"] }),
      ex("protection-mordant", "recherche-figurant", "Recherche du figurant", "Trouver le figurant caché", "intermédiaire", "ciblé", "15 min", 4, { pro: true, tags: ["recherche", "figurant"] }),
      ex("protection-mordant", "transport-figurant", "Transport du figurant", "Escorter le figurant calmement", "avancé", "ciblé", "10 min", 4, { pro: true, tags: ["transport", "escorte"] }),
      ex("protection-mordant", "face-menace", "Face à la menace", "Réagir appropriément à une menace", "avancé", "ciblé", "10 min", 5, { pro: true, tags: ["menace", "discernement"] }),
      ex("protection-mordant", "controle-apres-prise", "Contrôle après la prise", "Rester calme après le lâcher", "avancé", "ciblé", "5 min", 5, { pro: true, tags: ["contrôle", "calme"] }),
      ex("protection-mordant", "courage-test", "Test de courage", "Résister face à un figurant menaçant", "avancé", "ciblé", "5 min", 5, { pro: true, tags: ["courage", "résistance"] }),
      ex("protection-mordant", "discrimination-menace", "Discrimination ami/ennemi", "Distinguer menace réelle et personne neutre", "avancé", "ciblé", "10 min", 5, { pro: true, tags: ["discrimination", "discernement"] }),
      ex("protection-mordant", "canalisation-drive", "Canalisation du drive", "Contrôler l'intensité de la prise", "avancé", "ciblé", "10 min", 5, { pro: true, tags: ["intensité", "régulation"] }),
      ex("protection-mordant", "mordant-costume", "Mordant sur costume complet", "Travail en costume intégral", "avancé", "ciblé", "15 min", 5, { pro: true, equip: ["Costume complet"], tags: ["costume", "réalisme"] }),
      ex("protection-mordant", "reveil-defense", "Réveil et défense", "Réaction défensive depuis le repos", "avancé", "ciblé", "5 min", 5, { pro: true, tags: ["réveil", "alerte"] }),
      ex("protection-mordant", "obeissance-sous-pression", "Obéissance sous pression", "Obéir malgré la présence du figurant", "avancé", "ciblé", "10 min", 5, { pro: true, tags: ["obéissance", "pression"] }),
      ex("protection-mordant", "scenario-complet", "Scénario complet de protection", "Enchaînement réaliste complet", "avancé", "ciblé", "20 min", 5, { pro: true, tags: ["scénario", "complet"] }),
    ];
    allExercises.push(...protection);

    // ═══════════════════════════════════════
    // 24. SAUVETAGE ET DÉCOMBRES (PRO) (15 exercices)
    // ═══════════════════════════════════════
    const sauvetage = [
      ex("sauvetage", "recherche-surface", "Recherche en surface", "Trouver une victime en surface", "intermédiaire", "ciblé", "15 min", 3, { pro: true, breeds: ["Malinois", "Berger Allemand", "Labrador", "Golden Retriever", "Border Collie"], tags: ["surface", "victime"] }),
      ex("sauvetage", "recherche-decombres", "Recherche en décombres", "Trouver une victime sous les décombres", "avancé", "ciblé", "20 min", 5, { pro: true, tags: ["décombres", "catastrophe"] }),
      ex("sauvetage", "indication-aboiement", "Indication par aboiement", "Aboyer en continu sur la victime", "intermédiaire", "ciblé", "10 min", 3, { pro: true, tags: ["aboiement", "indication"] }),
      ex("sauvetage", "franchissement-obstacles", "Franchissement d'obstacles", "Naviguer dans des décombres instables", "avancé", "ciblé", "15 min", 4, { pro: true, tags: ["obstacles", "instable"] }),
      ex("sauvetage", "echelle-verticale", "Montée d'échelle", "Grimper une échelle verticale", "avancé", "ciblé", "10 min", 5, { pro: true, equip: ["Échelle"], tags: ["échelle", "hauteur"] }),
      ex("sauvetage", "traversee-poutre-haute", "Traversée de poutre en hauteur", "Marcher sur poutre à 1m+", "avancé", "ciblé", "8 min", 5, { pro: true, tags: ["poutre", "altitude"] }),
      ex("sauvetage", "recherche-avalanche", "Recherche en avalanche", "Trouver une victime sous la neige", "avancé", "ciblé", "20 min", 5, { pro: true, tags: ["avalanche", "neige"] }),
      ex("sauvetage", "helicoptere-habituation", "Habituation hélicoptère", "Rester calme près d'un hélicoptère", "avancé", "ciblé", "10 min", 5, { pro: true, tags: ["hélicoptère", "bruit"] }),
      ex("sauvetage", "recherche-foret-nuit", "Recherche en forêt de nuit", "Recherche nocturne en milieu boisé", "avancé", "ciblé", "30 min", 5, { pro: true, equip: ["Lampe frontale", "GPS"], tags: ["nuit", "forêt"] }),
      ex("sauvetage", "rappel-tres-longue-distance", "Rappel très longue distance", "Rappel à 200m+ en terrain accidenté", "avancé", "ciblé", "10 min", 5, { pro: true, tags: ["rappel", "distance extrême"] }),
      ex("sauvetage", "travail-en-binome", "Travail en binôme", "Coordination avec un autre chien de sauvetage", "avancé", "ciblé", "20 min", 5, { pro: true, tags: ["binôme", "coordination"] }),
      ex("sauvetage", "recherche-eau-sauvetage", "Recherche aquatique de sauvetage", "Trouver une victime dans l'eau", "avancé", "ciblé", "20 min", 5, { pro: true, equip: ["Gilet sauvetage"], tags: ["eau", "sauvetage"] }),
      ex("sauvetage", "desescalade-surface", "Descente en rappel assistée", "Descendre une pente avec le chien", "avancé", "ciblé", "10 min", 5, { pro: true, tags: ["descente", "technique"] }),
      ex("sauvetage", "endurance-recherche", "Endurance de recherche (2h+)", "Maintenir l'effort de recherche longtemps", "avancé", "ciblé", "120 min", 5, { pro: true, tags: ["endurance", "longue durée"] }),
      ex("sauvetage", "simulation-catastrophe", "Simulation de catastrophe", "Exercice complet en conditions réelles", "avancé", "ciblé", "60 min", 5, { pro: true, tags: ["simulation", "réalisme"] }),
    ];
    allExercises.push(...sauvetage);

    // ═══════════════════════════════════════
    // 25. PATROUILLE ET SÉCURITÉ (PRO) (20 exercices)
    // ═══════════════════════════════════════
    const patrouille = [
      ex("patrouille-securite", "patrouille-base", "Patrouille de base", "Marche de surveillance avec le chien", "intermédiaire", "fondation", "20 min", 3, { pro: true, breeds: ["Malinois", "Berger Allemand", "Berger Hollandais", "Rottweiler", "Dobermann"], tags: ["patrouille", "surveillance"] }),
      ex("patrouille-securite", "fouille-batiment", "Fouille de bâtiment", "Inspecter un bâtiment pièce par pièce", "avancé", "ciblé", "20 min", 5, { pro: true, tags: ["fouille", "bâtiment"] }),
      ex("patrouille-securite", "interpellation", "Interpellation", "Intercepter et maintenir un suspect", "avancé", "ciblé", "10 min", 5, { pro: true, tags: ["interpellation", "police"] }),
      ex("patrouille-securite", "flair-patrouille", "Pistage de suspect", "Suivre la piste d'un individu en fuite", "avancé", "ciblé", "20 min", 5, { pro: true, tags: ["pistage", "poursuite"] }),
      ex("patrouille-securite", "controle-foule", "Contrôle de foule", "Rester calme et dissuasif en foule", "avancé", "ciblé", "15 min", 5, { pro: true, tags: ["foule", "maintien ordre"] }),
      ex("patrouille-securite", "obeis-sous-stress", "Obéissance sous stress opérationnel", "Exécuter des ordres en situation tendue", "avancé", "ciblé", "10 min", 5, { pro: true, tags: ["stress", "obéissance"] }),
      ex("patrouille-securite", "embarquer-vehicule", "Embarquer/débarquer d'un véhicule", "Monter et descendre rapidement d'une voiture", "intermédiaire", "fondation", "5 min", 3, { pro: true, tags: ["véhicule", "rapidité"] }),
      ex("patrouille-securite", "travail-nocturne", "Travail nocturne", "Opérations de nuit avec le chien", "avancé", "ciblé", "30 min", 5, { pro: true, equip: ["Lampe", "Gilet fluorescent"], tags: ["nuit", "opérationnel"] }),
      ex("patrouille-securite", "garde-statique", "Garde statique", "Garder un point sans bouger", "intermédiaire", "ciblé", "15 min", 4, { pro: true, tags: ["garde", "statique"] }),
      ex("patrouille-securite", "detection-intrusion", "Détection d'intrusion", "Alerter en cas de présence suspecte", "avancé", "ciblé", "variable", 4, { pro: true, tags: ["intrusion", "alerte"] }),
      ex("patrouille-securite", "resistance-distractions-pro", "Résistance aux distractions (pro)", "Rester concentré malgré le chaos", "avancé", "ciblé", "15 min", 5, { pro: true, tags: ["distractions", "focus"] }),
      ex("patrouille-securite", "intervention-interieur", "Intervention en intérieur", "Agir dans des espaces confinés", "avancé", "ciblé", "15 min", 5, { pro: true, tags: ["intérieur", "confiné"] }),
      ex("patrouille-securite", "signal-silencieux-pro", "Signaux silencieux opérationnels", "Commander par gestes uniquement", "avancé", "ciblé", "10 min", 5, { pro: true, tags: ["silencieux", "gestuel"] }),
      ex("patrouille-securite", "endurance-patrouille", "Endurance de patrouille", "Maintenir l'effort sur une longue patrouille", "avancé", "ciblé", "60 min", 5, { pro: true, tags: ["endurance", "patrouille"] }),
      ex("patrouille-securite", "rappel-sous-pression", "Rappel sous pression opérationnelle", "Revenir malgré la stimulation intense", "avancé", "ciblé", "5 min", 5, { pro: true, tags: ["rappel", "pression"] }),
      ex("patrouille-securite", "discrimination-cible", "Discrimination de cible", "Identifier la bonne personne parmi un groupe", "avancé", "ciblé", "10 min", 5, { pro: true, tags: ["cible", "identification"] }),
      ex("patrouille-securite", "recherche-vehicule-suspect", "Recherche de véhicule suspect", "Inspecter un parking ou véhicule", "avancé", "ciblé", "15 min", 4, { pro: true, tags: ["véhicule", "recherche"] }),
      ex("patrouille-securite", "escorte-personne", "Escorte de personne", "Accompagner et protéger un VIP", "avancé", "ciblé", "15 min", 4, { pro: true, tags: ["escorte", "protection"] }),
      ex("patrouille-securite", "neutralisation-menace", "Neutralisation de menace", "Réponse proportionnée à une agression", "avancé", "ciblé", "10 min", 5, { pro: true, tags: ["neutralisation", "force"] }),
      ex("patrouille-securite", "certification-unite-cynophile", "Certification unité cynophile", "Examen complet de certification", "avancé", "ciblé", "60 min", 5, { pro: true, tags: ["certification", "examen"] }),
    ];
    allExercises.push(...patrouille);

    // ═══════════════════════════════════════
    // INSERT ALL EXERCISES IN BATCHES
    // ═══════════════════════════════════════
    const batchSize = 50;
    let inserted = 0;
    for (let i = 0; i < allExercises.length; i += batchSize) {
      const batch = allExercises.slice(i, i + batchSize);
      const { error } = await supabase.from("exercises").insert(batch);
      if (error) {
        console.error(`Batch ${i} error:`, error);
        return new Response(JSON.stringify({ error: error.message, batch: i }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      inserted += batch.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        categories: categories.length,
        exercises: inserted,
        message: `${inserted} exercices insérés dans ${categories.length} catégories`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
