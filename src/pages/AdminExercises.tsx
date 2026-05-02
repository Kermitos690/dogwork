import { AdminHub, AdminHubEmptyState } from "@/components/admin/AdminHub";
import { Dumbbell, BookOpen, ListChecks } from "lucide-react";

export default function AdminExercises() {
  return (
    <AdminHub
      title="Catalogue d'exercices"
      subtitle="Le catalogue DogWork compte aujourd'hui 480+ exercices enrichis. Vous pouvez les consulter via la bibliothèque utilisateur. La régénération par IA est volontairement désactivée pour préserver l'intégrité du catalogue."
      icon={Dumbbell}
      links={[
        {
          title: "Bibliothèque publique",
          desc: "Aperçu utilisateur du catalogue d'exercices",
          icon: BookOpen,
          path: "/exercises",
        },
        {
          title: "Programmes & plans",
          desc: "Gabarits de programmes utilisés par le générateur",
          icon: ListChecks,
          path: "/admin/programs",
        },
      ]}
      footer={
        <AdminHubEmptyState
          title="Édition d'exercices côté admin"
          description="L'édition individuelle d'un exercice (titre, étapes, médias) n'est pas encore exposée dans l'interface. Toute modification se fait actuellement via le fichier source exercise-catalog.json puis la pipeline de synchronisation post-publish."
        />
      }
    />
  );
}
