import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Politique de confidentialité</h1>
          <p className="text-sm text-muted-foreground">Dernière mise à jour : 29 mars 2026</p>
          <p className="text-sm text-muted-foreground">Entrée en vigueur : 29 mars 2026</p>
        </div>

        <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none space-y-6">

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">1. Responsable du traitement</h2>
            <p className="text-muted-foreground leading-relaxed">
              Le responsable du traitement des données personnelles liées à l'utilisation de DogWork est :
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm space-y-1">
              <p className="text-foreground font-medium">DogWork@Home by Teba</p>
              <p className="text-muted-foreground">Route de Berne 222, 1066 Epalinges</p>
              <p className="text-muted-foreground">Teba.gaetan@gmail.com</p>
              <p className="text-muted-foreground">+41 78 633 67 77</p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">2. Données traitées</h2>
            <p className="text-muted-foreground leading-relaxed">
              Dans le cadre de l'exploitation de DogWork, les catégories de données suivantes peuvent être traitées :
            </p>

            <h3 className="text-base font-medium text-foreground mt-4">a. Données de compte</h3>
            <p className="text-muted-foreground leading-relaxed">
              Adresse e-mail, nom d'affichage, avatar, identifiants techniques de compte, et mot de passe stocké de manière sécurisée sous forme hachée par le prestataire d'authentification.
            </p>

            <h3 className="text-base font-medium text-foreground mt-4">b. Données liées aux chiens</h3>
            <p className="text-muted-foreground leading-relaxed">
              Nom, race, date de naissance, poids, sexe, photo, informations relatives au profil du chien, à son suivi, à ses besoins, à sa progression et à certaines observations comportementales.
            </p>

            <h3 className="text-base font-medium text-foreground mt-4">c. Données d'entraînement et de suivi</h3>
            <p className="text-muted-foreground leading-relaxed">
              Sessions d'exercice, historique de progression, entrées de journal, évaluations, objectifs, problèmes, logs comportementaux et autres données renseignées dans le cadre de l'utilisation du service.
            </p>

            <h3 className="text-base font-medium text-foreground mt-4">d. Données de paiement</h3>
            <p className="text-muted-foreground leading-relaxed">
              Les données de paiement sont traitées par Stripe. DogWork ne conserve pas les données complètes de carte bancaire. Peuvent notamment être conservés certains identifiants techniques liés à la relation de paiement, comme l'identifiant client Stripe, le statut d'abonnement et certaines métadonnées de facturation.
            </p>

            <h3 className="text-base font-medium text-foreground mt-4">e. Données de support</h3>
            <p className="text-muted-foreground leading-relaxed">
              Tickets, messages de support, catégories de demande et échanges nécessaires au traitement des sollicitations utilisateur.
            </p>

            <h3 className="text-base font-medium text-foreground mt-4">f. Données techniques et de sécurité</h3>
            <p className="text-muted-foreground leading-relaxed">
              Adresse IP, journaux de connexion, journaux techniques, type d'appareil ou de navigateur, dates et heures d'accès, informations utiles à la sécurité, à la maintenance et à la prévention des abus.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">3. Finalités du traitement</h2>
            <p className="text-muted-foreground leading-relaxed">Les données sont traitées notamment pour :</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>créer et administrer les comptes utilisateurs ;</li>
              <li>fournir les fonctionnalités de DogWork ;</li>
              <li>gérer les abonnements, paiements et accès ;</li>
              <li>permettre le support utilisateur ;</li>
              <li>assurer la sécurité, l'intégrité et la stabilité du service ;</li>
              <li>améliorer le fonctionnement de la plateforme ;</li>
              <li>respecter les obligations légales, contractuelles et comptables applicables.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">4. Fondement du traitement</h2>
            <p className="text-muted-foreground leading-relaxed">Selon les cas, le traitement repose notamment sur :</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>l'exécution du contrat ou des mesures précontractuelles ;</li>
              <li>l'intérêt légitime de DogWork, notamment pour la sécurité, l'amélioration du service et la prévention des abus ;</li>
              <li>le respect d'obligations légales ;</li>
              <li>le consentement, lorsque celui-ci est requis.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">5. Prestataires et sous-traitants</h2>
            <p className="text-muted-foreground leading-relaxed">
              DogWork peut faire appel à des prestataires techniques, notamment pour :
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>l'hébergement, la base de données et l'authentification ;</li>
              <li>le traitement des paiements ;</li>
              <li>l'envoi d'e-mails transactionnels ;</li>
              <li>certains services techniques liés à l'exploitation de l'application.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              À la date de la présente politique, les prestataires utilisés peuvent notamment inclure :
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Supabase</strong> : backend, base de données, authentification ;</li>
              <li><strong className="text-foreground">Stripe</strong> : paiements, abonnements, portail client ;</li>
              <li><strong className="text-foreground">Resend</strong> : envoi d'e-mails transactionnels ;</li>
              <li><strong className="text-foreground">Lovable</strong> : infrastructure et fonctionnalités liées à l'application.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              DogWork demeure responsable du traitement de vos données personnelles dans le cadre applicable, même lorsqu'il recourt à des prestataires techniques.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">6. Transferts et localisation</h2>
            <p className="text-muted-foreground leading-relaxed">
              Selon les prestataires utilisés, certaines données peuvent être traitées ou hébergées en Suisse, dans l'Union européenne ou dans d'autres juridictions, y compris les États-Unis.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Lorsque des transferts internationaux sont nécessaires, DogWork veille à mettre en place des garanties appropriées conformes au droit applicable.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">7. Durée de conservation</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les données sont conservées aussi longtemps que nécessaire à la fourniture du service, à la gestion de la relation utilisateur, à la sécurité de la plateforme et au respect des obligations légales.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              En cas de suppression du compte, les données sont supprimées ou anonymisées dans un délai raisonnable, sauf si leur conservation reste nécessaire pour :
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>des obligations légales ;</li>
              <li>des obligations comptables et fiscales ;</li>
              <li>la gestion de litiges ou de droits ;</li>
              <li>des impératifs de sécurité.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              Les données liées à la facturation et aux obligations comptables peuvent notamment être conservées pendant la durée requise par le droit applicable, y compris jusqu'à dix ans lorsque cela est nécessaire.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">8. Sécurité</h2>
            <p className="text-muted-foreground leading-relaxed">
              DogWork met en œuvre des mesures techniques et organisationnelles appropriées pour protéger les données contre l'accès non autorisé, la perte, la divulgation, l'altération ou la destruction.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              L'accès aux données est limité selon les rôles, les permissions et les besoins opérationnels.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">9. Vos droits</h2>
            <p className="text-muted-foreground leading-relaxed">
              Sous réserve du droit applicable, vous pouvez notamment demander :
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>l'accès à vos données personnelles ;</li>
              <li>la rectification de données inexactes ;</li>
              <li>la suppression de certaines données ;</li>
              <li>la limitation ou l'opposition à certains traitements ;</li>
              <li>lorsque cela est applicable, la remise de vos données dans un format structuré.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              Pour exercer vos droits, vous pouvez contacter DogWork à l'adresse suivante : <strong className="text-foreground">Teba.gaetan@gmail.com</strong>
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Vous pouvez également utiliser la fonctionnalité de support de l'application.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">10. Paiements</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les paiements et abonnements sont traités par Stripe conformément à ses propres conditions et à sa politique de confidentialité.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              DogWork n'accède pas aux données complètes de carte bancaire. Les traitements liés au paiement restent soumis aux règles et mesures de sécurité du prestataire de paiement.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">11. Modifications de la politique</h2>
            <p className="text-muted-foreground leading-relaxed">
              DogWork peut modifier la présente politique de confidentialité afin de refléter l'évolution du service, des obligations légales ou des pratiques techniques.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              En cas de modification substantielle, une information appropriée pourra être communiquée via l'application ou par tout autre moyen adéquat.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">12. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pour toute question relative à la protection des données ou pour exercer vos droits, vous pouvez écrire à :
            </p>
            <p className="text-foreground font-medium">Teba.gaetan@gmail.com</p>
          </section>

        </div>

        <div className="border-t border-border pt-6 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground transition-colors">Conditions générales</Link>
          <Link to="/legal" className="hover:text-foreground transition-colors">Mentions légales</Link>
        </div>
      </div>
    </div>
  );
}
