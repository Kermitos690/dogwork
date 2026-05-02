import { AdminHub, AdminHubEmptyState } from "@/components/admin/AdminHub";
import { ScrollText, Mail, Bell, ShieldCheck, FlaskConical } from "lucide-react";
import { isDevelopment } from "@/lib/env";

export default function AdminLogs() {
  return (
    <AdminHub
      title="Journaux & événements"
      subtitle="Accès aux journaux disponibles. Les logs applicatifs détaillés (edge functions, erreurs runtime) restent accessibles côté backend."
      icon={ScrollText}
      links={[
        {
          title: "Diagnostics email",
          desc: "Historique des envois, rebonds Resend, statuts de délivrabilité",
          icon: Mail,
          path: "/admin/email-diagnostics",
        },
        {
          title: "Push status",
          desc: "Souscriptions web push actives par utilisateur",
          icon: Bell,
          path: "/admin/push-status",
        },
        {
          title: "Go-live check",
          desc: "Audit de configuration prod (DNS, Stripe Live, secrets)",
          icon: ShieldCheck,
          path: "/admin/go-live-check",
        },
        ...(isDevelopment
          ? [{
              title: "Diagnostic webhook (dev)",
              desc: "Outil interne — réservé à l'environnement de test",
              icon: FlaskConical,
              path: "/admin/test-webhook",
              badge: "DEV",
            }]
          : []),
      ]}
      footer={
        <AdminHubEmptyState
          title="Console logs unifiée"
          description="Une vue agrégée des logs d'edge functions, erreurs Sentry et événements Stripe sera ajoutée. Pour l'instant, consultez les journaux Supabase et Stripe directement."
        />
      }
    />
  );
}
