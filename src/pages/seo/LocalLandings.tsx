import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SEO } from "@/components/SEO";
import { ArrowRight, MapPin, Sparkles, CheckCircle2 } from "lucide-react";
import { ReactNode } from "react";

/**
 * Lightweight, indexable SEO landing pages.
 * Pure presentation, anonymous-accessible. No data fetching, no guards.
 * Each page targets a specific Suisse romande long-tail query.
 */

interface LandingConfig {
  path: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  bullets: string[];
  primaryCta: { label: string; to: string };
  secondaryCta?: { label: string; to: string };
  longCopy: ReactNode;
}

function SeoLandingLayout({ cfg }: { cfg: LandingConfig }) {
  return (
    <div className="min-h-screen bg-background">
      <SEO title={cfg.title} description={cfg.description} path={cfg.path} />
      <main className="container max-w-3xl py-12 px-4 space-y-10">
        <header className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> Suisse romande
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{cfg.h1}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{cfg.intro}</p>
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <Button asChild size="lg">
              <Link to={cfg.primaryCta.to}>
                {cfg.primaryCta.label} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            {cfg.secondaryCta && (
              <Button asChild variant="outline" size="lg">
                <Link to={cfg.secondaryCta.to}>{cfg.secondaryCta.label}</Link>
              </Button>
            )}
          </div>
        </header>

        <Card>
          <CardContent className="p-6 space-y-3">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Ce que DogWork apporte
            </h2>
            <ul className="space-y-2 text-sm">
              {cfg.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <section className="prose prose-sm dark:prose-invert max-w-none space-y-4">
          {cfg.longCopy}
        </section>

        <footer className="text-center pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground mb-3">
            Prêt à commencer ? L'inscription est gratuite.
          </p>
          <Button asChild size="lg">
            <Link to={cfg.primaryCta.to}>
              {cfg.primaryCta.label} <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </footer>
      </main>
    </div>
  );
}

export function EducationCanineLausanne() {
  return (
    <SeoLandingLayout
      cfg={{
        path: "/education-canine-lausanne",
        title: "Éducation canine à Lausanne — Coachs & app DogWork",
        description:
          "Éducation canine à Lausanne : trouvez un éducateur vérifié, suivez les progrès de votre chien et accédez à 480+ exercices personnalisés. Application DogWork pensée pour la Suisse romande.",
        h1: "Éducation canine à Lausanne",
        intro:
          "Trouvez un éducateur canin certifié à Lausanne et accompagnez votre chien avec une méthode structurée, mesurable et bienveillante.",
        bullets: [
          "Éducateurs vérifiés actifs à Lausanne et environs",
          "Plans d'éducation personnalisés selon l'âge, la race et les objectifs",
          "Suivi quotidien des séances, du comportement et des progrès",
          "Bibliothèque de 480+ exercices encadrés",
        ],
        primaryCta: { label: "Voir les éducateurs à Lausanne", to: "/annuaire/coachs" },
        secondaryCta: { label: "Découvrir l'app", to: "/landing" },
        longCopy: (
          <>
            <h2>Pourquoi choisir un éducateur via DogWork à Lausanne ?</h2>
            <p>
              Lausanne compte de nombreux éducateurs canins, avec des approches très différentes. DogWork
              centralise les profils vérifiés des coachs actifs dans le canton de Vaud, avec leur spécialité
              (chiot, réactivité, obéissance, agility, comportement) et leur zone d'intervention.
            </p>
            <p>
              L'application DogWork complète l'accompagnement avec un plan d'éducation personnalisé, un journal
              de séances et un suivi comportemental partagé entre vous et votre coach.
            </p>
            <h2>Comment ça marche</h2>
            <p>
              Parcourez l'annuaire, contactez l'éducateur de votre choix, puis suivez ensemble la progression
              de votre chien depuis l'application — séance après séance, semaine après semaine.
            </p>
          </>
        ),
      }}
    />
  );
}

export function EducationCanineVaud() {
  return (
    <SeoLandingLayout
      cfg={{
        path: "/education-canine-vaud",
        title: "Éducation canine dans le canton de Vaud — DogWork",
        description:
          "Éducation canine dans le canton de Vaud : éducateurs vérifiés à Lausanne, Vevey, Morges, Nyon, Yverdon. Plans personnalisés et suivi via l'application DogWork.",
        h1: "Éducation canine dans le canton de Vaud",
        intro:
          "Un réseau d'éducateurs canins vérifiés à Lausanne, Vevey, Morges, Nyon, Yverdon et dans tout le canton de Vaud.",
        bullets: [
          "Éducateurs vérifiés couvrant tout le canton de Vaud",
          "Méthodes positives et bienveillantes",
          "Plans adaptés à chaque chien : chiot, adulte, sénior, comportement",
          "Suivi mesurable depuis l'application DogWork",
        ],
        primaryCta: { label: "Voir les éducateurs vaudois", to: "/annuaire/coachs" },
        secondaryCta: { label: "Comment ça marche", to: "/landing" },
        longCopy: (
          <>
            <h2>Trouver un éducateur canin dans le canton de Vaud</h2>
            <p>
              Que vous soyez à Lausanne, sur la Riviera, à La Côte ou dans le Nord vaudois, l'annuaire
              DogWork vous permet d'identifier rapidement un éducateur canin certifié près de chez vous.
            </p>
            <h2>Un suivi structuré, pas une simple liste de cours</h2>
            <p>
              DogWork ne s'arrête pas au choix de l'éducateur : l'application accompagne le quotidien
              de votre chien avec des plans d'entraînement, des exercices guidés et un journal
              comportemental partagé.
            </p>
          </>
        ),
      }}
    />
  );
}

export function ApplicationEducationCanine() {
  return (
    <SeoLandingLayout
      cfg={{
        path: "/application-education-canine",
        title: "Application d'éducation canine — DogWork",
        description:
          "DogWork est l'application d'éducation canine pensée pour les propriétaires exigeants : plans personnalisés, 480+ exercices, suivi comportemental et accompagnement par des coachs vérifiés.",
        h1: "L'application d'éducation canine DogWork",
        intro:
          "Une application complète pour éduquer, suivre et comprendre votre chien — pensée avec des éducateurs professionnels.",
        bullets: [
          "Plans d'éducation personnalisés par l'IA et validés par des coachs",
          "480+ exercices avec instructions pas à pas",
          "Suivi comportemental quotidien et statistiques",
          "Accompagnement optionnel par un éducateur certifié",
        ],
        primaryCta: { label: "Découvrir DogWork", to: "/landing" },
        secondaryCta: { label: "Voir les offres", to: "/pricing" },
        longCopy: (
          <>
            <h2>Une vraie méthode, pas une collection de vidéos</h2>
            <p>
              DogWork construit un plan d'éducation adapté à l'âge, à la race et aux objectifs de votre
              chien, puis l'ajuste au fil des séances en fonction de ses progrès réels.
            </p>
            <h2>Pensée avec des professionnels canins</h2>
            <p>
              Chaque exercice est rédigé et validé par des éducateurs : instructions claires, critères
              de réussite, signaux d'alerte et progressions. Vous gardez le contrôle, l'application
              vous guide.
            </p>
          </>
        ),
      }}
    />
  );
}

export function ApplicationSuiviChien() {
  return (
    <SeoLandingLayout
      cfg={{
        path: "/application-suivi-chien",
        title: "Application de suivi pour chien — DogWork",
        description:
          "Suivez votre chien au quotidien avec DogWork : journal comportemental, santé, séances d'éducation, statistiques et historiques. Conçu pour les propriétaires et les éducateurs.",
        h1: "Suivez votre chien au quotidien",
        intro:
          "Journal comportemental, suivi santé, séances d'éducation et statistiques claires — toutes les informations utiles sur votre chien, au même endroit.",
        bullets: [
          "Journal quotidien : comportement, alimentation, balades, événements",
          "Suivi de santé et historique vétérinaire",
          "Statistiques de progression sur la durée",
          "Partage simple avec votre éducateur ou votre refuge",
        ],
        primaryCta: { label: "Essayer DogWork", to: "/landing" },
        secondaryCta: { label: "Installer l'app", to: "/install" },
        longCopy: (
          <>
            <h2>Pourquoi suivre son chien au quotidien ?</h2>
            <p>
              Les progrès d'éducation, les changements de comportement et les signaux santé se voient
              dans la durée. Sans suivi structuré, ils passent inaperçus. DogWork conserve cet
              historique pour vous, votre coach et votre vétérinaire.
            </p>
            <h2>Conçu pour la vraie vie</h2>
            <p>
              L'app est rapide à utiliser sur mobile : quelques secondes par jour suffisent pour
              construire un suivi exploitable.
            </p>
          </>
        ),
      }}
    />
  );
}

export function SuiviComportementChien() {
  return (
    <SeoLandingLayout
      cfg={{
        path: "/suivi-comportement-chien",
        title: "Suivi du comportement du chien — Journal & analyse DogWork",
        description:
          "Suivez le comportement de votre chien dans la durée avec DogWork : journal quotidien, signaux d'alerte, tendances et partage avec un éducateur certifié.",
        h1: "Suivi du comportement du chien",
        intro:
          "Comprendre le comportement de son chien demande du recul. DogWork structure l'observation au quotidien et révèle les tendances qui passent inaperçues à l'œil nu.",
        bullets: [
          "Journal quotidien des comportements, déclencheurs et contextes",
          "Tendances et statistiques sur la durée (réactivité, calme, sommeil)",
          "Signaux d'alerte identifiables avant qu'ils ne s'installent",
          "Partage simple avec votre éducateur ou votre vétérinaire",
        ],
        primaryCta: { label: "Essayer DogWork", to: "/landing" },
        secondaryCta: { label: "Trouver un éducateur", to: "/annuaire/coachs" },
        longCopy: (
          <>
            <h2>Pourquoi suivre le comportement, et pas seulement les exercices ?</h2>
            <p>
              Un chien évolue. Les tensions, les peurs, les réactions sociales ou les routines changent
              au fil des semaines. Sans suivi structuré, ces évolutions restent floues. DogWork garde
              une trace claire, datée, contextualisée — utile pour vous, pour votre coach et pour votre
              vétérinaire.
            </p>
            <h2>Des observations simples, des conclusions utiles</h2>
            <p>
              Quelques secondes par jour suffisent : événement, contexte, intensité. DogWork agrège
              ensuite ces données pour faire ressortir les tendances et proposer des ajustements
              concrets dans le plan d'éducation.
            </p>
            <h2>Pensé pour la Suisse romande</h2>
            <p>
              Si le suivi révèle un besoin d'accompagnement, l'annuaire DogWork permet d'identifier
              rapidement un éducateur canin certifié à Lausanne, dans le canton de Vaud ou ailleurs
              en Suisse romande.
            </p>
            <p>
              DogWork n'est pas un outil médical et ne remplace pas un avis vétérinaire ou
              comportementaliste : il facilite l'observation et la communication avec les
              professionnels qui accompagnent votre chien.
            </p>
          </>
        ),
      }}
    />
  );
}

export function RefugesAnimauxVaud() {
  return (
    <SeoLandingLayout
      cfg={{
        path: "/refuges-animaux-vaud",
        title: "Refuges pour chiens dans le canton de Vaud — DogWork",
        description:
          "Refuges et associations canines actifs dans le canton de Vaud : profils enrichis, adoption responsable et suivi post-adoption via l'application DogWork.",
        h1: "Refuges pour chiens dans le canton de Vaud",
        intro:
          "Découvrez les refuges et associations vaudois engagés dans l'adoption responsable, et soutenez leur action.",
        bullets: [
          "Refuges vérifiés actifs dans tout le canton de Vaud",
          "Fiches enrichies : mission, équipe, chiens à l'adoption",
          "Suivi post-adoption structuré côté refuge et adoptant",
          "Outils professionnels gratuits pour les associations",
        ],
        primaryCta: { label: "Voir les refuges vaudois", to: "/annuaire/refuges" },
        secondaryCta: { label: "Adopter responsable", to: "/adoption-chien-suisse-romande" },
        longCopy: (
          <>
            <h2>Pourquoi un annuaire dédié ?</h2>
            <p>
              Les refuges du canton de Vaud font un travail essentiel mais souvent peu visible.
              L'annuaire DogWork leur donne une vitrine professionnelle, gratuite, avec un suivi
              post-adoption intégré.
            </p>
            <h2>Adoption responsable</h2>
            <p>
              DogWork accompagne l'adoptant dans les premières semaines pour réduire les retours et
              améliorer l'intégration du chien dans son nouveau foyer.
            </p>
          </>
        ),
      }}
    />
  );
}

export function AdoptionChienSuisseRomande() {
  return (
    <SeoLandingLayout
      cfg={{
        path: "/adoption-chien-suisse-romande",
        title: "Adopter un chien en Suisse romande — DogWork",
        description:
          "Adoption responsable en Suisse romande : trouvez un refuge vérifié, préparez l'arrivée du chien et bénéficiez d'un suivi post-adoption structuré avec DogWork.",
        h1: "Adopter un chien en Suisse romande",
        intro:
          "Un parcours d'adoption clair : refuges vérifiés, préparation à l'arrivée et suivi post-adoption pour donner toutes ses chances au chien.",
        bullets: [
          "Annuaire de refuges vérifiés en Suisse romande",
          "Préparation à l'arrivée du chien : matériel, environnement, rythme",
          "Suivi post-adoption : journal, plan d'éducation, accompagnement",
          "Coordination entre refuge, adoptant et éducateur",
        ],
        primaryCta: { label: "Voir les refuges", to: "/annuaire/refuges" },
        secondaryCta: { label: "Découvrir DogWork", to: "/landing" },
        longCopy: (
          <>
            <h2>Adopter, c'est un engagement long terme</h2>
            <p>
              Un chien adopté arrive souvent avec une histoire. DogWork structure les premières
              semaines avec un plan d'adaptation, un journal partagé et un accès facile à un coach
              en cas de difficulté.
            </p>
            <h2>Un parcours pensé pour la Suisse romande</h2>
            <p>
              L'annuaire couvre les refuges et associations actifs à Lausanne, dans le canton de
              Vaud et plus largement en Suisse romande. Choisissez celui qui correspond à votre
              démarche et lancez-vous.
            </p>
          </>
        ),
      }}
    />
  );
}
