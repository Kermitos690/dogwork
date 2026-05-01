import { useAuth } from "@/hooks/useAuth";
import { useShelterEmployeeInfo } from "@/hooks/useCoach";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmployeeLayout } from "@/components/EmployeeLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PushNotificationCard } from "@/components/PushNotificationCard";
import { User, LogOut, Mail, Phone, Briefcase } from "lucide-react";
import { motion } from "framer-motion";

export default function EmployeeProfile() {
  const { user, signOut } = useAuth();
  const { data: empInfo } = useShelterEmployeeInfo();

  const { data: shelterProfile } = useQuery({
    queryKey: ["employee-shelter-profile", empInfo?.shelter_user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("shelter_profiles")
        .select("name, address, phone")
        .eq("user_id", empInfo!.shelter_user_id)
        .maybeSingle();
      return data;
    },
    enabled: !!empInfo?.shelter_user_id,
  });

  return (
    <EmployeeLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pb-8 space-y-4">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <User className="h-5 w-5 text-primary" /> Mon profil
        </h1>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                {empInfo?.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <p className="font-medium text-foreground">{empInfo?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{empInfo?.role}</p>
                {empInfo?.job_title && <p className="text-xs text-muted-foreground">{empInfo.job_title}</p>}
              </div>
            </div>

            {empInfo?.email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" /> {empInfo.email}
              </div>
            )}
            {empInfo?.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" /> {empInfo.phone}
              </div>
            )}
          </CardContent>
        </Card>

        {shelterProfile && (
          <Card>
            <CardContent className="p-4">
              <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <Briefcase className="h-4 w-4" /> Mon refuge
              </h2>
              <p className="text-sm text-foreground">{shelterProfile.name}</p>
              {shelterProfile.address && <p className="text-xs text-muted-foreground">{shelterProfile.address}</p>}
              {shelterProfile.phone && <p className="text-xs text-muted-foreground">{shelterProfile.phone}</p>}
            </CardContent>
          </Card>
        )}

        <PushNotificationCard />

        <Button variant="outline" className="w-full gap-2 text-destructive" onClick={() => signOut()}>
          <LogOut className="h-4 w-4" /> Se déconnecter
        </Button>
      </motion.div>
    </EmployeeLayout>
  );
}
