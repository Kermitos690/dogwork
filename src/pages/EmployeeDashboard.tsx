import { useAuth } from "@/hooks/useAuth";
import { useShelterEmployeeInfo } from "@/hooks/useCoach";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmployeeLayout } from "@/components/EmployeeLayout";
import { Card, CardContent } from "@/components/ui/card";
import { PawPrint, ClipboardList, MapPin, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function EmployeeDashboard() {
  const { user, signOut } = useAuth();
  const { data: empInfo } = useShelterEmployeeInfo();

  const shelterId = empInfo?.shelter_user_id;

  const { data: animalCount = 0 } = useQuery({
    queryKey: ["employee-animal-count", shelterId],
    queryFn: async () => {
      const { count } = await supabase
        .from("shelter_animals")
        .select("*", { count: "exact", head: true })
        .eq("user_id", shelterId!)
        .neq("status", "adopté");
      return count || 0;
    },
    enabled: !!shelterId,
  });

  const { data: todayActivities = 0 } = useQuery({
    queryKey: ["employee-today-activities", shelterId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { count } = await supabase
        .from("shelter_activity_log")
        .select("*", { count: "exact", head: true })
        .eq("shelter_user_id", shelterId!)
        .gte("created_at", today);
      return count || 0;
    },
    enabled: !!shelterId,
  });

  const { data: shelterProfile } = useQuery({
    queryKey: ["employee-shelter-profile", shelterId],
    queryFn: async () => {
      const { data } = await supabase
        .from("shelter_profiles")
        .select("name")
        .eq("user_id", shelterId!)
        .maybeSingle();
      return data;
    },
    enabled: !!shelterId,
  });

  return (
    <EmployeeLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pt-14 pb-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Bonjour, {empInfo?.name || "Employé"} 👋
            </h1>
            <p className="text-xs text-muted-foreground">
              {shelterProfile?.name || "Refuge"} — {empInfo?.role || "Soigneur"}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <PawPrint className="h-6 w-6 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{animalCount}</p>
              <p className="text-xs text-muted-foreground">Animaux présents</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <ClipboardList className="h-6 w-6 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{todayActivities}</p>
              <p className="text-xs text-muted-foreground">Activités aujourd'hui</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold text-foreground mb-2">Actions rapides</h2>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-auto py-3 flex flex-col gap-1" asChild>
                <a href="/employee/animals">
                  <PawPrint className="h-5 w-5" />
                  <span className="text-xs">Voir animaux</span>
                </a>
              </Button>
              <Button variant="outline" className="h-auto py-3 flex flex-col gap-1" asChild>
                <a href="/employee/activity">
                  <ClipboardList className="h-5 w-5" />
                  <span className="text-xs">Logger activité</span>
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </EmployeeLayout>
  );
}
