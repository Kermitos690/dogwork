import { AdminHub, AdminHubEmptyState } from "@/components/admin/AdminHub";
import { Building2, Users, Heart, ClipboardList } from "lucide-react";

export default function AdminShelters() {
  return (
    <AdminHub
      title="Refuges"
      subtitle="Gestion des refuges DogWork. Les refuges bénéficient de tarifs spécifiques (associations, partenariats) et leur onboarding est manuel et accompagné."
      icon={Building2}
      links={[
        {
          title: "Vue refuge (admin bypass)",
          desc: "Consulter le tableau de bord refuge avec les droits admin",
          icon: Heart,
          path: "/shelter",
        },
        {
          title: "Animaux de refuge",
          desc: "Liste complète des animaux suivis",
          icon: ClipboardList,
          path: "/shelter/animals",
        },
        {
          title: "Employés refuge",
          desc: "Gestion des comptes employés rattachés à un refuge",
          icon: Users,
          path: "/shelter/employees",
        },
      ]}
      footer={
        <AdminHubEmptyState
          title="Création / suspension de refuge"
          description="La création d'un refuge passe aujourd'hui par un onboarding accompagné côté équipe DogWork. Une console de provisioning sera ajoutée."
        />
      }
    />
  );
}
