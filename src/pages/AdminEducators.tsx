import { AdminHub, AdminHubEmptyState } from "@/components/admin/AdminHub";
import { GraduationCap, ShieldCheck, CreditCard, Gift } from "lucide-react";

export default function AdminEducators() {
  return (
    <AdminHub
      title="Éducateurs & coachs"
      subtitle="Suivi des coachs DogWork : conformité, abonnements, marketplace et parrainages."
      icon={GraduationCap}
      links={[
        {
          title: "Conformité & vérifications",
          desc: "Dossiers en attente, charte, documents légaux",
          icon: ShieldCheck,
          path: "/admin/compliance",
        },
        {
          title: "Abonnements éducateurs",
          desc: "Plans actifs, payouts, Stripe Connect",
          icon: CreditCard,
          path: "/admin/subscriptions",
        },
        {
          title: "Marketplace & commissions",
          desc: "Cours publiés, ventes, frais 15.8%",
          icon: Gift,
          path: "/admin/marketplace",
        },
      ]}
      footer={
        <AdminHubEmptyState
          title="Console coach unifiée"
          description="La fiche coach détaillée (revenus, NPS clients, alertes conformité) sera regroupée ici dans une prochaine version."
        />
      }
    />
  );
}
