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
        </div>

        <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none space-y-6">

          {/* 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">1. Responsable du traitement</h2>
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm space-y-1">
              <p className="text-foreground font-medium">📌 <span className="text-primary">[Nom légal de l'exploitant à compléter]</span></p>
              <p className="text-muted-foreground">📌 <span className="text-primary">[Adresse postale à compléter]</span></p>
              <p className="text-muted-foreground">📌 <span className="text-primary">[E-mail de contact à compléter]</span></p>
            </div>
          </section>

          {/* 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">2. Données collectées</h2>
            <p className="text-muted-foreground leading-relaxed">
              DogWork collecte et traite les catégories de données suivantes dans le cadre de son fonctionnement :
            </p>
            <div className="space-y-3">
              <div className="rounded-lg border border-border p-3 space-y-1">
                <p className="text-sm font-semibold text-foreground">Données de compte</p>
                <p className="text-xs text-muted-foreground">Adresse e-mail, nom d'affichage, avatar, mot de passe (chiffré).</p>
              </div>
              <div className="rounded-lg border border-border p-3 space-y-1">
                <p className="text-sm font-semibold text-foreground">Données liées aux chiens</p>
                <p className="text-xs text-muted-foreground">Nom, race, date de naissance, poids, sexe, photo, informations de santé, notes comportementales, historique de progression, évaluations, objectifs.</p>
              </div>
              <div className="rounded-lg border border-border p-3 space-y-1">
                <p className="text-sm font-semibold text-foreground">Données d'entraînement et de suivi</p>
                <p className="text-xs text-muted-foreground">Progression par jour, sessions d'exercice, entrées de journal, logs comportementaux, plans d'entraînement.</p>
              </div>
              <div className="rounded-lg border border-border p-3 space-y-1">
                <p className="text-sm font-semibold text-foreground">Données de paiement</p>
                <p className="text-xs text-muted-foreground">Les informations de paiement (carte bancaire, etc.) sont traitées directement par Stripe. DogWork ne stocke aucune donnée de carte. Seuls l'identifiant client Stripe et le statut d'abonnement sont conservés.</p>
              </div>
              <div className="rounded-lg border border-border p-3 space-y-1">
                <p className="text-sm font-semibold text-foreground">Données de support</p>
                <p className="text-xs text-muted-foreground">Tickets de support, messages, catégories de demande.</p>
              </div>
              <div className="rounded-lg border border-border p-3 space-y-1">
                <p className="text-sm font-semibold text-foreground">Données techniques</p>
                <p className="text-xs text-muted-foreground">Adresse IP, type de navigateur, logs de connexion, horodatages d'utilisation. Ces données sont collectées automatiquement pour assurer la sécurité et le bon fonctionnement du service.</p>
              </div>
            </div>
          </section>

          {/* 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">3. Finalités du traitement</h2>
            <p className="text-muted-foreground leading-relaxed">Les données collectées sont utilisées pour :</p>
            <ul className="space-y-1 text-muted-foreground list-disc pl-5 text-sm">
              <li>Permettre la création et la gestion de votre compte utilisateur</li>
              <li>Fournir les fonctionnalités de suivi et d'éducation canine</li>
              <li>Gérer les abonnements et les paiements</li>
              <li>Assurer le support technique et répondre à vos demandes</li>
              <li>Améliorer le service et l'expérience utilisateur</li>
              <li>Assurer la sécurité de la plateforme et prévenir les abus</li>
              <li>Respecter les obligations légales applicables</li>
            </ul>
          </section>

          {/* 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">4. Base du traitement</h2>
            <p className="text-muted-foreground leading-relaxed">
              Le traitement de vos données repose sur l'exécution du contrat d'utilisation (accès au service et fourniture des fonctionnalités), sur notre intérêt légitime (sécurité, amélioration du service), et sur vos obligations ou consentement lorsque requis par la loi applicable.
            </p>
          </section>

          {/* 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">5. Sous-traitants et prestataires</h2>
            <p className="text-muted-foreground leading-relaxed">
              DogWork fait appel aux prestataires techniques suivants pour assurer le fonctionnement du service :
            </p>
            <div className="rounded-xl border border-border bg-card p-4 space-y-3 text-sm">
              <div className="flex justify-between items-start border-b border-border pb-2">
                <div>
                  <p className="font-semibold text-foreground">Supabase</p>
                  <p className="text-xs text-muted-foreground">Hébergement, base de données, authentification</p>
                </div>
                <span className="text-xs text-muted-foreground">UE / USA</span>
              </div>
              <div className="flex justify-between items-start border-b border-border pb-2">
                <div>
                  <p className="font-semibold text-foreground">Stripe</p>
                  <p className="text-xs text-muted-foreground">Traitement des paiements et abonnements</p>
                </div>
                <span className="text-xs text-muted-foreground">USA</span>
              </div>
              <div className="flex justify-between items-start border-b border-border pb-2">
                <div>
                  <p className="font-semibold text-foreground">Resend</p>
                  <p className="text-xs text-muted-foreground">Envoi d'e-mails transactionnels</p>
                </div>
                <span className="text-xs text-muted-foreground">USA</span>
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-foreground">Lovable</p>
                  <p className="text-xs text-muted-foreground">Hébergement de l'application et fonctionnalités IA</p>
                </div>
                <span className="text-xs text-muted-foreground">UE</span>
              </div>
            </div>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Ces prestataires traitent les données conformément à leurs propres politiques de confidentialité et aux accords contractuels en place. Des garanties appropriées sont mises en œuvre pour les transferts de données en dehors de la Suisse.
            </p>
          </section>

          {/* 6 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">6. Durée de conservation</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les données personnelles sont conservées aussi longtemps que votre compte est actif et que cela est nécessaire à la fourniture du service. En cas de suppression de compte, les données sont supprimées dans un délai raisonnable, sauf obligation légale de conservation (notamment les données de facturation, conservées conformément aux obligations comptables suisses).
            </p>
          </section>

          {/* 7 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">7. Sécurité</h2>
            <p className="text-muted-foreground leading-relaxed">
              DogWork met en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données personnelles contre tout accès non autorisé, perte, altération ou divulgation. L'accès aux données est restreint selon les rôles et les permissions définies dans la plateforme.
            </p>
          </section>

          {/* 8 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">8. Vos droits</h2>
            <p className="text-muted-foreground leading-relaxed">
              Conformément à la législation applicable en matière de protection des données, vous disposez des droits suivants :
            </p>
            <ul className="space-y-1 text-muted-foreground list-disc pl-5 text-sm">
              <li><strong className="text-foreground">Droit d'accès</strong> — Obtenir une copie de vos données personnelles</li>
              <li><strong className="text-foreground">Droit de rectification</strong> — Corriger des données inexactes ou incomplètes</li>
              <li><strong className="text-foreground">Droit de suppression</strong> — Demander la suppression de vos données</li>
              <li><strong className="text-foreground">Droit à la portabilité</strong> — Récupérer vos données dans un format structuré (export JSON disponible dans les paramètres)</li>
              <li><strong className="text-foreground">Droit d'opposition</strong> — Vous opposer au traitement dans certains cas</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Pour exercer vos droits, contactez-nous à l'adresse : <span className="text-primary font-medium">[e-mail de contact à compléter]</span> ou via la fonctionnalité de support de l'application.
            </p>
          </section>

          {/* 9 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">9. Modifications</h2>
            <p className="text-muted-foreground leading-relaxed">
              DogWork se réserve le droit de mettre à jour cette politique de confidentialité. Toute modification substantielle sera communiquée via l'application. La date de dernière mise à jour est indiquée en haut de cette page.
            </p>
          </section>

        </div>

        {/* Navigation légale */}
        <div className="border-t border-border pt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground transition-colors">Conditions d'abonnement</Link>
          <Link to="/legal" className="hover:text-foreground transition-colors">Mentions légales</Link>
        </div>
      </div>
    </div>
  );
}
