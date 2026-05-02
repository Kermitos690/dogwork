import { AdminHub, AdminHubEmptyState } from "@/components/admin/AdminHub";
import { ListChecks, Dumbbell, Sparkles } from "lucide-react";

export default function AdminPrograms() {
  return (
    <AdminHub
      title="Programmes d'entraînement"
      subtitle="Les programmes DogWork combinent objectifs, exercices et séances. Le générateur s'appuie sur le catalogue d'exercices enrichi et les règles métier (anti-répétition, focus, récupération)."
      icon={ListChecks}
      links={[
        {
          title: "Catalogue d'exercices",
          desc: "Source utilisée par le générateur de plans",
          icon: Dumbbell,
          path: "/admin/exercises",
        },
        {
          title: "Économie IA & crédits",
          desc: "Coûts du générateur de plans et autres outils IA",
          icon: Sparkles,
          path: "/admin/ai-economy",
        },
      ]}
      footer={
        <AdminHubEmptyState
          title="Édition de programmes type"
          description="L'édition de gabarits de programmes (durée, focus, objectifs cibles) sera ajoutée. Aujourd'hui, le générateur applique des règles codées côté lib/planGenerator."
        />
      }
    />
  );
}
