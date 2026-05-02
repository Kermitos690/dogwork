import { CoachLayout } from "@/components/CoachLayout";
import { RoleCreditsHub } from "@/components/RoleCreditsHub";

export default function CoachCredits() {
  return (
    <CoachLayout>
      <RoleCreditsHub
        title="Crédits IA Coach"
        subtitle="Vos crédits IA alimentent les outils professionnels DogWork : analyses clients, plans personnalisés, contenus pédagogiques."
        monthlyQuota={30}
        planLabel="Plan Educator — 30 crédits inclus / mois"
        proUsages={[
          "Générer un plan personnalisé pour un client",
          "Rédiger un résumé structuré d'une séance ou d'un journal",
          "Préparer un contenu pédagogique pour vos cours",
          "Analyser la progression d'un chien suivi",
          "Adapter un exercice à un cas comportemental sensible",
        ]}
        backPath="/coach/dashboard"
      />
    </CoachLayout>
  );
}
