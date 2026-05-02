import { AdminHub, AdminHubEmptyState } from "@/components/admin/AdminHub";
import { Settings, LayoutGrid, Coins, Bell, ShieldCheck } from "lucide-react";

export default function AdminConfig() {
  return (
    <AdminHub
      title="Configuration plateforme"
      subtitle="Réglages globaux DogWork : modules commerciaux, économie IA, notifications et préférences admin."
      icon={Settings}
      links={[
        {
          title: "Modules commerciaux",
          desc: "Activer / désactiver les modules add-on Stripe",
          icon: LayoutGrid,
          path: "/admin/modules",
        },
        {
          title: "Économie IA & crédits",
          desc: "Quotas mensuels, packs, prix, marges",
          icon: Coins,
          path: "/admin/ai-economy",
        },
        {
          title: "Préférences admin",
          desc: "Vos catégories de notifications et alertes système",
          icon: Bell,
          path: "/admin/preferences",
        },
        {
          title: "Conformité marketplace",
          desc: "Règles de validation des coachs et refuges",
          icon: ShieldCheck,
          path: "/admin/compliance",
        },
      ]}
      footer={
        <AdminHubEmptyState
          title="Feature flags & maintenance"
          description="Une console feature-flags et un mode maintenance global seront ajoutés ici. Aujourd'hui, ces réglages se font côté base et secrets."
        />
      }
    />
  );
}
