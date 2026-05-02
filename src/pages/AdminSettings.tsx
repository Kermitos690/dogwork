import { AdminHub, AdminHubEmptyState } from "@/components/admin/AdminHub";
import { Settings, Bell, LayoutGrid, ShieldCheck, ClipboardList, ScrollText } from "lucide-react";

export default function AdminSettings() {
  return (
    <AdminHub
      title="Paramètres admin"
      subtitle="Vos préférences personnelles d'administrateur et l'accès aux configurations plateforme."
      icon={Settings}
      links={[
        {
          title: "Mes notifications admin",
          desc: "Catégories d'alertes (Stripe, support, erreurs système, inscriptions)",
          icon: Bell,
          path: "/admin/preferences",
        },
        {
          title: "Configuration plateforme",
          desc: "Modules, économie IA, conformité",
          icon: LayoutGrid,
          path: "/admin/config",
        },
        {
          title: "Go-live check",
          desc: "Audit de configuration production",
          icon: ShieldCheck,
          path: "/admin/go-live-check",
        },
        {
          title: "Launch checklist",
          desc: "Suivi des étapes de mise en production",
          icon: ClipboardList,
          path: "/admin/launch",
        },
        {
          title: "Journaux & événements",
          desc: "Diagnostics email, push, audits",
          icon: ScrollText,
          path: "/admin/logs",
        },
      ]}
      footer={
        <AdminHubEmptyState
          title="Préférences interface admin"
          description="Le choix du thème admin et la personnalisation du tableau de bord seront ajoutés ici."
        />
      }
    />
  );
}
