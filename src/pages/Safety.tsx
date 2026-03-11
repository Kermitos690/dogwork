import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";

const sections = [
  {
    title: "🎯 Objectif réel du programme",
    content: "Ce programme ne vise pas à rendre votre chien sociable avec tous les chiens. L'objectif est d'atteindre la neutralité, le contrôle, la sécurité, le focus sur le maître et la baisse de tension face aux déclencheurs. Un chien neutre est un chien qui peut voir un autre chien sans basculer en réaction.",
  },
  {
    title: "📏 Travail sous seuil",
    content: "Travaillez toujours en dessous du seuil de réactivité de votre chien. Si il fixe, grogne, aboie ou tire vers un autre chien, vous êtes au-dessus du seuil. Augmentez immédiatement la distance. Le but est de créer des expériences positives, pas de provoquer des réactions.",
  },
  {
    title: "🚦 Lecture du seuil : Vert / Orange / Rouge",
    content: `ZONE VERTE : Le chien est calme, attentif, capable de répondre aux consignes. Vous pouvez travailler normalement.

ZONE ORANGE : Le chien commence à se fixer, la tension monte, il répond moins bien. Augmentez la distance, simplifiez l'exercice, récompensez le moindre retour sur vous.

ZONE ROUGE : Le chien est en surcharge — aboiements, tirage, grognements, impossibilité de répondre. Sortez de la situation immédiatement avec un demi-tour. Ne punissez pas, éloignez-vous.`,
  },
  {
    title: "📐 Gestion de la distance",
    content: "La distance est votre meilleur outil. Plus vous êtes loin du déclencheur, plus votre chien peut réfléchir. Commencez toujours à grande distance et réduisez par micro-étapes (1 à 3 mètres à la fois). Si la tension monte, revenez en arrière. Ne cherchez jamais l'échec.",
  },
  {
    title: "🔒 Règles de sécurité",
    content: `• Muselière obligatoire en public si nécessaire.
• Aucune rencontre improvisée avec des chiens inconnus.
• Aucun contact nez-à-nez avec un autre chien.
• Ne laissez personne approcher son chien du vôtre « pour voir ».
• Gardez toujours le contrôle de la laisse.
• Ayez toujours un plan de sortie (demi-tour).
• Privilégiez les horaires et lieux calmes.`,
  },
  {
    title: "🔄 Neutralité vs Socialisation",
    content: "Socialiser signifie exposer à des expériences positives. Pour un chien avec un historique de réactivité, la socialisation forcée est dangereuse. L'objectif est la neutralité : voir un autre chien sans réagir. C'est suffisant et c'est sécuritaire.",
  },
  {
    title: "⛔ Quand arrêter un exercice",
    content: `Arrêtez immédiatement si :
• Le chien est en zone rouge
• Vous sentez que la situation est ingérable
• Un chien inconnu approche trop vite
• Votre chien ne répond plus à aucune consigne
• Vous êtes stressé(e) vous-même — il le sent

Terminez toujours sur une note positive, même si c'est un simple assis récompensé.`,
  },
];

export default function Safety() {
  const navigate = useNavigate();

  return (
    <AppLayout>
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
      </div>
    </AppLayout>
  );
}
