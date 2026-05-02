import { AdminHub, AdminHubEmptyState } from "@/components/admin/AdminHub";
import { ShoppingBag, GraduationCap, BarChart3, ShieldCheck, CreditCard } from "lucide-react";
import { isDevelopment } from "@/lib/env";

export default function AdminMarketplace() {
  return (
    <AdminHub
      title="Marketplace"
      subtitle="Cours payants, paiements Stripe Connect, commissions plateforme (15.8%) et remboursements (92% utilisateur / 8% plateforme)."
      icon={ShoppingBag}
      links={[
        {
          title: "Conformité éducateurs",
          desc: "Vérifier les coachs autorisés à vendre",
          icon: ShieldCheck,
          path: "/admin/compliance",
        },
        {
          title: "Stripe — opérations",
          desc: "Paiements, remboursements, transferts Connect",
          icon: CreditCard,
          path: "/admin/stripe",
        },
        {
          title: "Vérification Stripe",
          desc: "État des comptes Connect et webhooks marketplace",
          icon: ShieldCheck,
          path: "/admin/stripe/verify",
        },
        {
          title: "Treasury",
          desc: "Trésorerie plateforme et payouts",
          icon: BarChart3,
          path: "/admin/treasury",
        },
        {
          title: "Coachs & cours",
          desc: "Cours publiés et état commercial",
          icon: GraduationCap,
          path: "/admin/educators",
        },
        ...(isDevelopment
          ? [{
              title: "Audit P0 marketplace (dev)",
              desc: "Vérification end-to-end du flux marketplace en environnement de test",
              icon: ShieldCheck,
              path: "/admin/test-marketplace-p0",
              badge: "DEV",
            }]
          : []),
      ]}
      footer={
        <AdminHubEmptyState
          title="Catalogue cours admin"
          description="L'édition / dé-publication directe d'un cours depuis l'admin sera ajoutée. Aujourd'hui, les coachs gèrent leurs cours et l'admin valide via la conformité."
        />
      }
    />
  );
}
