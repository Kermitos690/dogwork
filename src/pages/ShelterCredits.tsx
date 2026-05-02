import { ShelterLayout } from "@/components/ShelterLayout";
import { RoleCreditsHub } from "@/components/RoleCreditsHub";

export default function ShelterCredits() {
  return (
    <ShelterLayout>
      <RoleCreditsHub
        title="Crédits IA Refuge"
        subtitle="Vos crédits IA aident à structurer les parcours d'adoption et le suivi comportemental des animaux du refuge."
        monthlyQuota={20}
        planLabel="Plan Shelter — 20 crédits inclus / mois"
        proUsages={[
          "Générer un plan d'adoption personnalisé pour un adoptant",
          "Préparer un résumé comportemental pour un futur foyer",
          "Construire un programme de stabilisation pour un animal sensible",
          "Suivre l'évolution post-adoption d'un animal placé",
          "Rédiger une fiche de présentation enrichie pour la mise à l'adoption",
        ]}
        backPath="/shelter/dashboard"
      />
    </ShelterLayout>
  );
}
