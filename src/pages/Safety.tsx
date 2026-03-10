import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { Layout } from "@/components/Layout";

const sections = [
  {
    title: "🎯 Objectif réel du programme",
    content: "Ce programme ne vise pas à rendre votre chienne sociable avec tous les chiens. L'objectif est d'atteindre la neutralité, le contrôle, la sécurité, le focus sur le maître et la baisse de tension face aux déclencheurs. Une chienne neutre est une chienne qui peut voir un autre chien sans basculer en réaction.",
  },
  {
    title: "📏 Travail sous seuil",
    content: "Travaillez toujours en dessous du seuil de réactivité de votre chienne. Si elle fixe, grogne, aboie ou tire vers un autre chien, vous êtes au-dessus du seuil. Augmentez immédiatement la distance. Le but est de créer des expériences positives, pas de provoquer des réactions.",
  },
  {
    title: "🚦 Lecture du seuil : Vert / Orange / Rouge",
    content: `ZONE VERTE : La chienne est calme, attentive, capable de répondre aux consignes. Vous pouvez travailler normalement.

ZONE ORANGE : La chienne commence à se fixer, la tension monte, elle répond moins bien. Augmentez la distance, simplifiez l'exercice, récompensez le moindre retour sur vous.

ZONE ROUGE : La chienne est en surcharge — aboiements, tirage, grognements, impossibilité de répondre. Sortez de la situation immédiatement avec un demi-tour. Ne punissez pas, éloignez-vous.`,
  },
  {
    title: "📐 Gestion de la distance",
    content: "La distance est votre meilleur outil. Plus vous êtes loin du déclencheur, plus votre chienne peut réfléchir. Commencez toujours à grande distance et réduisez par micro-étapes (1 à 3 mètres à la fois). Si la tension monte, revenez en arrière. Ne cherchez jamais l'échec.",
  },
  {
    title: "🔒 Règles de sécurité",
    content: `• Muselière obligatoire en public — toujours.
• Aucune rencontre improvisée avec des chiens inconnus.
• Aucun contact nez-à-nez avec un autre chien.
• Ne laissez personne approcher son chien du vôtre « pour voir ».
• Gardez toujours le contrôle de la laisse.
• Ayez toujours un plan de sortie (demi-tour).
• Privilégiez les horaires et lieux calmes.`,
  },
  {
    title: "🔄 Neutralité vs Socialisation",
    content: "Socialiser signifie exposer à des expériences positives. Pour une chienne avec un historique de morsure, la socialisation forcée est dangereuse. L'objectif est la neutralité : voir un autre chien sans réagir. C'est suffisant et c'est sécuritaire.",
  },
  {
    title: "🐕 Muselière et prévention",
    content: "La muselière n'est pas une punition, c'est une protection pour votre chienne, pour les autres chiens et pour vous. Elle doit être portée systématiquement en public. Assurez-vous qu'elle est bien ajustée (elle doit pouvoir haleter et boire). Associez-la à du positif.",
  },
  {
    title: "⛔ Quand arrêter un exercice",
    content: `Arrêtez immédiatement si :
• La chienne est en zone rouge
• Vous sentez que la situation est ingérable
• Un chien inconnu approche trop vite
• Votre chienne ne répond plus à aucune consigne
• Vous êtes stressé(e) vous-même — elle le sent

Terminez toujours sur une note positive, même si c'est un simple assis récompensé.`,
  },
  {
    title: "❌ Ce qu'il ne faut PAS faire",
    content: `• Ne pas forcer la rencontre avec d'autres chiens
• Ne pas punir la réactivité (elle vient de la peur/frustration)
• Ne pas laisser la laisse tendue en permanence
• Ne pas répéter un ordre 10 fois — soit elle l'entend, soit elle ne peut pas répondre
• Ne pas travailler quand vous êtes épuisé(e) ou frustré(e)
• Ne pas sauter d'étape pour aller plus vite
• Ne pas comparer avec d'autres chiens`,
  },
];

const functionsList = [
  { name: "Focus / Regarde", desc: "Reconnecter le chien au maître avant montée en tension." },
  { name: "Stop", desc: "Interrompre un mouvement, une fixation ou une montée d'excitation." },
  { name: "Non / Renoncement", desc: "Abandonner une action non autorisée." },
  { name: "Assis / Couché / Reste", desc: "Contrôle postural, stabilité et auto-contrôle." },
  { name: "Marche en laisse", desc: "Suivre la trajectoire du maître sans tirer ni piloter la balade." },
  { name: "Auto-contrôle", desc: "Attendre avant d'obtenir une ressource." },
  { name: "Tapis / Calme", desc: "Redescente émotionnelle et retour au repos." },
  { name: "Désensibilisation aux chiens", desc: "Voir un chien sans basculer en tension ou en explosion." },
  { name: "Accueil sans saut", desc: "Garder 4 pattes au sol lors des interactions humaines." },
  { name: "Demi-tour d'urgence", desc: "Sortir proprement et vite d'une situation à risque." },
];

export default function Safety() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="animate-fade-in space-y-5 pt-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>

        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Sécurité et méthode</h1>
        </div>

        {sections.map((s, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-base font-semibold mb-2">{s.title}</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{s.content}</p>
          </div>
        ))}

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-base font-semibold mb-3">📋 Fonctions d'obéissance</h2>
          <div className="space-y-3">
            {functionsList.map((f, i) => (
              <div key={i} className="flex gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Maintenance plan */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <h2 className="text-base font-semibold mb-2">📅 Plan de maintien (après les 28 jours)</h2>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• 10 min d'obéissance par jour</li>
            <li>• 3 à 4 sorties éducatives par semaine</li>
            <li>• 2 séances spécifiques réactivité congénères par semaine</li>
            <li>• Maintien du tapis, focus, stop, demi-tour et marche</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
