import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShelterLayout } from "@/components/ShelterLayout";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, User, Clock } from "lucide-react";
import { motion } from "framer-motion";

interface ActivityLogRow {
  id: string;
  employee_name: string;
  employee_role: string;
  description: string;
  action_type: string;
  created_at: string;
}

export default function ShelterActivityLog() {
  const { user } = useAuth();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["shelter-activity-log", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("shelter_activity_log")
        .select("id, employee_name, employee_role, description, action_type, created_at")
        .eq("shelter_user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      return (data ?? []) as ActivityLogRow[];
    },
    enabled: !!user,
  });

  return (
    <ShelterLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pt-14 pb-8 space-y-4">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Journal d'activité
        </h1>

        {isLoading ? (
          <div className="animate-pulse text-muted-foreground text-center py-8">Chargement...</div>
        ) : logs.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aucune activité enregistrée</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <Card key={log.id}>
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3 w-3 text-primary" />
                      <span className="text-xs font-medium text-foreground">{log.employee_name || "Système"}</span>
                      {log.employee_role && (
                        <span className="text-[10px] text-muted-foreground capitalize">({log.employee_role})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(log.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <p className="text-xs text-foreground">{log.description}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{log.action_type}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </ShelterLayout>
  );
}
