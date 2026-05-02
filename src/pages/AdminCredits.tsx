import { AdminHub } from "@/components/admin/AdminHub";
import { Coins, Sparkles, ShoppingBag, BarChart3 } from "lucide-react";

export default function AdminCredits() {
  return (
    <AdminHub
      title="Crédits IA — administration"
      subtitle="Pilotage de l'économie IA DogWork : quotas mensuels par plan, packs Stripe disponibles et consommation globale."
      icon={Coins}
      links={[
        {
          title: "Économie IA & crédits",
          desc: "Quotas, packs, marges, KPI consommation",
          icon: Sparkles,
          path: "/admin/ai-economy",
        },
        {
          title: "Treasury",
          desc: "Revenus packs crédits et abonnements",
          icon: BarChart3,
          path: "/admin/treasury",
        },
        {
          title: "Boutique utilisateur",
          desc: "Aperçu des packs proposés aux utilisateurs",
          icon: ShoppingBag,
          path: "/shop",
        },
      ]}
    />
  );
}
