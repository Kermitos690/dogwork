import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Legal() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Mentions légales</h1>
          <p className="text-sm text-muted-foreground">Dernière mise à jour : 29 mars 2026</p>
        </div>

        <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none space-y-6">

          {/* Éditeur */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Éditeur et exploitant</h2>
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm space-y-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Nom commercial</p>
                <p className="text-foreground font-semibold">DogWork</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Raison sociale</p>
                <p className="text-primary font-medium">📌 [Nom légal à compléter]</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Adresse</p>
                <p className="text-primary font-medium">📌 [Adresse postale à compléter]</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">E-mail de contact</p>
                <p className="text-primary font-medium">📌 [E-mail à compléter]</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Téléphone</p>
                <p className="text-primary font-medium">📌 [Téléphone à compléter, si applicable]</p>
              </div>
            </div>
          </section>

          {/* Hébergement */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Hébergement et services techniques</h2>
            <div className="rounded-xl border border-border bg-card p-4 space-y-3 text-sm">
              <div className="border-b border-border pb-2">
                <p className="font-semibold text-foreground">Application web</p>
                <p className="text-xs text-muted-foreground">Hébergée par Lovable (Lovable Technologies Ltd)</p>
              </div>
              <div className="border-b border-border pb-2">
                <p className="font-semibold text-foreground">Backend et base de données</p>
                <p className="text-xs text-muted-foreground">Supabase Inc. — infrastructure cloud sécurisée</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Paiements</p>
                <p className="text-xs text-muted-foreground">Stripe, Inc. — traitement sécurisé conforme PCI-DSS</p>
              </div>
            </div>
          </section>

          {/* Propriété intellectuelle */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Propriété intellectuelle</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'ensemble des éléments composant la plateforme DogWork (textes, images, logos, exercices, interfaces, code source) sont protégés par le droit de la propriété intellectuelle. Toute reproduction ou utilisation non autorisée est interdite.
            </p>
          </section>

          {/* Données personnelles */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Protection des données</h2>
            <p className="text-muted-foreground leading-relaxed">
              Le traitement de vos données personnelles est détaillé dans notre{" "}
              <Link to="/privacy" className="text-primary hover:underline font-medium">politique de confidentialité</Link>.
            </p>
          </section>

          {/* Conditions */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Conditions d'utilisation</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'utilisation de DogWork est soumise aux{" "}
              <Link to="/terms" className="text-primary hover:underline font-medium">conditions générales d'utilisation et d'abonnement</Link>.
            </p>
          </section>

        </div>

        {/* Navigation légale */}
        <div className="border-t border-border pt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground transition-colors">Conditions d'abonnement</Link>
          <Link to="/privacy" className="hover:text-foreground transition-colors">Politique de confidentialité</Link>
        </div>
      </div>
    </div>
  );
}
