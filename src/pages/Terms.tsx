import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Conditions générales d'utilisation et d'abonnement</h1>
          <p className="text-sm text-muted-foreground">Dernière mise à jour : 29 mars 2026</p>
          <p className="text-sm text-muted-foreground">Entrée en vigueur : 29 mars 2026</p>
        </div>

        <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none space-y-6">

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">1. Éditeur et exploitant</h2>
            <p className="text-muted-foreground leading-relaxed">
              La plateforme <strong className="text-foreground">DogWork</strong> est éditée et exploitée par :
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm space-y-1">
              <p className="text-foreground font-medium">DogWork@Home by Teba</p>
              <p className="text-muted-foreground">Route de Berne 222, 1066 Epalinges</p>
              <p className="text-muted-foreground">Teba.gaetan@gmail.com</p>
              <p className="text-muted-foreground">+41 78 633 67 77</p>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Pour toute question relative au service, vous pouvez également utiliser la fonctionnalité de support intégrée à l'application.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">2. Objet du service</h2>
            <p className="text-muted-foreground leading-relaxed">
              DogWork est une plateforme numérique dédiée à l'écosystème canin. Elle permet notamment :
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>aux propriétaires de chiens de suivre l'éducation, la progression et certaines informations relatives à leur animal ;</li>
              <li>aux éducateurs canins de gérer leur activité, leurs cours et certaines interactions avec leurs clients ;</li>
              <li>aux refuges et structures animalières de gérer leurs animaux, leurs équipes et certaines opérations liées à leur activité.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              Les présentes conditions régissent l'accès, l'utilisation et, le cas échéant, la souscription aux services proposés sur DogWork.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">3. Utilisateurs et rôles</h2>
            <p className="text-muted-foreground leading-relaxed">
              DogWork distingue notamment les catégories d'utilisateurs suivantes :
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Propriétaire</strong> : utilisateur individuel accédant aux fonctionnalités owner, selon les plans Starter, Pro ou Expert ;</li>
              <li><strong className="text-foreground">Éducateur canin</strong> : professionnel utilisant les fonctionnalités dédiées à la gestion de son activité, sous réserve d'un abonnement séparé ;</li>
              <li><strong className="text-foreground">Refuge / structure animalière</strong> : organisation utilisant les fonctionnalités shelter, sous réserve d'un abonnement séparé.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              Chaque catégorie d'utilisateur dispose d'un périmètre fonctionnel, de limitations d'accès et, le cas échéant, de modalités d'abonnement spécifiques.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">4. Création de compte</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'accès à tout ou partie des services nécessite la création d'un compte avec une adresse e-mail valide et un mot de passe sécurisé.
            </p>
            <p className="text-muted-foreground leading-relaxed">L'utilisateur est responsable :</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>de l'exactitude des informations fournies ;</li>
              <li>de la confidentialité de ses identifiants ;</li>
              <li>de toute activité réalisée depuis son compte.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              DogWork peut suspendre, restreindre ou supprimer un compte en cas d'utilisation abusive, frauduleuse, illicite ou contraire aux présentes conditions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">5. Capacité et usage autorisé</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'utilisation de DogWork est réservée aux personnes capables de contracter conformément au droit applicable.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Lorsqu'un compte est créé ou utilisé pour le compte d'une entreprise, d'un refuge, d'une association ou de toute autre structure, la personne qui agit confirme disposer des autorisations nécessaires pour engager cette entité.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              L'utilisateur s'engage à utiliser la plateforme de manière loyale, conforme à sa destination, et sans tenter de contourner les limitations techniques ou contractuelles applicables à son plan.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">6. Conclusion du contrat</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pour les services payants, le contrat est conclu au moment où l'utilisateur :
            </p>
            <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
              <li>sélectionne l'offre souhaitée ;</li>
              <li>accède au parcours de paiement ;</li>
              <li>vérifie les informations affichées, y compris le plan choisi et le prix applicable ;</li>
              <li>valide la souscription ;</li>
              <li>obtient la confirmation du paiement par le prestataire de paiement.</li>
            </ol>
            <p className="text-muted-foreground leading-relaxed">
              Avant validation finale, l'utilisateur peut corriger d'éventuelles erreurs de saisie ou revenir en arrière dans le processus, dans la mesure permise par l'interface et le parcours de paiement.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">7. Plans et abonnements propriétaire</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les propriétaires de chiens peuvent accéder à DogWork selon trois plans :
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Starter</strong> : gratuit</li>
              <li><strong className="text-foreground">Pro</strong> : 7,90 CHF / mois</li>
              <li><strong className="text-foreground">Expert</strong> : 12,90 CHF / mois</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              Les fonctionnalités, limitations et niveaux d'accès varient selon le plan choisi. Le détail des fonctionnalités applicables figure sur la page d'abonnement de l'application.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Les prix sont indiqués en francs suisses (CHF). Le prix applicable est celui affiché au moment de la souscription.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              DogWork se réserve le droit de faire évoluer le contenu des plans et les fonctionnalités proposées. Toute modification tarifaire applicable aux abonnements récurrents sera communiquée à l'avance et ne s'appliquera qu'aux périodes de facturation futures.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">8. Abonnements éducateur et refuge</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les éducateurs canins et les refuges / structures animalières disposent chacun d'un abonnement distinct des plans propriétaire.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Les conditions tarifaires et fonctionnelles applicables à ces catégories d'utilisateurs sont précisées dans les sections correspondantes de l'application.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Les paiements liés à certains flux marketplace, notamment certains paiements de cours ou prestations éducateurs, peuvent être traités via Stripe Connect ou tout autre prestataire de paiement approprié selon l'architecture du service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">9. Paiement et facturation</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les paiements sont traités par Stripe ou, selon le cas, par l'infrastructure de paiement intégrée au service. DogWork ne stocke pas les données complètes de carte bancaire.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Les abonnements owner payants sont, sauf indication contraire affichée au moment de la souscription, <strong className="text-foreground">à renouvellement automatique mensuel</strong>.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              La facturation intervient à la date anniversaire de souscription ou selon les modalités affichées dans le parcours de paiement.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              L'utilisateur est responsable de la validité de son moyen de paiement et des informations de facturation transmises.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">10. Résiliation et fin d'abonnement</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'utilisateur peut mettre fin à son abonnement via le portail de gestion d'abonnement accessible depuis l'application, lorsque cette option est disponible.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Sauf indication contraire, la résiliation prend effet à la fin de la période de facturation en cours. L'utilisateur conserve l'accès aux fonctionnalités de son plan jusqu'à cette échéance.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              À l'issue de la période payée, le compte revient au plan gratuit disponible, à savoir le plan Starter, sauf suppression du compte ou autre mesure applicable.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Les périodes déjà facturées ne sont en principe pas remboursées, sauf disposition impérative du droit applicable ou cas exceptionnels appréciés au cas par cas.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">11. Règles d'utilisation</h2>
            <p className="text-muted-foreground leading-relaxed">L'utilisateur s'engage notamment à :</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>utiliser la plateforme conformément à sa destination ;</li>
              <li>ne pas tenter de contourner les limitations d'accès ou de plan ;</li>
              <li>ne pas partager ses identifiants avec des tiers non autorisés ;</li>
              <li>ne pas publier ou transmettre de contenu illicite, injurieux, trompeur ou portant atteinte aux droits de tiers ;</li>
              <li>ne pas perturber le fonctionnement technique du service ;</li>
              <li>ne pas utiliser DogWork à des fins frauduleuses ou abusives.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">12. Propriété intellectuelle</h2>
            <p className="text-muted-foreground leading-relaxed">
              Sauf mention contraire, l'ensemble des éléments composant DogWork, y compris notamment les textes, interfaces, visuels, logos, contenus, bibliothèques d'exercices, marques, bases de données et éléments logiciels, est protégé par le droit applicable de la propriété intellectuelle.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Toute reproduction, extraction, représentation, diffusion ou utilisation non autorisée est interdite.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Les données que l'utilisateur saisit dans la plateforme demeurent les siennes, sous réserve des droits nécessaires à l'exploitation technique du service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">13. Données utilisateur</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'utilisateur conserve ses droits sur les données qu'il renseigne dans DogWork.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Lorsqu'un accès, une rectification, une suppression ou, lorsque cela est techniquement possible, une remise des données dans un format structuré est demandé, DogWork traite la demande conformément au droit applicable et à sa <Link to="/privacy" className="text-primary hover:underline">politique de confidentialité</Link>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">14. Disponibilité, maintenance et évolution</h2>
            <p className="text-muted-foreground leading-relaxed">
              DogWork s'efforce d'assurer une disponibilité satisfaisante du service, sans garantir une accessibilité continue, ininterrompue ou exempte d'erreur.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Des interruptions peuvent intervenir pour maintenance, mise à jour, sécurité, évolution technique ou pour toute autre raison opérationnelle.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              DogWork peut faire évoluer à tout moment son interface, ses fonctionnalités, ses plans, son infrastructure technique ou son modèle économique.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">15. Limitation de responsabilité</h2>
            <p className="text-muted-foreground leading-relaxed">
              DogWork est un outil d'aide à l'éducation, au suivi et à l'organisation autour du chien. Il ne remplace pas l'avis d'un vétérinaire, d'un professionnel de santé animale, ni d'un spécialiste du comportement animal.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Les contenus, exercices, recommandations et informations fournis via la plateforme, y compris au travers de fonctionnalités automatisées ou d'assistance, sont fournis à titre informatif et d'accompagnement uniquement.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Dans les limites autorisées par le droit applicable, DogWork exclut toute responsabilité pour les dommages indirects, pertes de profit, pertes de données, indisponibilités temporaires, ou conséquences résultant d'une utilisation inadaptée ou non conforme du service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">16. Droit applicable et for</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les présentes conditions sont régies par le droit suisse.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              En cas de litige, les parties chercheront d'abord une solution amiable.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              À défaut, les tribunaux compétents du siège de l'exploitant sont compétents, sous réserve des dispositions impératives éventuellement applicables au consommateur.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">17. Langue applicable</h2>
            <p className="text-muted-foreground leading-relaxed">
              La version française des présentes conditions fait foi. En cas de divergence entre plusieurs versions linguistiques, la version française prévaut, sous réserve des dispositions impératives applicables.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">18. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pour toute question relative aux présentes conditions, vous pouvez contacter DogWork :
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>via la fonctionnalité de support intégrée à l'application ;</li>
              <li>ou à l'adresse suivante : <strong className="text-foreground">Teba.gaetan@gmail.com</strong></li>
            </ul>
          </section>

        </div>

        <div className="border-t border-border pt-6 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground transition-colors">Politique de confidentialité</Link>
          <Link to="/legal" className="hover:text-foreground transition-colors">Mentions légales</Link>
        </div>
      </div>
    </div>
  );
}
