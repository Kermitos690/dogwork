import { useNavigate } from "react-router-dom";
import { useActiveDog } from "@/hooks/useDogs";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, ClipboardList } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function Journal() {
  const navigate = useNavigate();
  const activeDog = useActiveDog();

  const { data: logs } = useQuery({
    queryKey: ["behavior_logs_all", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("behavior_logs")
        .select("*")
        .eq("dog_id", activeDog!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!activeDog,
  });

  if (!activeDog) {
    return (
      <AppLayout>
        <div className="pt-12 text-center text-muted-foreground">Ajoutez d'abord un chien.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="pt-6 pb-4 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Journal de bord</h1>
            <p className="text-sm text-muted-foreground">Le calme avant la réussite.</p>
          </div>
        </div>

        {(!logs || logs.length === 0) && (
          <Card>
            <CardContent className="p-6 text-center space-y-3">
              <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Aucune entrée pour le moment.</p>
              <p className="text-xs text-muted-foreground">Les suivis comportementaux apparaîtront ici.</p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {logs?.map((log, i) => (
            <Card
              key={log.id}
              className="card-press stagger-item"
              style={{ animationDelay: `${i * 40}ms` }}
              onClick={() => navigate(`/behavior/${log.day_id}`)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-foreground">Jour {log.day_id}</p>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), "d MMM", { locale: fr })}
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">Tension {log.tension_level}/5</Badge>
                  <Badge variant="secondary" className="text-xs">Réactivité {log.dog_reaction_level}/5</Badge>
                  <Badge variant="secondary" className="text-xs">{log.comfort_distance_meters}m</Badge>
                </div>
                {log.comments && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{log.comments}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
