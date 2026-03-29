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
          <p className="text-sm text-muted-foreground">Entrée en vigueur : 29 mars 2026</p>
        </div>

        <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none space-y-6">

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">1. Éditeur et exploitant</h2>
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm space-y-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Nom commercial</p>
                <p className="text-foreground font-semibold">DogWork@Home</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Raison sociale</p>
                <p className="text-foreground">DogWork@Home by Teba</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Adresse postale</p>
                <p className="text-foreground">Route de Berne 222, 1066 Epalinges</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">E-mail de contact</p>
                <p className="text-foreground">Teba.gaetan@gmail.com</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Téléphone</p>
                <p className="text-foreground">+41 78 633 67 77</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">2. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pour toute demande relative au service, vous pouvez contacter DogWork :
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>à l'adresse e-mail indiquée ci-dessus ;</li>
              <li>ou via la fonctionnalité de support intégrée à l'application, lorsqu'elle est disponible.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">3. Hébergement et services techniques</h2>
            <p className="text-muted-foreground leading-relaxed">
              DogWork s'appuie sur différents prestataires techniques pour l'hébergement, la base de données, l'authentification, l'envoi d'e-mails et le traitement des paiements, notamment :
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Lovable</strong> pour certains aspects liés à l'application ;</li>
              <li><strong className="text-foreground">Supabase</strong> pour le backend, la base de données et l'authentification ;</li>
              <li><strong className="text-foreground">Stripe</strong> pour le traitement des paiements et abonnements.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">4. Propriété intellectuelle</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'ensemble des éléments composant DogWork, notamment les textes, visuels, logos, interfaces, bibliothèques d'exercices, contenus et éléments logiciels, est protégé par le droit applicable de la propriété intellectuelle.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Toute utilisation non autorisée est interdite.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">5. Protection des données</h2>
            <p className="text-muted-foreground leading-relaxed">
              Le traitement des données personnelles est décrit dans la <Link to="/privacy" className="text-primary hover:underline">Politique de confidentialité</Link> de DogWork.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">6. Conditions applicables</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'utilisation de DogWork est soumise aux <Link to="/terms" className="text-primary hover:underline">Conditions générales d'utilisation et d'abonnement</Link>.
            </p>
          </section>

        </div>

        <div className="border-t border-border pt-6 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground transition-colors">Conditions générales</Link>
          <Link to="/privacy" className="hover:text-foreground transition-colors">Politique de confidentialité</Link>
        </div>
      </div>
    </div>
  );
}
