import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Shield, CheckCircle2, Circle, AlertTriangle,
  Rocket, CreditCard, Globe, Mail, Lock, Server, ExternalLink,
} from "lucide-react";
import { motion } from "framer-motion";

type ItemStatus = "pending" | "ready" | "confirmed";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  priority: "critical" | "important" | "secondary";
  manual: boolean;
  howTo?: string;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: "hibp",
    title: "Activer HIBP Password Check",
    description: "Protection contre les mots de passe compromis lors de l'inscription et du changement de mot de passe.",
    icon: Lock,
    priority: "critical",
    manual: true,
    howTo: "Lovable Cloud → Users → Auth Settings (⚙️) → Email → activer « Password HIBP Check ».",
  },
  {
    id: "stripe_connect",
    title: "Activer Stripe Connect",
    description: "Module Connect nécessaire pour l'onboarding éducateur et les paiements de cours.",
    icon: CreditCard,
    priority: "critical",
    manual: true,
    howTo: "Dashboard Stripe → Connect → Activer. Configurer les conditions légales de la plateforme.",
  },
  {
    id: "env_vite",
    title: "Définir VITE_ENVIRONMENT=production",
    description: "Masque les boutons de login dev côté frontend.",
    icon: Server,
    priority: "critical",
    manual: true,
    howTo: "Paramètres du déploiement → Variables d'environnement → ajouter VITE_ENVIRONMENT = production.",
  },
  {
    id: "env_edge",
    title: "Définir ENVIRONMENT=production (secret)",
    description: "Bloque la fonction dev-login côté backend Edge Functions.",
    icon: Shield,
    priority: "critical",
    manual: true,
    howTo: "Lovable Cloud → Secrets → ajouter ENVIRONMENT = production.",
  },
  {
    id: "domain",
    title: "Configurer un domaine personnalisé",
    description: "Domaine professionnel pour le lancement (ex: app.dogwork.ch).",
    icon: Globe,
    priority: "secondary",
    manual: true,
    howTo: "Project Settings → Domains → Ajouter votre domaine et configurer les DNS.",
  },
  {
    id: "resend_domain",
    title: "Vérifier le domaine Resend",
    description: "Emails transactionnels envoyés depuis votre propre domaine vérifié.",
    icon: Mail,
    priority: "secondary",
    manual: true,
    howTo: "Dashboard Resend → Domains → Ajouter et vérifier le domaine via les enregistrements DNS.",
  },
];

const STORAGE_KEY = "dogwork_launch_checklist";

function loadStatuses(): Record<string, ItemStatus> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStatuses(s: Record<string, ItemStatus>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

const statusMeta: Record<ItemStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "À faire", color: "bg-amber-500/15 text-amber-500 border-amber-500/30", icon: Circle },
  ready: { label: "Prêt", color: "bg-blue-500/15 text-blue-500 border-blue-500/30", icon: AlertTriangle },
  confirmed: { label: "Confirmé", color: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", icon: CheckCircle2 },
};

const priorityColors: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive",
  important: "bg-amber-500/15 text-amber-500",
  secondary: "bg-muted text-muted-foreground",
};

export default function AdminLaunchChecklist() {
  const navigate = useNavigate();
  const [statuses, setStatuses] = useState<Record<string, ItemStatus>>(loadStatuses);

  const cycleStatus = (id: string) => {
    const order: ItemStatus[] = ["pending", "ready", "confirmed"];
    const current = statuses[id] || "pending";
    const next = order[(order.indexOf(current) + 1) % order.length];
    const updated = { ...statuses, [id]: next };
    setStatuses(updated);
    saveStatuses(updated);
  };

  const confirmedCount = CHECKLIST_ITEMS.filter(i => (statuses[i.id] || "pending") === "confirmed").length;
  const criticalConfirmed = CHECKLIST_ITEMS.filter(i => i.priority === "critical" && (statuses[i.id] || "pending") === "confirmed").length;
  const criticalTotal = CHECKLIST_ITEMS.filter(i => i.priority === "critical").length;
  const allCriticalDone = criticalConfirmed === criticalTotal;

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pt-6 pb-8 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </motion.button>
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" /> Checklist de lancement
            </h1>
            <p className="text-[10px] text-muted-foreground">
              {confirmedCount}/{CHECKLIST_ITEMS.length} terminés · {criticalConfirmed}/{criticalTotal} critiques
            </p>
          </div>
        </div>

        {/* Overall status */}
        <Card className={`border-2 ${allCriticalDone ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
          <CardContent className="p-4 flex items-center gap-3">
            {allCriticalDone ? (
              <>
                <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-foreground">Prêt pour le lancement 🚀</p>
                  <p className="text-xs text-muted-foreground">Tous les points critiques sont confirmés.</p>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-foreground">Actions requises</p>
                  <p className="text-xs text-muted-foreground">
                    {criticalTotal - criticalConfirmed} point(s) critique(s) restant(s) avant la mise en production.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Checklist items */}
        <div className="space-y-2.5">
          {CHECKLIST_ITEMS.map((item, i) => {
            const status = statuses[item.id] || "pending";
            const meta = statusMeta[status];
            const StatusIcon = meta.icon;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className={`transition-all ${status === "confirmed" ? "opacity-70" : ""}`}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start gap-3">
                      <button onClick={() => cycleStatus(item.id)} className="mt-0.5 shrink-0">
                        <StatusIcon className={`h-5 w-5 transition-colors ${
                          status === "confirmed" ? "text-emerald-500" :
                          status === "ready" ? "text-blue-500" :
                          "text-muted-foreground"
                        }`} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm font-semibold ${status === "confirmed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {item.title}
                          </p>
                          <Badge className={`text-[8px] px-1.5 py-0 border-0 ${priorityColors[item.priority]}`}>
                            {item.priority === "critical" ? "CRITIQUE" : item.priority === "important" ? "IMPORTANT" : "OPTIONNEL"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                        {item.howTo && (
                          <div className="mt-2 p-2.5 rounded-lg bg-secondary/50 border border-border/50">
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              <span className="font-semibold text-foreground">Comment : </span>
                              {item.howTo}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Badge className={`text-[9px] border ${meta.color}`}>
                        {meta.label}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Info footer */}
        <Card className="bg-secondary/30 border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">💡 Astuce :</strong> Cliquez sur l'icône de statut pour faire défiler :
              <span className="text-amber-500"> À faire</span> →
              <span className="text-blue-500"> Prêt</span> →
              <span className="text-emerald-500"> Confirmé</span>.
              Les points marqués « CRITIQUE » doivent être confirmés avant tout lancement public.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </AppLayout>
  );
}
