import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShelterLayout } from "@/components/ShelterLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PawPrint, Plus, Clock, Heart, Stethoscope, Home, MessageSquare, Mail, Users, GraduationCap, LayoutGrid } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  "arrivée": { label: "Arrivées", icon: Clock, color: "text-blue-400" },
  "quarantaine": { label: "Quarantaine", icon: Stethoscope, color: "text-amber-400" },
  "soins": { label: "En soins", icon: Stethoscope, color: "text-orange-400" },
  "adoptable": { label: "Adoptables", icon: Heart, color: "text-emerald-400" },
  "adopté": { label: "Adoptés", icon: Home, color: "text-primary" },
};

interface ShelterAnimalRow {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  status: string;
  arrival_date: string;
  created_at: string;
}

interface ShelterProfileRow {
  name: string;
}

interface AdoptionUpdateRow {
  id: string;
  animal_id: string;
  message: string | null;
  created_at: string;
}

export default function ShelterDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: animals = [] } = useQuery({
    queryKey: ["shelter-animals", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("shelter_animals")
        .select("id, name, species, breed, status, arrival_date, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as ShelterAnimalRow[];
    },
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ["shelter-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("shelter_profiles")
        .select("name")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as ShelterProfileRow | null;
    },
    enabled: !!user,
  });

  // Adoption updates
  const { data: adoptionUpdates = [] } = useQuery({
    queryKey: ["adoption-updates", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("adoption_updates")
        .select("id, animal_id, message, created_at")
        .eq("shelter_user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return (data ?? []) as AdoptionUpdateRow[];
    },
    enabled: !!user,
  });

  // Unread messages count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["shelter-unread-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", user!.id)
        .eq("read", false);
      return count || 0;
    },
    enabled: !!user,
  });

  const activeAnimals = animals.filter(a => !["adopté", "décédé", "transféré"].includes(a.status));
  const statusCounts = activeAnimals.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  const speciesCounts = activeAnimals.reduce<Record<string, number>>((acc, a) => {
    acc[a.species] = (acc[a.species] || 0) + 1;
    return acc;
  }, {});

  const recentArrivals = animals.filter(a => a.status === "arrivée").slice(0, 5);

  return (
    <ShelterLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pb-8 space-y-4">
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

        {/* Messages shortcut */}
        {unreadCount > 0 && (
          <Card className="cursor-pointer card-press border-primary/30" onClick={() => navigate("/shelter/messages")}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{unreadCount} message{unreadCount > 1 ? "s" : ""} non lu{unreadCount > 1 ? "s" : ""}</p>
                <p className="text-[10px] text-muted-foreground">Cliquez pour voir vos messages</p>
              </div>
            </CardContent>
          </Card>
        )}

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
              {recentArrivals.map((animal) => (
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
            <p className="text-lg font-bold text-foreground">{animals.filter(a => a.status === "adopté").length}</p>
            <p className="text-xs text-muted-foreground">Adoptions réalisées</p>
          </CardContent>
        </Card>

        {/* Post-adoption news */}
        {adoptionUpdates.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" /> Nouvelles post-adoption
            </p>
            <div className="space-y-2">
              {adoptionUpdates.map((update) => {
                const animalData = animals.find(a => a.id === update.animal_id);
                return (
                  <Card key={update.id} className="cursor-pointer card-press" onClick={() => animalData && navigate(`/shelter/animals/${update.animal_id}`)}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-foreground">
                          {animalData?.name || "Animal"} — Adoptant
                        </p>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(update.created_at), "dd/MM/yyyy", { locale: fr })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{update.message}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick access — gestion équipe & coachs */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Mon équipe</div>
          <div className="grid grid-cols-2 gap-2">
            <Card className="cursor-pointer card-press border-primary/20 bg-primary/5" onClick={() => navigate("/shelter/employees")}>
              <CardContent className="p-3 flex flex-col items-start gap-1">
                <Users className="h-5 w-5 text-primary" />
                <p className="text-xs font-semibold text-foreground leading-tight">Employés, soigneurs & bénévoles</p>
                <p className="text-[10px] text-muted-foreground">Créer, gérer, réinitialiser un PIN</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer card-press border-accent/20 bg-accent/5" onClick={() => navigate("/shelter/coaches")}>
              <CardContent className="p-3 flex flex-col items-start gap-1">
                <GraduationCap className="h-5 w-5 text-accent" />
                <p className="text-xs font-semibold text-foreground leading-tight">Coachs partenaires</p>
                <p className="text-[10px] text-muted-foreground">Inviter & collaborer</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer card-press" onClick={() => navigate("/shelter/spaces")}>
              <CardContent className="p-3 flex flex-col items-start gap-1">
                <LayoutGrid className="h-5 w-5 text-foreground/70" />
                <p className="text-xs font-semibold text-foreground leading-tight">Espaces & enclos</p>
                <p className="text-[10px] text-muted-foreground">Plan 2D du refuge</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer card-press" onClick={() => navigate("/shelter/adoption-plans")}>
              <CardContent className="p-3 flex flex-col items-start gap-1">
                <Heart className="h-5 w-5 text-rose-400" />
                <p className="text-xs font-semibold text-foreground leading-tight">Plans post-adoption</p>
                <p className="text-[10px] text-muted-foreground">Suivi adoptants</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Button className="w-full gap-2" onClick={() => navigate("/shelter/animals?new=1")}>
          <Plus className="h-4 w-4" /> Enregistrer un nouvel animal
        </Button>
      </motion.div>
    </ShelterLayout>
  );
}
