import { AdminHub, AdminHubEmptyState } from "@/components/admin/AdminHub";
import { Users, CreditCard, Shield, MessageSquare, UserCog, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminUsers() {
  const navigate = useNavigate();
  return (
    <AdminHub
      title="Utilisateurs"
      subtitle="Gestion des comptes et de leur état commercial. Une vraie console utilisateurs unifiée arrivera bientôt — en attendant, accédez ici aux outils existants."
      icon={Users}
      links={[
        {
          title: "Comptes & abonnements",
          desc: "Liste des utilisateurs payants, plans actifs, overrides commerciaux",
          icon: CreditCard,
          path: "/admin/subscriptions",
        },
        {
          title: "Rôles & permissions",
          desc: "Attribution Admin, Coach, Refuge, Employé refuge",
          icon: UserCog,
          path: "/admin/roles",
        },
        {
          title: "Conformité éducateurs",
          desc: "Vérifier les coachs et leur dossier marketplace",
          icon: Shield,
          path: "/admin/compliance",
        },
        {
          title: "Tickets support",
          desc: "Demandes utilisateurs, suivi et réponses",
          icon: MessageSquare,
          path: "/admin/tickets",
        },
        {
          title: "Diagnostics email",
          desc: "Délivrabilité, rebonds, abonnements aux notifications",
          icon: Mail,
          path: "/admin/email-diagnostics",
        },
      ]}
      footer={
        <AdminHubEmptyState
          title="Console utilisateurs unifiée"
          description="Recherche par email, suspension, force-logout et fusion de comptes seront regroupés ici dans une prochaine itération."
          action={{ label: "Voir les abonnements", onClick: () => navigate("/admin/subscriptions") }}
        />
      }
    />
  );
}
