import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShelterLayout } from "@/components/ShelterLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PawPrint, Plus, Clock, Heart, Stethoscope, Home } from "lucide-react";
import { motion } from "framer-motion";

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  "arrivée": { label: "Arrivées", icon: Clock, color: "text-blue-400" },
  "quarantaine": { label: "Quarantaine", icon: Stethoscope, color: "text-amber-400" },
  "soins": { label: "En soins", icon: Stethoscope, color: "text-orange-400" },
  "adoptable": { label: "Adoptables", icon: Heart, color: "text-emerald-400" },
  "adopté": { label: "Adoptés", icon: Home, color: "text-primary" },
};

export default function ShelterDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: animals = [] } = useQuery({
    queryKey: ["shelter-animals", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("shelter_animals" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data as any[]) || [];
    },
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ["shelter-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("shelter_profiles" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as any;
    },
    enabled: !!user,
  });

  const activeAnimals = animals.filter((a: any) => !["adopté", "décédé", "transféré"].includes(a.status));
  const statusCounts = activeAnimals.reduce((acc: Record<string, number>, a: any) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  const speciesCounts = activeAnimals.reduce((acc: Record<string, number>, a: any) => {
    acc[a.species] = (acc[a.species] || 0) + 1;
    return acc;
  }, {});

  const recentArrivals = animals.filter((a: any) => a.status === "arrivée").slice(0, 5);

  return (
    <ShelterLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pt-14 pb-8 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <PawPrint className="h-5 w-5 text-primary" />
            {profile?.name || "Mon Refuge"}
          </h1>
          <p className="text-xs text-muted-foreground">{activeAnimals.length} animaux actuellement hébergés</p>
        </div>

        {/* Stats par statut */}
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(statusConfig).filter(([key]) => key !== "adopté").map(([key, cfg]) => (
            <Card key={key}>
              <CardContent className="p-3 text-center">
                <cfg.icon className={`h-5 w-5 mx-auto mb-1 ${cfg.color}`} />
                <p className="text-lg font-bold text-foreground">{statusCounts[key] || 0}</p>
                <p className="text-[9px] text-muted-foreground">{cfg.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats par espèce */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-foreground mb-2">Par espèce</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(speciesCounts).map(([species, count]) => (
                <div key={species} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {species} — {count as number}
                </div>
              ))}
              {Object.keys(speciesCounts).length === 0 && (
                <p className="text-xs text-muted-foreground">Aucun animal enregistré</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Arrivées récentes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-foreground">Arrivées récentes</p>
            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => navigate("/shelter/animals")}>
              Voir tout
            </Button>
          </div>
          {recentArrivals.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucune arrivée récente.</p>
          ) : (
            <div className="space-y-2">
              {recentArrivals.map((animal: any) => (
                <Card key={animal.id} className="cursor-pointer card-press" onClick={() => navigate(`/shelter/animals/${animal.id}`)}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
                      {animal.species === "chat" ? "🐱" : animal.species === "chien" ? "🐕" : animal.species === "reptile" ? "🦎" : animal.species === "oiseau" ? "🐦" : "🐾"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{animal.name}</p>
                      <p className="text-[10px] text-muted-foreground">{animal.species} — {animal.breed || "Race inconnue"} — Arrivé le {new Date(animal.arrival_date).toLocaleDateString("fr-FR")}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Adoptions */}
        <Card>
          <CardContent className="p-4 text-center">
            <Heart className="h-6 w-6 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{animals.filter((a: any) => a.status === "adopté").length}</p>
            <p className="text-xs text-muted-foreground">Adoptions réalisées</p>
          </CardContent>
        </Card>

        <Button className="w-full gap-2" onClick={() => navigate("/shelter/animals?new=1")}>
          <Plus className="h-4 w-4" /> Enregistrer un nouvel animal
        </Button>
      </motion.div>
    </ShelterLayout>
  );
}
