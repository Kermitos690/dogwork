import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ShelterLayout } from "@/components/ShelterLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Building2, Users, LogOut, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

export default function ShelterSettings() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <ShelterLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pt-14 pb-8 space-y-4">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Paramètres
        </h1>

        <Card className="cursor-pointer card-press" onClick={() => navigate("/shelter/profile")}>
          <CardContent className="p-4 flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Profil du refuge</p>
              <p className="text-xs text-muted-foreground">Nom, adresse, téléphone, description</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer card-press" onClick={() => navigate("/shelter/employees")}>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Employés</p>
              <p className="text-xs text-muted-foreground">Gérer les profils d'employés du refuge</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer card-press" onClick={() => navigate("/shelter/messages")}>
          <CardContent className="p-4 flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Messages</p>
              <p className="text-xs text-muted-foreground">Contacter l'administrateur</p>
            </div>
          </CardContent>
        </Card>

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
    </ShelterLayout>
  );
}
