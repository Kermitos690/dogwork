import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, ChevronDown, ChevronUp, AlertTriangle, BookOpen } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";

interface Section {
  icon: string;
  title: string;
  content: string;
  type: "info" | "warning" | "danger";
}

const sections: Section[] = [
  {
    icon: "🎯",
    title: "Objectif réel du travail",
    type: "info",
    content: `Ce programme ne vise pas à rendre votre chien sociable avec tous les chiens ou toutes les personnes.

L'objectif est d'atteindre :
• La neutralité : voir un déclencheur sans basculer en réaction.
• Le contrôle : pouvoir rediriger votre chien à tout moment.
• La sécurité : prévenir les incidents, pas les provoquer.
• La baisse de tension : votre chien apprend à rester calme.
• Le focus sur vous : vous devenez plus intéressant que le déclencheur.

Un chien neutre est un chien qui peut croiser un autre chien ou un humain sans réagir. C'est suffisant et c'est sécuritaire.

La sociabilisation forcée est dangereuse pour un chien réactif.`,
  },
  {
    icon: "📏",
    title: "Travail sous seuil",
    type: "warning",
    content: `Le seuil de réactivité est la limite à partir de laquelle votre chien ne peut plus réfléchir et bascule en réaction automatique.

Définition : Travailler sous seuil signifie rester à une distance et une intensité où votre chien peut encore vous écouter, répondre aux signaux et faire des choix.

Pourquoi c'est indispensable :
• Au-dessus du seuil, le chien ne peut pas apprendre. Il est en mode survie (fight, flight, freeze).
• Chaque expérience au-dessus du seuil renforce la réactivité.
• Le progrès vient de centaines d'expériences calmes, pas de quelques confrontations.

En pratique :
• Si votre chien fixe, gronde ou tire vers le déclencheur → vous êtes trop près.
• Augmentez immédiatement la distance.
• Récompensez le calme, pas la confrontation.`,
  },
  {
    icon: "🚦",
    title: "Lecture du seuil : Vert / Orange / Rouge",
    type: "warning",
    content: `🟢 ZONE VERTE — Le chien peut travailler
Le chien est calme, attentif, capable de répondre aux consignes. Il peut regarder le déclencheur et revenir vers vous. Vous pouvez travailler normalement à cette distance.

🟠 ZONE ORANGE — Attention
Le chien commence à se fixer, la tension monte dans le corps, il répond moins bien ou plus lentement. Sa queue est rigide, ses oreilles pointées. Il peut encore revenir mais avec effort.

Action : Augmentez la distance de 3 à 5 mètres. Simplifiez l'exercice. Récompensez le moindre retour d'attention sur vous.

🔴 ZONE ROUGE — Sortir immédiatement
Le chien est en surcharge : aboiements, tirage, grognements, gémissements, impossibilité de répondre à quoi que ce soit. Il est en mode réactif.

Action : Demi-tour immédiat. Éloignez-vous calmement. Ne punissez pas, ne criez pas. Éloignez-vous et laissez redescendre.`,
  },
  {
    icon: "📐",
    title: "Gestion de la distance",
    type: "info",
    content: `La distance est votre meilleur outil de travail.

Principes fondamentaux :
• Plus vous êtes loin du déclencheur, plus votre chien peut réfléchir.
• Commencez toujours à grande distance (zone verte confirmée).
• Réduisez par micro-étapes : 1 à 3 mètres à la fois, sur plusieurs séances.
• Si la tension monte, revenez en arrière immédiatement.

Erreurs fréquentes :
• Ne pas coller le déclencheur pour "tester".
• Ne pas chercher la confrontation pour "voir comment il réagit".
• Ne pas forcer la proximité "parce qu'il va bien depuis 5 minutes".

La progression se mesure en semaines, pas en minutes.`,
  },
  {
    icon: "⛔",
    title: "Ce qu'il ne faut PAS faire",
    type: "danger",
    content: `Erreurs courantes qui aggravent les problèmes :

❌ Rencontres improvisées
Ne laissez jamais un inconnu approcher son chien du vôtre "pour voir" ou "pour qu'ils se reniflent". C'est la première cause d'incidents.

❌ Punition confuse
Crier, tirer sur la laisse, punir physiquement après un comportement réactif. Le chien ne comprend pas le lien et associe le déclencheur à une expérience encore plus négative.

❌ Répétition des ordres sans suite
Dire "Assis, assis, ASSIS !" sans obtenir de réponse apprend au chien que les mots n'ont pas de valeur. Un signal = une demande.

❌ Travail en surcharge
Travailler quand le chien est déjà stressé, fatigué, ou dans un environnement trop stimulant. Choisissez vos moments.

❌ Mise en échec volontaire
Placer le chien face à un déclencheur pour "voir s'il a progressé" est contre-productif. Le progrès se montre naturellement.`,
  },
  {
    icon: "🔒",
    title: "Rappel de sécurité",
    type: "danger",
    content: `Règles non négociables :

🐕 Muselière : Si votre chien a un historique de morsure ou si la situation l'exige, la muselière panier (type Baskerville) est obligatoire en extérieur. Habituez-le progressivement (voir exercice Muselière positive).

🐕 Laisse adaptée : Utilisez une laisse fixe de 2 à 3 mètres. Jamais de laisse enrouleur. Un harnais est préférable à un collier pour les chiens qui tirent.

🐕 Environnement gérable : Choisissez des lieux que vous connaissez, avec des possibilités de s'éloigner rapidement. Évitez les culs-de-sac.

🐕 Priorité à la prévention : Mieux vaut éviter une situation que la gérer. Si vous voyez un chien au loin et que vous n'êtes pas prêt, changez de direction.

🐕 Plan de sortie : Ayez toujours un plan B. Identifiez les sorties, les espaces de repli. Le demi-tour d'urgence doit être un réflexe.

🐕 Votre propre état : Si vous êtes stressé, votre chien le sent. Respirez. Si ce n'est pas le bon jour, ce n'est pas grave. Rentrez et recommencez demain.`,
  },
  {
    icon: "🔄",
    title: "Neutralité vs Socialisation",
    type: "info",
    content: `Socialiser = exposer à des expériences positives pendant la période sensible (3 à 14 semaines principalement).

Pour un chien adulte avec un historique de réactivité, la socialisation forcée est dangereuse et contre-productive.

L'objectif n'est pas que votre chien "aime" les autres chiens ou les humains.

L'objectif est la neutralité :
• Voir un autre chien → ne pas réagir.
• Croiser un humain → rester calme.
• Être dans un environnement stimulant → pouvoir fonctionner.

C'est suffisant. C'est sécuritaire. C'est réaliste.

Ne laissez personne vous dire que votre chien "doit" aller vers les autres. Un chien qui ignore calmement est un chien bien éduqué.`,
  },
  {
    icon: "⏹️",
    title: "Quand arrêter un exercice",
    type: "danger",
    content: `Arrêtez immédiatement si :

• Le chien est en zone rouge (réaction forte, incontrôlable).
• Vous sentez que la situation est ingérable.
• Un chien inconnu approche trop vite et vous ne pouvez pas l'éviter.
• Votre chien ne répond plus à aucune consigne depuis plus de 30 secondes.
• Vous êtes stressé(e) vous-même — il le sent et ça aggrave.
• Le chien montre des signes de fatigue ou de douleur.

Comment arrêter :
1. Demi-tour calme (pas de panique).
2. Éloignez-vous à un rythme normal.
3. Trouvez un endroit calme.
4. Laissez le chien redescendre (peut prendre 5 à 15 minutes).
5. Terminez sur une note positive : un simple assis récompensé suffit.

Arrêter n'est jamais un échec. C'est de la bonne gestion.`,
  },
];

const typeStyles = {
  info: "border-primary/20",
  warning: "border-warning/20",
  danger: "border-destructive/20",
};

function AccordionSection({ section, index }: { section: Section; index: number }) {
  const [open, setOpen] = useState(index === 0);

  return (
    <div className={`rounded-xl border ${typeStyles[section.type]} bg-card overflow-hidden stagger-item`} style={{ animationDelay: `${index * 60}ms` }}>
      <button onClick={() => setOpen(!open)} className="w-full p-4 flex items-center justify-between text-left">
        <div className="flex items-center gap-2">
          <span className="text-lg">{section.icon}</span>
          <h2 className="text-sm font-semibold text-foreground">{section.title}</h2>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 animate-fade-in">
          <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{section.content}</p>
        </div>
      )}
    </div>
  );
}

export default function Safety() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-4 pt-4 pb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Sécurité et méthode</h1>
            <p className="text-xs text-muted-foreground">Les bases indispensables</p>
          </div>
        </div>

        {/* Quick alert */}
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Lisez attentivement cette section avant de commencer le programme. Ces règles protègent votre chien, vous-même et les autres.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {sections.map((section, i) => (
            <AccordionSection key={i} section={section} index={i} />
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
