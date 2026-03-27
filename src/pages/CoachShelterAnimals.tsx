import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CoachLayout } from "@/components/CoachLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PawPrint, Search, Building2, ClipboardCheck } from "lucide-react";
import { motion } from "framer-motion";

const statusColors: Record<string, string> = {
  "arrivée": "bg-blue-500/20 text-blue-400",
  "quarantaine": "bg-amber-500/20 text-amber-400",
  "soins": "bg-orange-500/20 text-orange-400",
  "adoptable": "bg-emerald-500/20 text-emerald-400",
  "adopté": "bg-primary/20 text-primary",
};

export default function CoachShelterAnimals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  // Get shelters linked to this coach
  const { data: shelterLinks = [] } = useQuery({
    queryKey: ["coach-shelter-links", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("shelter_coaches" as any)
        .select("*")
        .eq("coach_user_id", user!.id)
        .eq("status", "active");
      return (data as any[]) || [];
    },
    enabled: !!user,
  });

  const shelterIds = shelterLinks.map((l: any) => l.shelter_user_id);

  // Get shelter profiles
  const { data: shelterProfiles = [] } = useQuery({
    queryKey: ["coach-shelter-profiles", shelterIds],
    queryFn: async () => {
      if (!shelterIds.length) return [];
      const { data } = await supabase
        .from("shelter_profiles" as any)
        .select("*")
        .in("user_id", shelterIds);
      return (data as any[]) || [];
    },
    enabled: shelterIds.length > 0,
  });

  // Get animals from linked shelters
  const { data: animals = [], isLoading } = useQuery({
    queryKey: ["coach-shelter-animals", shelterIds],
    queryFn: async () => {
      if (!shelterIds.length) return [];
      const { data } = await supabase
        .from("shelter_animals_safe")
        .select("*")
        .in("user_id", shelterIds)
        .order("created_at", { ascending: false });
      return (data as any[]) || [];
    },
    enabled: shelterIds.length > 0,
  });

  // Get existing evaluations count per animal
  const { data: evalCounts = {} } = useQuery({
    queryKey: ["coach-shelter-eval-counts", user?.id],
    queryFn: async () => {
      const animalIds = animals.map((a: any) => a.id);
      if (!animalIds.length) return {};
      const { data } = await supabase
        .from("shelter_animal_evaluations" as any)
        .select("animal_id")
        .eq("coach_user_id", user!.id)
        .in("animal_id", animalIds);
      const counts: Record<string, number> = {};
      (data as any[])?.forEach((e: any) => {
        counts[e.animal_id] = (counts[e.animal_id] || 0) + 1;
      });
      return counts;
    },
    enabled: animals.length > 0 && !!user,
  });

  const filtered = animals.filter((a: any) =>
    !search ||
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.breed || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <CoachLayout>
      <div className="p-4 pb-24 space-y-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Animaux des refuges
          </h1>
          <p className="text-sm text-muted-foreground mb-4">
            Évaluations pré-adoption pour vos refuges partenaires
          </p>

          {shelterIds.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center space-y-2">
                <Building2 className="h-10 w-10 mx-auto text-muted-foreground/50" />
                <p className="text-muted-foreground text-sm">
                  Vous n'êtes associé à aucun refuge
                </p>
                <p className="text-xs text-muted-foreground">
                  Contactez un refuge partenaire pour être ajouté
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex gap-2 mb-3">
                {shelterProfiles.map((sp: any) => (
                  <Badge key={sp.id} variant="secondary" className="text-xs">
                    {sp.name}
                  </Badge>
                ))}
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un animal..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Chargement...</div>
              ) : filtered.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">Aucun animal trouvé</p>
              ) : (
                <div className="space-y-2">
                  {filtered.map((animal: any) => {
                    const shelter = shelterProfiles.find((sp: any) => sp.user_id === animal.user_id);
                    const hasEval = (evalCounts as Record<string, number>)[animal.id] > 0;
                    return (
                      <Card
                        key={animal.id}
                        className="cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => navigate(`/coach/shelter-animal/${animal.id}`)}
                      >
                        <CardContent className="p-3 flex items-center gap-3">
                          {animal.photo_url ? (
                            <img
                              src={animal.photo_url}
                              alt={animal.name}
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                              <PawPrint className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm text-foreground truncate">{animal.name}</p>
                              {hasEval && (
                                <ClipboardCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {animal.breed || animal.species} • {shelter?.name || "Refuge"}
                            </p>
                          </div>
                          <Badge className={`text-[10px] shrink-0 ${statusColors[animal.status] || "bg-muted text-muted-foreground"}`}>
                            {animal.status}
                          </Badge>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </CoachLayout>
  );
}
