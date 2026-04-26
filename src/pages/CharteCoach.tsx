import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, AlertTriangle, CreditCard, Percent } from "lucide-react";

export default function CharteCoach() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Engagement contractuel
          </div>
          <h1 className="text-3xl font-bold text-foreground">Charte Coach &amp; Éducateur DogWork</h1>
          <p className="text-sm text-muted-foreground">
            Règles d'utilisation monétaire de la plateforme — applicables à tout coach, éducateur ou
            organisation utilisant les fonctions marketplace.
          </p>
        </div>

        <section className="rounded-xl border border-border bg-card p-6 space-y-3">
          <div className="flex items-start gap-3">
            <CreditCard className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">1. Tous les paiements transitent par DogWork</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Toute transaction issue d'un cours, d'une séance, d'un bilan ou d'un service proposé via la
                plateforme doit être encaissée via DogWork (Stripe). Aucun paiement direct (espèces, TWINT,
                IBAN, PayPal, Revolut, virement, lien externe) n'est autorisé.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 space-y-3">
          <div className="flex items-start gap-3">
            <Percent className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">2. Commissions appliquées</h2>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1.5 list-disc list-inside">
                <li><strong className="text-foreground">15,8 %</strong> sur chaque réservation marketplace (frais plateforme + Stripe).</li>
                <li><strong className="text-foreground">8 %</strong> reversés à l'éducateur parrain en cas d'inscription via code de parrainage actif.</li>
                <li>Cotisation annuelle éducateur : <strong className="text-foreground">200 CHF</strong>.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">3. Détection automatique &amp; sanctions</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Le contenu de vos cours est analysé automatiquement (titres, descriptions, messages). Toute
                mention de moyen de paiement externe entraîne :
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1.5 list-disc list-inside">
                <li>Bloquage immédiat de la publication.</li>
                <li>Notification à l'administration.</li>
                <li>En cas de récidive : suspension du compte et résiliation de la cotisation sans remboursement.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 space-y-2">
          <h2 className="text-lg font-semibold text-foreground">4. Crédits DogWork</h2>
          <p className="text-sm text-muted-foreground">
            Les fonctions IA et premium consomment des Crédits DogWork. Les soldes sont strictement
            personnels, non transférables et non remboursables hors cas explicitement prévus (échec
            technique de la fonction concernée).
          </p>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 space-y-2">
          <h2 className="text-lg font-semibold text-foreground">5. Acceptation</h2>
          <p className="text-sm text-muted-foreground">
            L'activation du module Marketplace ou la création d'un cours payant vaut acceptation pleine et
            entière de la présente charte. La version applicable est celle publiée sur cette page au
            moment de la transaction.
          </p>
          <p className="text-xs text-muted-foreground pt-2">Dernière mise à jour : 26 avril 2026</p>
        </section>
      </div>
    </div>
  );
}
