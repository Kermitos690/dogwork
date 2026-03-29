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
        </div>

        <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none space-y-6">

          {/* 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">1. Éditeur et exploitant</h2>
            <p className="text-muted-foreground leading-relaxed">
              La plateforme <strong className="text-foreground">DogWork</strong> est éditée et exploitée par :
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm space-y-1">
              <p className="text-foreground font-medium">📌 <span className="text-primary">[Nom légal de l'exploitant à compléter]</span></p>
              <p className="text-muted-foreground">📌 <span className="text-primary">[Adresse postale à compléter]</span></p>
              <p className="text-muted-foreground">📌 <span className="text-primary">[E-mail de contact à compléter]</span></p>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Pour toute question, vous pouvez également utiliser la fonctionnalité de support intégrée à l'application (section Tickets).
            </p>
          </section>

          {/* 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">2. Objet du service</h2>
            <p className="text-muted-foreground leading-relaxed">
              DogWork est une plateforme numérique dédiée à l'écosystème canin. Elle permet aux propriétaires de chiens de suivre l'éducation et le bien-être de leur animal, aux éducateurs canins de gérer leur activité professionnelle et leurs cours, et aux refuges et structures animalières de gérer leurs animaux, équipes et opérations quotidiennes.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Les présentes conditions régissent l'accès et l'utilisation de la plateforme, y compris les abonnements payants et les services associés.
            </p>
          </section>

          {/* 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">3. Utilisateurs et rôles</h2>
            <p className="text-muted-foreground leading-relaxed">DogWork distingue plusieurs types d'utilisateurs :</p>
            <ul className="space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Propriétaire (Owner)</strong> — Utilisateur individuel souhaitant suivre l'éducation de son ou ses chiens. L'accès est structuré en plans : Starter, Pro et Expert.</li>
              <li><strong className="text-foreground">Éducateur canin</strong> — Professionnel proposant des cours et des prestations via la marketplace DogWork. Un abonnement éducateur dédié et séparé est requis.</li>
              <li><strong className="text-foreground">Refuge / Structure animalière</strong> — Organisation gérant des animaux, des équipes et des adoptions. Un abonnement refuge dédié et séparé est requis.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              Chaque type d'utilisateur dispose de fonctionnalités, de limites et de conditions d'abonnement propres. Les présentes conditions s'appliquent à l'ensemble des utilisateurs.
            </p>
          </section>

          {/* 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">4. Création de compte</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'accès à DogWork nécessite la création d'un compte utilisateur avec une adresse e-mail valide et un mot de passe sécurisé. L'utilisateur est responsable de la confidentialité de ses identifiants et de toute activité effectuée sous son compte.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              DogWork se réserve le droit de suspendre ou supprimer un compte en cas de violation des présentes conditions ou d'utilisation abusive de la plateforme.
            </p>
          </section>

          {/* 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">5. Plans et abonnements propriétaire</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les propriétaires de chiens peuvent accéder à la plateforme selon trois plans :
            </p>
            <div className="rounded-xl border border-border bg-card p-4 space-y-3 text-sm">
              <div className="flex justify-between items-center border-b border-border pb-2">
                <span className="font-semibold text-foreground">Starter</span>
                <span className="text-muted-foreground">Gratuit</span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-2">
                <span className="font-semibold text-foreground">Pro</span>
                <span className="text-muted-foreground">7,90 CHF / mois</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-foreground">Expert</span>
                <span className="text-muted-foreground">12,90 CHF / mois</span>
              </div>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Les fonctionnalités accessibles varient selon le plan choisi (nombre de chiens, accès à la bibliothèque d'exercices, outils d'évaluation, statistiques avancées, assistant IA, etc.). Le détail des fonctionnalités de chaque plan est indiqué sur la page d'abonnement de l'application. DogWork se réserve le droit de faire évoluer le contenu des plans.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Les prix affichés sont en francs suisses (CHF), toutes taxes comprises si applicable. Les prix applicables sont ceux indiqués dans l'application au moment de la souscription.
            </p>
          </section>

          {/* 6 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">6. Abonnements éducateur et refuge</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les éducateurs canins et les refuges disposent chacun d'un abonnement dédié et distinct des plans propriétaire. Les conditions tarifaires et les fonctionnalités associées sont précisées dans les sections correspondantes de l'application.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Les paiements liés aux cours et prestations de la marketplace éducateur sont traités via Stripe Connect. L'éducateur accepte les conditions de Stripe lors de la mise en place de son compte de paiement.
            </p>
          </section>

          {/* 7 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">7. Paiement et facturation</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les paiements sont traités de manière sécurisée par <strong className="text-foreground">Stripe</strong>. DogWork ne stocke aucune donnée de carte bancaire. Stripe assure le traitement, le chiffrement et la sécurité des transactions conformément aux normes PCI-DSS.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Les abonnements propriétaire (Pro et Expert) sont à renouvellement mensuel automatique, sauf résiliation par l'utilisateur. La facturation intervient à la date anniversaire de la souscription.
            </p>
          </section>

          {/* 8 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">8. Résiliation et fin d'abonnement</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'utilisateur peut résilier son abonnement à tout moment via le portail de gestion d'abonnement accessible depuis l'application (bouton « Gérer l'abonnement »). Ce portail est opéré par Stripe.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              La résiliation prend effet à la fin de la période de facturation en cours. L'utilisateur conserve l'accès aux fonctionnalités de son plan jusqu'à cette date. À l'issue de la période, le compte revient automatiquement au plan Starter (gratuit).
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Les périodes d'abonnement déjà facturées ne sont pas remboursées, sauf disposition contraire du droit applicable ou circonstances exceptionnelles appréciées au cas par cas par DogWork.
            </p>
          </section>

          {/* 9 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">9. Règles d'utilisation</h2>
            <p className="text-muted-foreground leading-relaxed">L'utilisateur s'engage à :</p>
            <ul className="space-y-1 text-muted-foreground list-disc pl-5">
              <li>Utiliser la plateforme conformément à son objet et de manière loyale</li>
              <li>Ne pas tenter de contourner les limitations d'accès liées à son plan</li>
              <li>Ne pas partager ses identifiants avec des tiers</li>
              <li>Ne pas publier de contenu illicite, abusif ou contraire aux bonnes pratiques</li>
              <li>Ne pas nuire au bon fonctionnement de la plateforme</li>
            </ul>
          </section>

          {/* 10 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">10. Propriété intellectuelle</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'ensemble des contenus, exercices, textes, images, logos, marques, interfaces et fonctionnalités de DogWork sont protégés par le droit de la propriété intellectuelle. Toute reproduction, diffusion ou utilisation non autorisée est interdite.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Les données saisies par l'utilisateur (profils de chiens, notes, journaux, etc.) restent sa propriété. L'utilisateur peut exporter ses données personnelles depuis les paramètres de l'application.
            </p>
          </section>

          {/* 11 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">11. Disponibilité et évolution du service</h2>
            <p className="text-muted-foreground leading-relaxed">
              DogWork s'efforce d'assurer la disponibilité continue de la plateforme, mais ne garantit pas une accessibilité ininterrompue. Des interruptions temporaires peuvent survenir pour maintenance, mise à jour ou raison technique.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              DogWork se réserve le droit de faire évoluer les fonctionnalités, les plans et les tarifs de la plateforme. Les modifications tarifaires n'affectent pas les périodes d'abonnement déjà facturées.
            </p>
          </section>

          {/* 12 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">12. Limitation de responsabilité</h2>
            <p className="text-muted-foreground leading-relaxed">
              DogWork est un outil d'aide à l'éducation et au suivi canin. Il ne remplace en aucun cas l'avis d'un vétérinaire, d'un comportementaliste diplômé ou d'un professionnel de santé animale. Les recommandations, exercices et informations fournies par la plateforme, y compris via l'assistant IA, sont à titre indicatif et ne constituent pas un diagnostic médical ou comportemental.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              DogWork décline toute responsabilité en cas d'utilisation inappropriée du service, de perte de données liée à un usage non conforme, ou de dommages indirects résultant de l'utilisation de la plateforme.
            </p>
          </section>

          {/* 13 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">13. Droit applicable et for juridique</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les présentes conditions sont régies par le droit suisse. En cas de litige, les parties s'efforceront de trouver une solution amiable. À défaut, les tribunaux compétents du siège de l'exploitant sont seuls compétents, sous réserve des dispositions impératives en faveur du consommateur.
            </p>
          </section>

          {/* 14 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">14. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pour toute question relative aux présentes conditions, vous pouvez nous contacter via la fonctionnalité de support intégrée à l'application ou à l'adresse : <span className="text-primary font-medium">[e-mail de contact à compléter]</span>.
            </p>
          </section>

        </div>

        {/* Navigation légale */}
        <div className="border-t border-border pt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground transition-colors">Politique de confidentialité</Link>
          <Link to="/legal" className="hover:text-foreground transition-colors">Mentions légales</Link>
        </div>
      </div>
    </div>
  );
}
