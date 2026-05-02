import { AdminHub, AdminHubEmptyState } from "@/components/admin/AdminHub";
import { UserCog, Shield, GraduationCap, Building2, Users } from "lucide-react";

export default function AdminRoles() {
  return (
    <AdminHub
      title="Rôles & permissions"
      subtitle="Cartographie des rôles DogWork et des outils pour les administrer. La gestion fine des rôles passe aujourd'hui par les pages métier ci-dessous."
      icon={UserCog}
      links={[
        {
          title: "Refuges",
          desc: "Créer un refuge, attribuer un responsable, gérer les employés rattachés",
          icon: Building2,
          path: "/admin/shelters",
        },
        {
          title: "Éducateurs / coachs",
          desc: "Vérifier les coachs, voir leurs abonnements et leur conformité",
          icon: GraduationCap,
          path: "/admin/educators",
        },
        {
          title: "Conformité marketplace",
          desc: "Validation des dossiers professionnels (Stripe Connect, charte, documents)",
          icon: Shield,
          path: "/admin/compliance",
        },
        {
          title: "Comptes & abonnements",
          desc: "Voir l'état commercial des utilisateurs",
          icon: Users,
          path: "/admin/subscriptions",
        },
      ]}
      footer={
        <AdminHubEmptyState
          title="Attribution directe de rôles"
          description="L'attribution / révocation directe d'un rôle (Admin, Coach, Refuge) depuis cette page sera ajoutée dans une prochaine version. Les rôles sont actuellement gérés via la table user_roles et les outils Refuge/Educateurs ci-dessus."
        />
      }
    />
  );
}
