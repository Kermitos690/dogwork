import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { EmployeeLayout } from "@/components/EmployeeLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PushNotificationCard } from "@/components/PushNotificationCard";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Settings, User, MessageSquare, LogOut, Languages, Bell } from "lucide-react";
import { motion } from "framer-motion";

export default function EmployeeSettings() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  return (
    <EmployeeLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pb-8 space-y-4">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Paramètres
        </h1>
        <p className="text-sm text-muted-foreground">
          Votre profil et vos préférences personnelles.
        </p>

        <Card className="cursor-pointer card-press" onClick={() => navigate("/employee/profile")}>
          <CardContent className="p-4 flex items-center gap-3">
            <User className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Mon profil</p>
              <p className="text-xs text-muted-foreground">Informations personnelles, refuge associé</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer card-press" onClick={() => navigate("/employee/notifications")}>
          <CardContent className="p-4 flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Notifications</p>
              <p className="text-xs text-muted-foreground">Catégories et préférences d'alertes</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Languages className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Langue</p>
                <p className="text-xs text-muted-foreground">Interface DogWork</p>
              </div>
            </div>
            <LanguageSwitcher />
          </CardContent>
        </Card>

        <Card className="cursor-pointer card-press" onClick={() => navigate("/employee/support")}>
          <CardContent className="p-4 flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Support</p>
              <p className="text-xs text-muted-foreground">Contacter l'équipe DogWork</p>
            </div>
          </CardContent>
        </Card>

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
    </EmployeeLayout>
  );
}
