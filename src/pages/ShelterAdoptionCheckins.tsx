import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ShelterLayout } from "@/components/ShelterLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Heart, CheckCircle2, Clock, AlertCircle, PawPrint, Camera, Calendar
} from "lucide-react";
import { format, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";

type Checkin = {
  id: string;
  adopter_user_id: string;
  animal_id: string;
  shelter_user_id: string;
  checkin_week: number;
  due_date: string;
  submitted_at: string | null;
  photos: string[];
  video_url: string | null;
  general_mood: string | null;
  health_status: string | null;
  behavior_notes: string | null;
  highlights: string | null;
  concerns: string | null;
};

const MOOD_LABELS: Record<string, string> = {
  excellent: "🌟 Excellent",
  bien: "😊 Bien",
  correct: "😐 Correct",
  difficile: "😟 Difficile",
  preoccupant: "😰 Préoccupant",
};

export default function ShelterAdoptionCheckins() {
  const { user } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: checkins, isLoading } = useQuery({
    queryKey: ["shelter_adoption_checkins", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("adoption_checkins")
        .select("*")
        .eq("shelter_user_id", user!.id)
        .order("due_date", { ascending: false });
      if (error) throw error;
      return data as Checkin[];
    },
    enabled: !!user,
  });

  // Fetch animal names
  const { data: animals } = useQuery({
    queryKey: ["shelter_animals_names", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shelter_animals")
        .select("id, name")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Map(data.map(a => [a.id, a.name]));
    },
    enabled: !!user,
  });

  // Fetch adopter display names
  const { data: adopters } = useQuery({
    queryKey: ["adopter_profiles", checkins?.map(c => c.adopter_user_id)],
    queryFn: async () => {
      const ids = [...new Set(checkins!.map(c => c.adopter_user_id))];
      if (ids.length === 0) return new Map<string, string>();
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", ids);
      if (error) throw error;
      return new Map(data.map(p => [p.user_id, p.display_name || "Adoptant"]));
    },
    enabled: !!checkins && checkins.length > 0,
  });

  const submitted = checkins?.filter(c => c.submitted_at) || [];
  const pending = checkins?.filter(c => !c.submitted_at) || [];
  const overdue = pending.filter(c => isPast(new Date(c.due_date)));

  return (
    <ShelterLayout>
      <div className="space-y-6 pb-24">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Heart className="h-6 w-6 text-rose-500" />
            Suivi post-adoption
          </h1>
          <p className="text-sm text-muted-foreground">
            Suivez les nouvelles de vos anciens pensionnaires.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{submitted.length}</p>
            <p className="text-xs text-muted-foreground">Reçus</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{pending.length}</p>
            <p className="text-xs text-muted-foreground">En attente</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-destructive">{overdue.length}</p>
            <p className="text-xs text-muted-foreground">En retard</p>
          </Card>
        </div>

        {/* Submitted check-ins */}
        {submitted.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Bilans reçus
            </h2>
            {submitted.map(checkin => {
              const isExpanded = expandedId === checkin.id;
              return (
                <Card
                  key={checkin.id}
                  className="p-4 cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : checkin.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <PawPrint className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{animals?.get(checkin.animal_id) || "Animal"}</span>
                      <Badge variant="secondary" className="text-xs">S{checkin.checkin_week}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(checkin.submitted_at!), "d MMM yyyy", { locale: fr })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Par {adopters?.get(checkin.adopter_user_id) || "Adoptant"}</span>
                    {checkin.general_mood && (
                      <span className="px-2 py-0.5 rounded-full bg-muted text-foreground">
                        {MOOD_LABELS[checkin.general_mood] || checkin.general_mood}
                      </span>
                    )}
                    {checkin.photos?.length > 0 && (
                      <span className="flex items-center gap-1"><Camera className="h-3 w-3" />{checkin.photos.length}</span>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-3 pt-3 border-t border-border">
                      {checkin.health_status && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Santé</p>
                          <p className="text-sm">{checkin.health_status}</p>
                        </div>
                      )}
                      {checkin.behavior_notes && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Comportement</p>
                          <p className="text-sm">{checkin.behavior_notes}</p>
                        </div>
                      )}
                      {checkin.highlights && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Moments forts</p>
                          <p className="text-sm">{checkin.highlights}</p>
                        </div>
                      )}
                      {checkin.concerns && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Préoccupations</p>
                          <p className="text-sm text-destructive">{checkin.concerns}</p>
                        </div>
                      )}
                      {checkin.photos?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {checkin.photos.map((url, i) => (
                            <img key={i} src={url} alt="" className="w-20 h-20 rounded-xl object-cover border" />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Overdue */}
        {overdue.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" /> En retard
            </h2>
            {overdue.map(checkin => (
              <Card key={checkin.id} className="p-4 bg-destructive/5 border-destructive/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PawPrint className="h-4 w-4 text-destructive" />
                    <span className="font-medium text-sm">{animals?.get(checkin.animal_id) || "Animal"}</span>
                    <Badge variant="destructive" className="text-xs">S{checkin.checkin_week}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Prévu le {format(new Date(checkin.due_date), "d MMM", { locale: fr })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Adoptant : {adopters?.get(checkin.adopter_user_id) || "—"}
                </p>
              </Card>
            ))}
          </div>
        )}

        {checkins?.length === 0 && (
          <div className="text-center py-16">
            <Heart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Aucun suivi post-adoption en cours.</p>
          </div>
        )}
      </div>
    </ShelterLayout>
  );
}
