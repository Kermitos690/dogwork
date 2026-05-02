import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { CoachLayout } from "@/components/CoachLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PushNotificationCard } from "@/components/PushNotificationCard";
import {
  Settings, User, CreditCard, Coins, ShieldCheck, FileText, Globe,
  GraduationCap, Gift, MessageSquare, LogOut, BookOpen, Calendar
} from "lucide-react";
import { motion } from "framer-motion";

export default function CoachSettings() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const items: Array<{ title: string; desc: string; icon: any; path: string }> = [
    { title: "Mon profil & marque", desc: "Bio, spécialités, photo, ma page publique", icon: User, path: "/coach/profile" },
    { title: "Ma page publique", desc: "Aperçu et gestion de votre vitrine", icon: Globe, path: "/ma-page-publique" },
    { title: "Mes cours & marketplace", desc: "Créer, publier, suivre vos cours", icon: GraduationCap, path: "/coach/courses" },
    { title: "Calendrier & disponibilités", desc: "Réservations clients et créneaux", icon: Calendar, path: "/coach/calendar" },
    { title: "Bibliothèque coach", desc: "Vos exercices et contenus pédagogiques", icon: BookOpen, path: "/coach/exercises" },
    { title: "Abonnement éducateur", desc: "Plan en cours, facturation, Stripe Connect", icon: CreditCard, path: "/coach/subscription" },
    { title: "Crédits IA", desc: "Solde, packs, historique d'utilisation", icon: Coins, path: "/coach/credits" },
    { title: "Conformité", desc: "Charte, documents légaux, vérification", icon: ShieldCheck, path: "/coach/compliance" },
    { title: "Charte coach DogWork", desc: "Engagements pédagogiques et déontologiques", icon: FileText, path: "/legal/charte-coach" },
    { title: "Parrainages", desc: "Inviter des collègues, partenaires refuges", icon: Gift, path: "/coach/referrals" },
    { title: "Support & feedback", desc: "Contacter l'équipe DogWork", icon: MessageSquare, path: "/coach/support" },
  ];

  return (
    <CoachLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pb-8 space-y-4">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Paramètres professionnels
        </h1>
        <p className="text-sm text-muted-foreground">
          Tout votre espace coach au même endroit. Configurez votre profil, vos offres, votre conformité et vos préférences.
        </p>

        {items.map((item) => (
          <Card key={item.path} className="cursor-pointer card-press" onClick={() => navigate(item.path)}>
            <CardContent className="p-4 flex items-center gap-3">
              <item.icon className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}

        <PushNotificationCard />

        <Button
          variant="destructive"
          className="w-full gap-2 mt-6"
          onClick={async () => {
            await signOut();
            navigate("/");
          }}
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </Button>
      </motion.div>
    </CoachLayout>
  );
}
